/**
 * AI Agent orchestration.
 *
 * None of the wired providers (see ai.service.ts) expose a shared native
 * function-calling contract across OpenAI/Anthropic/Gemini/OpenAI-compatible
 * backends, so this uses a provider-agnostic ReAct-style loop instead: on each
 * step the model is asked to reply with a single JSON object (thought + either
 * an action to take or a final answer), we execute the requested tool, feed the
 * result back in as an observation, and repeat until the model returns a final
 * answer or the step budget runs out. This works with any model already wired
 * into ai.service.ts's getCompletion() with no provider-specific code here.
 *
 * Like Deep Research (module 6), a run executes synchronously inside one
 * request/function call — acceptable at this scale for the same reason
 * documented there, and bounded by MAX_STEPS_LIMIT so it can't run away.
 */

import { Agent, AgentRun, Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { getCompletion, ChatTurn } from "./ai.service";
import { AGENT_TOOLS, describeToolsForPrompt } from "./agentTools.service";
import { buildMemoryContextBlock, isMemoryEnabled, retrieveRelevantMemories } from "./memory.service";
import { friendlyProviderError } from "../utils/friendlyError";

// Hard ceiling regardless of what an individual agent's maxSteps is configured to, so a
// misconfigured or looping agent can't turn one request into an unbounded number of LLM calls.
const MAX_STEPS_LIMIT = 12;

interface AgentDecision {
  thought?: string;
  action?: string;
  actionInput?: Record<string, unknown>;
  finalAnswer?: string;
}

async function buildSystemPrompt(agent: Agent, task: string): Promise<string> {
  const toolNames = (agent.tools as string[]) ?? [];
  const toolDocs = describeToolsForPrompt(toolNames);

  // Same shared Memory service Chat and Automation use — an agent gets its own saved
  // memories (source="agent:<id>") plus the user's global preferences/facts as context,
  // on top of whatever it explicitly looks up mid-run via the recall_memory tool. Gated on
  // the user's Settings -> Memory toggle, same as Chat and Automation (the recall_memory/
  // save_memory tools themselves are unaffected — see isMemoryEnabled's doc comment).
  const memoryEnabled = await isMemoryEnabled(agent.userId);
  const relevant = memoryEnabled
    ? await retrieveRelevantMemories(agent.userId, task, {
        source: `agent:${agent.id}`,
        limit: 5,
      })
    : [];
  const memoryContext = buildMemoryContextBlock(relevant);

  return `You are "${agent.name}", an autonomous AI agent running inside HolloConnect AI.

Your standing instructions / goal:
${agent.instructions}
${memoryContext ? `\n${memoryContext}\n` : ""}
You solve the task given to you step by step. On EACH turn, respond with ONLY a single JSON
object (no markdown fences, no commentary outside the JSON) in one of these two shapes:

To use a tool:
{"thought": "brief reasoning about what to do next", "action": "<tool_name>", "actionInput": { ... }}

To finish:
{"thought": "brief reasoning", "finalAnswer": "the complete final answer for the user"}

Available tools:
${toolDocs || "(none enabled for this agent)"}

Rules:
- Use a tool only when it genuinely helps; if you already have enough information, finish immediately.
- Never invent tool names outside the list above.
- Keep "thought" short (one or two sentences).
- You have a limited number of steps — work efficiently, and if you're out of good options, give
  your best final answer rather than repeating a failed action.`;
}

function parseDecision(raw: string): AgentDecision {
  // Models occasionally wrap JSON in a code fence despite instructions — strip it defensively.
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // If the model didn't return valid JSON at all, treat its raw text as the final answer
    // rather than failing the whole run — better degraded output than a hard error.
    return { finalAnswer: raw.trim() };
  }
}

/**
 * Runs one agent task end-to-end: creates the AgentRun, loops think→act→observe recording
 * each AgentStep as it happens, and marks the run SUCCESS/FAILED when done. Returns the
 * finished run (with steps) so the caller can respond with the full trace immediately.
 */
export async function runAgent(agent: Agent, task: string): Promise<AgentRun> {
  const run = await prisma.agentRun.create({
    data: { agentId: agent.id, task, status: "RUNNING" },
  });

  await prisma.agent.update({ where: { id: agent.id }, data: { status: "RUNNING" } });

  const systemPrompt = await buildSystemPrompt(agent, task);
  const stepLimit = Math.min(agent.maxSteps || 6, MAX_STEPS_LIMIT);
  const transcript: ChatTurn[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Task: ${task}` },
  ];

  try {
    let finalAnswer: string | null = null;

    for (let i = 0; i < stepLimit; i++) {
      const raw = await getCompletion(agent.model, transcript);
      const decision = parseDecision(raw);

      if (decision.finalAnswer) {
        await prisma.agentStep.create({
          data: {
            runId: run.id,
            index: i,
            thought: decision.thought ?? null,
            action: "final_answer",
            actionInput: undefined,
            observation: null,
          },
        });
        finalAnswer = decision.finalAnswer;
        break;
      }

      const toolName = decision.action ?? "";
      const tool = AGENT_TOOLS[toolName];
      const actionInput = decision.actionInput ?? {};

      let observation: string;
      if (!tool) {
        observation = `Error: unknown tool "${toolName}". Available tools: ${Object.keys(AGENT_TOOLS).join(", ")}.`;
      } else if (!((agent.tools as string[]) ?? []).includes(toolName)) {
        observation = `Error: tool "${toolName}" is not enabled for this agent.`;
      } else {
        try {
          observation = await tool.execute(agent.userId, actionInput, agent.id);
        } catch (err) {
          observation = `Error running ${toolName}: ${(err as Error).message}`;
        }
      }

      await prisma.agentStep.create({
        data: {
          runId: run.id,
          index: i,
          thought: decision.thought ?? null,
          action: toolName || null,
          actionInput: actionInput as unknown as Prisma.InputJsonValue,
          observation,
        },
      });

      transcript.push({ role: "assistant", content: raw });
      transcript.push({ role: "user", content: `Observation: ${observation}` });
    }

    if (finalAnswer === null) {
      finalAnswer =
        "Reached the step limit before finishing. Here's the state so far — consider raising " +
        "this agent's max steps or narrowing the task: see the step trace above for partial findings.";
    }

    const finished = await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: "SUCCESS", result: finalAnswer, finishedAt: new Date() },
      include: { steps: { orderBy: { index: "asc" } } },
    });

    return finished;
  } catch (err) {
    return prisma.agentRun.update({
      where: { id: run.id },
      data: { status: "FAILED", error: friendlyProviderError(err, "agent.service"), finishedAt: new Date() },
      include: { steps: { orderBy: { index: "asc" } } },
    });
  } finally {
    await prisma.agent.update({ where: { id: agent.id }, data: { status: "IDLE" } });
  }
}
