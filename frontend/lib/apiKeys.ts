import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function authHeaders(json = true) {
  const headers: Record<string, string> = { Authorization: `Bearer ${getToken()}` };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function handle(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export type ApiKeyProvider =
  | "OPENAI"
  | "ANTHROPIC"
  | "GEMINI"
  | "OLLAMA"
  | "DEEPSEEK"
  | "MISTRAL"
  | "XAI"
  | "OPENAI_COMPATIBLE";
export type ApiKeyStatus = "UNTESTED" | "VALID" | "INVALID";

export interface ApiKey {
  id: string;
  provider: ApiKeyProvider;
  label: string;
  baseUrl: string | null;
  defaultModel: string | null;
  keyPreview: string | null;
  isDefault: boolean;
  status: ApiKeyStatus;
  lastTestedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyInput {
  provider: ApiKeyProvider;
  label: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  isDefault?: boolean;
}

export interface UpdateApiKeyInput {
  label?: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  isDefault?: boolean;
}

/** GET /api/api-keys — every provider key the current user has stored (never includes the
    actual secret — only a masked preview, see backend's apiKeys.controller.ts SAFE_SELECT). */
export async function listApiKeys(): Promise<ApiKey[]> {
  const res = await fetch(`${API_URL}/api/api-keys`, { headers: authHeaders(false) });
  const data = await handle(res);
  return data.keys;
}

export async function createApiKey(input: CreateApiKeyInput): Promise<ApiKey> {
  const res = await fetch(`${API_URL}/api/api-keys`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await handle(res);
  return data.key;
}

export async function updateApiKey(id: string, input: UpdateApiKeyInput): Promise<ApiKey> {
  const res = await fetch(`${API_URL}/api/api-keys/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await handle(res);
  return data.key;
}

export async function deleteApiKey(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/api-keys/${id}`, { method: "DELETE", headers: authHeaders(false) });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to delete API key");
  }
}

export interface TestApiKeyResult {
  key: ApiKey;
  result: { ok: boolean; error?: string };
}

/** POST /api/api-keys/:id/test — makes a real (lightweight) request to the provider to
    confirm the stored key actually works, and persists the result (status/lastError) so the
    Settings UI's badge reflects a real check, not just "the form submitted successfully". */
export async function testApiKey(id: string): Promise<TestApiKeyResult> {
  const res = await fetch(`${API_URL}/api/api-keys/${id}/test`, { method: "POST", headers: authHeaders(false) });
  return handle(res);
}
