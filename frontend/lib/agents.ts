import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AgentStatus = "IDLE" | "RUNNING";
export type AgentRunStatus = "RUNNING" | "SUCCESS" | "FAILED" | "STOPPED";

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  instructions: string;
  model: string;
  tools: string[];
  maxSteps: number;
  memory: { key: string; value: string; savedAt: string }[];
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AgentStep {
  id: string;
  index: number;
  thought: string | null;
  action: string | null;
  actionInput: Record<string, unknown> | null;
  observation: string | null;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  task: string;
  status: AgentRunStatus;
  result: string | null;
  error: string | null;
  steps?: AgentStep[];
  startedAt: string;
  finishedAt: string | null;
}

export interface AgentToolInfo {
  name: string;
  description: string;
  inputSchema: string;
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  instructions: string;
  model?: string;
  tools?: string[];
  maxSteps?: number;
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

async function handle(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function listAgentTools(): Promise<AgentToolInfo[]> {
  const res = await fetch(`${API_URL}/api/agents/tools`, { headers: authHeaders() });
  const data = await handle(res);
  return data.tools;
}

export async function listAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_URL}/api/agents`, { headers: authHeaders() });
  const data = await handle(res);
  return data.agents;
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  const res = await fetch(`${API_URL}/api/agents`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await handle(res);
  return data.agent;
}

export async function getAgent(id: string): Promise<Agent> {
  const res = await fetch(`${API_URL}/api/agents/${id}`, { headers: authHeaders() });
  const data = await handle(res);
  return data.agent;
}

export async function updateAgent(id: string, input: Partial<CreateAgentInput>): Promise<Agent> {
  const res = await fetch(`${API_URL}/api/agents/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await handle(res);
  return data.agent;
}

export async function deleteAgent(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/agents/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete agent");
}

/** Runs synchronously on the backend — this resolves once the agent's whole run has finished. */
export async function runAgent(id: string, task: string): Promise<AgentRun> {
  const res = await fetch(`${API_URL}/api/agents/${id}/run`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ task }),
  });
  const data = await handle(res);
  return data.run;
}

export async function listAgentRuns(id: string): Promise<AgentRun[]> {
  const res = await fetch(`${API_URL}/api/agents/${id}/runs`, { headers: authHeaders() });
  const data = await handle(res);
  return data.runs;
}

export async function getAgentRun(id: string, runId: string): Promise<AgentRun> {
  const res = await fetch(`${API_URL}/api/agents/${id}/runs/${runId}`, { headers: authHeaders() });
  const data = await handle(res);
  return data.run;
}
