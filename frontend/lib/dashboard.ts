import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface DashboardSummary {
  totalChats: number;
  totalMessages: number;
  messagesThisWeek: number;
  recentChats: { id: string; title: string; model: string; updatedAt: string }[];
  modelUsage: { model: string; count: number }[];
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${API_URL}/api/dashboard/summary`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to load dashboard summary");
  return res.json();
}
