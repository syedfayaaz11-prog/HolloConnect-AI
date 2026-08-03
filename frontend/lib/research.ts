import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ResearchSection {
  heading: string;
  content: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
}

export interface TimelineStep {
  step: string;
  description: string;
  timestamp: string;
}

export type ResearchStatus = "PENDING" | "RUNNING" | "COMPLETE" | "FAILED";

export interface ResearchReport {
  id: string;
  topic: string;
  status: ResearchStatus;
  sections: ResearchSection[] | null;
  sources: ResearchSource[] | null;
  timeline: TimelineStep[] | null;
  followUps: string[] | null;
  model: string;
  error: string | null;
  createdAt: string;
}

export interface ResearchHistoryItem {
  id: string;
  topic: string;
  status: ResearchStatus;
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

export async function runResearch(topic: string, model?: string): Promise<ResearchReport> {
  const res = await fetch(`${API_URL}/api/research`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ topic, model }),
  });
  const data = await handle(res);
  return data.report;
}

export async function listResearchHistory(): Promise<ResearchHistoryItem[]> {
  const res = await fetch(`${API_URL}/api/research`, { headers: authHeaders() });
  const data = await handle(res);
  return data.reports;
}

export async function getResearch(id: string): Promise<ResearchReport> {
  const res = await fetch(`${API_URL}/api/research/${id}`, { headers: authHeaders() });
  const data = await handle(res);
  return data.report;
}

export function researchPdfUrl(id: string): string {
  return `${API_URL}/api/research/${id}/pdf`;
}

export async function downloadResearchPdf(id: string, filename: string) {
  const res = await fetch(researchPdfUrl(id), { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to export PDF");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
