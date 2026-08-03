import { getToken } from "./auth";
import { ChatMessage, ChatSummary } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

async function handle(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

/** GET /api/chat — already existed on the backend, just never called from the frontend. */
export async function listChatHistory(): Promise<ChatSummary[]> {
  const res = await fetch(`${API_URL}/api/chat`, { headers: authHeaders() });
  const data = await handle(res);
  return data.chats;
}

export interface ChatDetail {
  id: string;
  title: string;
  model: string;
  pinned: boolean;
  messages: ChatMessage[];
}

/** GET /api/chat/:id — loads a past conversation's full message history. */
export async function getChatDetail(id: string): Promise<ChatDetail> {
  const res = await fetch(`${API_URL}/api/chat/${id}`, { headers: authHeaders() });
  const data = await handle(res);
  return {
    ...data.chat,
    messages: data.chat.messages.map((m: { id: string; role: string; content: string; model?: string; createdAt: string }) => ({
      id: m.id,
      role: m.role.toLowerCase() as ChatMessage["role"],
      content: m.content,
      model: m.model,
      createdAt: m.createdAt,
    })),
  };
}

/** DELETE /api/chat/:id — already existed, just never called from the frontend. */
export async function deleteChatHistory(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/chat/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete conversation");
}

/** PATCH /api/chat/:id — { title }. Backs the sidebar's Rename action; persists server-side
    (previous rename UI, before this, only ever changed a client-local override that reset on
    reload — this is now a real, durable rename). */
export async function renameChatHistory(id: string, title: string): Promise<ChatSummary> {
  const res = await fetch(`${API_URL}/api/chat/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const data = await handle(res);
  return data.chat;
}
