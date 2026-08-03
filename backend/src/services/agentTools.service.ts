/**
 * Tool registry for AI Agents.
 *
 * Each tool is a thin, user-scoped wrapper around an existing service — agents
 * don't get any capability that isn't already exposed elsewhere in the app.
 * Add a new tool by adding an entry to AGENT_TOOLS; the orchestration loop in
 * agent.service.ts only knows about this shared shape, the same
 * swap-a-case/add-a-case pattern used in ai.service.ts and websearch.service.ts.
 */

import { prisma } from "../config/db";
import { fetchWebResults } from "./websearch.service";
import { executeAutomation } from "./automationEngine.service";
import { getCompletion } from "./ai.service";
import { resolveUserModel } from "../utils/resolveUserModel";
import * as memoryService from "./memory.service";

// Keeps tool observations bounded so they don't blow up the next step's prompt.
const OBSERVATION_CHAR_LIMIT = 4_000;
const DOCUMENT_CONTEXT_CHAR_LIMIT = 8_000;

export interface AgentToolDefinition {
  name: string;
  description: string;
  /** Human-readable shape of the expected `actionInput`, shown to the agent and the UI. */
  inputSchema: string;
  /** Runs the tool for a given user, returning a string observation fed back to the agent. */
  execute: (userId: string, input: Record<string, unknown>, agentId: string) => Promise<string>;
}

async function webSearchTool(_userId: string, input: Record<string, unknown>): Promise<string> {
  const query = String(input.query ?? "").trim();
  if (!query) return "Error: 'query' is required.";

  const results = await fetchWebResults(query, 5);
  if (results.length === 0) return "No web results found for that query.";

  return results
    .map((r, i) => `${i + 1}. ${r.title} (${r.url})\n${r.snippet}`)
    .join("\n\n")
    .slice(0, OBSERVATION_CHAR_LIMIT);
}

async function listDocumentsTool(userId: string): Promise<string> {
  const documents = await prisma.document.findMany({
    where: { userId, status: "READY" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, filename: true },
  });

  if (documents.length === 0) return "This user has no processed documents available.";
  return documents.map((d) => `${d.id} — ${d.filename}`).join("\n");
}

async function documentQaTool(userId: string, input: Record<string, unknown>): Promise<string> {
  const documentId = String(input.documentId ?? "").trim();
  const question = String(input.question ?? "").trim();
  if (!documentId || !question) return "Error: 'documentId' and 'question' are both required.";

  const document = await prisma.document.findFirst({ where: { id: documentId, userId } });
  if (!document) return `Error: no document found with id ${documentId}. Use list_documents first.`;
  if (document.status !== "READY" || !document.extractedText) {
    return `Error: document "${document.filename}" is not ready (status: ${document.status}).`;
  }

  // Reuses ai.service.ts's getCompletion the same way document.controller.ts's askDocument does,
  // resolved through the same centralized resolveUserModel() helper other controllers use.
  const model = await resolveUserModel(userId);
  const answer = await getCompletion(model, [
    {
      role: "system",
      content:
        "Answer the question using ONLY the document content provided. If the answer isn't " +
        "in the document, say so plainly rather than guessing.",
    },
    {
      role: "user",
      content: `Document "${document.filename}":\n\n${document.extractedText.slice(
        0,
        DOCUMENT_CONTEXT_CHAR_LIMIT
      )}\n\nQuestion: ${question}`,
    },
  ]);

  return answer.slice(0, OBSERVATION_CHAR_LIMIT);
}

async function runAutomationTool(userId: string, input: Record<string, unknown>): Promise<string> {
  const automationId = String(input.automationId ?? "").trim();
  if (!automationId) return "Error: 'automationId' is required.";

  const automation = await prisma.automation.findFirst({ where: { id: automationId, userId } });
  if (!automation) return `Error: no automation found with id ${automationId}.`;

  // Same executeAutomation() every other trigger source calls (scheduler tick, manual
  // "run now", public webhook) — keeps run history/logs consistent regardless of caller.
  await executeAutomation(automation);

  const latestRun = await prisma.automationRun.findFirst({
    where: { automationId: automation.id },
    orderBy: { startedAt: "desc" },
  });

  if (!latestRun) return "Automation ran but no run record was found.";
  if (latestRun.status === "FAILED") return `Automation failed: ${latestRun.error ?? "unknown error"}`;
  return (latestRun.output ?? "Automation completed with no output.").slice(0, OBSERVATION_CHAR_LIMIT);
}

async function listAutomationsTool(userId: string): Promise<string> {
  const automations = await prisma.automation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, name: true, type: true, status: true },
  });

  if (automations.length === 0) return "This user has no automations available.";
  return automations.map((a) => `${a.id} — ${a.name} (${a.type}, ${a.status})`).join("\n");
}

