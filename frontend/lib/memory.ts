import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type MemoryType = "LONG_TERM" | "SHORT_TERM" | "PREFERENCE" | "FACT" | "SUMMARY";

export const MEMORY_TYPES: MemoryType[] = ["LONG_TERM", "SHORT_TERM", "PREFERENCE", "FACT", "SUMMARY"];

export interface Memory {
  id: string;
  type: MemoryType;
  category: string | null;
  key: string | null;
  content: string;
  tags: string[];
  importance: number;
  source: string | null;
  metadata: Record<string, unknown> | null;
  pinned: boolean;
  expiresAt: string | null;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListMemoriesResult {
  memories: Memory[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListMemoriesFilters {
  type?: MemoryType;
  category?: string;
  tag?: string;
  pinned?: boolean;
  source?: string;
  includeExpired?: boolean;
  page?: number;
  pageSize?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface CreateMemoryInput {
  type: MemoryType;
  category?: string;
  key?: string;
  content: string;
  tags?: string[];
  importance?: number;
  source?: string;
  pinned?: boolean;
}

export type UpdateMemoryInput = Partial<CreateMemoryInput>;

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

async function handle(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function listMemories(filters: ListMemoriesFilters = {}): Promise<ListMemoriesResult> {
  const res = await fetch(`${API_URL}/api/memory${buildQuery(filters)}`, { headers: authHeaders() });
  return handle(res);
}

export async function searchMemories(
  q: string,
  filters: ListMemoriesFilters = {}
): Promise<ListMemoriesResult> {
  const res = await fetch(`${API_URL}/api/memory/search${buildQuery({ ...filters, q })}`, {
    headers: authHeaders(),
  });
  return handle(res);
}

export async function listMemoryCategories(): Promise<string[]> {
  const res = await fetch(`${API_URL}/api/memory/categories`, { headers: authHeaders() });
  const data = await handle(res);
  return data.categories;
}

export async function listMemoryTags(): Promise<string[]> {
  const res = await fetch(`${API_URL}/api/memory/tags`, { headers: authHeaders() });
  const data = await handle(res);
  return data.tags;
}

export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
  const res = await fetch(`${API_URL}/api/memory`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await handle(res);
  return data.memory;
}

export async function getMemory(id: string): Promise<Memory> {
  const res = await fetch(`${API_URL}/api/memory/${id}`, { headers: authHeaders() });
  const data = await handle(res);
  return data.memory;
}

export async function updateMemory(id: string, input: UpdateMemoryInput): Promise<Memory> {
  const res = await fetch(`${API_URL}/api/memory/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await handle(res);
  return data.memory;
}

export async function deleteMemory(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/memory/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete memory");
}

/** Toggle a memory's pinned state — thin wrapper over updateMemory for UI convenience. */
export async function setMemoryPinned(id: string, pinned: boolean): Promise<Memory> {
  return updateMemory(id, { pinned });
}
