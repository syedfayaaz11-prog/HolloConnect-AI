import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AutomationType = "SCHEDULED" | "ONE_TIME" | "TRIGGER";
export type AutomationStatus = "ACTIVE" | "PAUSED" | "COMPLETED";
export type RunStatus = "RUNNING" | "SUCCESS" | "FAILED";

export interface Automation {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  model: string;
  type: AutomationType;
  status: AutomationStatus;
  cronExpression: string | null;
  runAt: string | null;
  webhookToken: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
}

export interface AutomationRun {
  id: string;
  status: RunStatus;
  output: string | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface CreateAutomationInput {
  name: string;
  description?: string;
  prompt: string;
  model?: string;
  type: AutomationType;
  cronExpression?: string;
  runAt?: string;
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

async function handle(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function listAutomations(): Promise<Automation[]> {
  const res = await fetch(`${API_URL}/api/automations`, { headers: authHeaders() });
  const data = await handle(res);
  return data.automations;
}

export async function createAutomation(input: CreateAutomationInput): Promise<Automation> {
  const res = await fetch(`${API_URL}/api/automations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await handle(res);
  return data.automation;
}

export async function getAutomation(id: string): Promise<Automation> {
  const res = await fetch(`${API_URL}/api/automations/${id}`, { headers: authHeaders() });
  const data = await handle(res);
  return data.automation;
}

export async function updateAutomation(
  id: string,
  input: Partial<CreateAutomationInput & { status: AutomationStatus }>
): Promise<Automation> {
  const res = await fetch(`${API_URL}/api/automations/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await handle(res);
  return data.automation;
}

export async function deleteAutomation(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/automations/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete automation");
}

export async function listAutomationRuns(id: string): Promise<AutomationRun[]> {
  const res = await fetch(`${API_URL}/api/automations/${id}/runs`, { headers: authHeaders() });
  const data = await handle(res);
  return data.runs;
}

export async function runAutomationNow(id: string): Promise<AutomationRun> {
  const res = await fetch(`${API_URL}/api/automations/${id}/run-now`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await handle(res);
  return data.run;
}

export function webhookUrl(token: string): string {
  return `${API_URL}/api/automations/webhook/${token}`;
}
