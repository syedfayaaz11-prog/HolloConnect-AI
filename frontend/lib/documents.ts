import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type DocumentStatus = "PROCESSING" | "READY" | "FAILED";

export interface DocumentSummaryItem {
  id: string;
  filename: string;
  mimeType: string;
  status: DocumentStatus;
  error: string | null;
  createdAt: string;
}

export interface DocumentRecord extends DocumentSummaryItem {
  fileUrl?: string;
  extractedText: string | null;
  summary: string | null;
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

async function handle(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function uploadDocument(file: File): Promise<DocumentRecord> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/documents`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const data = await handle(res);
  return data.document;
}

export async function listDocuments(): Promise<DocumentSummaryItem[]> {
  const res = await fetch(`${API_URL}/api/documents`, { headers: authHeaders() });
  const data = await handle(res);
  return data.documents;
}

export async function getDocument(id: string): Promise<DocumentRecord> {
  const res = await fetch(`${API_URL}/api/documents/${id}`, { headers: authHeaders() });
  const data = await handle(res);
  return data.document;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/documents/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

export async function summarizeDocument(id: string): Promise<DocumentRecord> {
  const res = await fetch(`${API_URL}/api/documents/${id}/summarize`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await handle(res);
  return data.document;
}

export async function askDocument(id: string, question: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/documents/${id}/ask`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  const data = await handle(res);
  return data.answer;
}

export async function translateDocument(id: string, targetLanguage: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/documents/${id}/translate`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ targetLanguage }),
  });
  const data = await handle(res);
  return data.translated;
}
