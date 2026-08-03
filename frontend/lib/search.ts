import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface SearchSource {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchRecord {
  id: string;
  query: string;
  answer: string;
  sources: SearchSource[];
  followUps: string[];
  model: string;
  createdAt: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  model: string;
  createdAt: string;
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

async function handle(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function runSearch(query: string, model?: string): Promise<SearchRecord> {
  const res = await fetch(`${API_URL}/api/search`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ query, model }),
  });
  const data = await handle(res);
  return data.search;
}

export async function listSearchHistory(): Promise<SearchHistoryItem[]> {
  const res = await fetch(`${API_URL}/api/search`, { headers: authHeaders() });
  const data = await handle(res);
  return data.searches;
}

export async function getSearch(id: string): Promise<SearchRecord> {
  const res = await fetch(`${API_URL}/api/search/${id}`, { headers: authHeaders() });
  const data = await handle(res);
  return data.search;
}

export async function deleteSearch(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/search/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete search");
}