async function recallPastChatsTool(userId: string, input: Record<string, unknown>): Promise<string> {
  const query = String(input.query ?? "").trim();
  if (!query) return "Error: 'query' is required.";

  // Lightweight text search over the user's chat history — no vector store/embeddings in
  // this codebase yet, so this is a plain case-insensitive substring match on message
  // content, scoped to this user's chats only. Good enough for "did we discuss X before"
  // style recall; upgrade to embeddings-based search if/when a real Memory module lands.
  const messages = await prisma.message.findMany({
    where: {
      chat: { userId },
      content: { contains: query, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { role: true, content: true, createdAt: true, chat: { select: { title: true } } },
  });

  if (messages.length === 0) return `No past chat messages found mentioning "${query}".`;

  return messages
    .map(
      (m) =>
        `[${m.chat.title}, ${m.createdAt.toISOString().slice(0, 10)}, ${m.role}]: ${m.content.slice(0, 300)}`
    )
    .join("\n\n")
    .slice(0, OBSERVATION_CHAR_LIMIT);
}

/**
 * recall_memory / save_memory: previously read/wrote a small JSON array on the Agent row
 * itself (`Agent.memory`), a temporary store built before the shared Memory module (15)
 * existed. Now backed entirely by memory.service.ts, scoped to this agent via
 * `source: "agent:<agentId>"` — same shared table Chat and Automation write to, searchable/
 * editable from the Memory browser UI, with real importance/pinning/expiry, not a JSON blob.
 */
async function recallMemoryTool(userId: string, input: Record<string, unknown>, agentId: string): Promise<string> {
  const key = input.key ? String(input.key).trim() : "";
  const source = `agent:${agentId}`;

  const result = key
    ? await memoryService.searchMemories(userId, key, { source, pageSize: 20 })
    : await memoryService.listMemories(userId, { source, pageSize: 20 });

  if (result.memories.length === 0) {
    return key ? `No saved memory matching "${key}".` : "This agent has no saved memories yet.";
  }

  return result.memories
    .map((m) => `${m.key ? `${m.key}: ` : ""}${m.content} (saved ${m.createdAt.toISOString().slice(0, 10)})`)
    .join("\n")
    .slice(0, OBSERVATION_CHAR_LIMIT);
}

async function saveMemoryTool(userId: string, input: Record<string, unknown>, agentId: string): Promise<string> {
  const value = String(input.value ?? "").trim();
  if (!value) return "Error: 'value' is required.";
  const key = input.key ? String(input.key).trim() : undefined;

  await memoryService.createMemory(userId, {
    type: "FACT",
    content: value,
    key,
    source: `agent:${agentId}`,
    tags: ["agent"],
  });

  return `Saved: ${key ? `${key} = ${value}` : value}`;
}

export const AGENT_TOOLS: Record<string, AgentToolDefinition> = {
  web_search: {
    name: "web_search",
    description: "Search the live web for current information. Use for anything you don't already know.",
    inputSchema: '{ "query": string }',
    execute: webSearchTool,
  },
  list_documents: {
    name: "list_documents",
    description: "List the user's uploaded, processed documents (id + filename).",
    inputSchema: "{}",
    execute: (userId) => listDocumentsTool(userId),
  },
  document_qa: {
    name: "document_qa",
    description: "Ask a question about one specific uploaded document, by its id (use list_documents to find one).",
    inputSchema: '{ "documentId": string, "question": string }',
    execute: documentQaTool,
  },
  list_automations: {
    name: "list_automations",
    description: "List the user's configured automations (id, name, type, status).",
    inputSchema: "{}",
    execute: (userId) => listAutomationsTool(userId),
  },
  run_automation: {
    name: "run_automation",
    description: "Run one of the user's existing automations immediately and return its output.",
    inputSchema: '{ "automationId": string }',
    execute: runAutomationTool,
  },
  recall_past_chats: {
    name: "recall_past_chats",
    description: "Search the user's past chat conversations for messages mentioning a topic.",
    inputSchema: '{ "query": string }',
    execute: recallPastChatsTool,
  },
  recall_memory: {
    name: "recall_memory",
    description:
      "Search this agent's saved memories (facts, preferences) via the platform's shared Memory system. Omit 'key' to see recent memories.",
    inputSchema: '{ "key"?: string }',
    execute: recallMemoryTool,
  },
  save_memory: {
    name: "save_memory",
    description:
      "Save a fact for this agent to remember across future runs, via the platform's shared Memory system (searchable/editable from the Memory page).",
    inputSchema: '{ "value": string, "key"?: string }',
    execute: saveMemoryTool,
  },
};

export function describeToolsForPrompt(toolNames: string[]): string {
  return toolNames
    .filter((name) => AGENT_TOOLS[name])
    .map((name) => {
      const tool = AGENT_TOOLS[name];
      return `- ${tool.name}: ${tool.description}\n  input: ${tool.inputSchema}`;
    })
    .join("\n");
}
