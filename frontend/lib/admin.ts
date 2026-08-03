import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
  defaultModel: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail extends AdminUser {
  _count: {
    chats: number;
    projects: number;
    documents: number;
    generatedImages: number;
    videoGenerations: number;
    automations: number;
    agents: number;
    memories: number;
    searchQueries: number;
    researchReports: number;
  };
}

export interface PaginatedUsers {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListUsersFilters {
  query?: string;
  role?: "USER" | "ADMIN";
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  // Lets this interface satisfy buildQuery's Record<string, ...> parameter type without a
  // cast at every call site — every field above already conforms to this value shape, so
  // this doesn't loosen what's actually allowed to be set on the object.
  [key: string]: string | number | boolean | undefined;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  newUsersThisWeek: number;
  totalChats: number;
  totalMessages: number;
  totalAutomations: number;
  totalAgents: number;
  totalDocuments: number;
  totalOcrRequests: number;
  activeAgents: number;
  memoryStats: { total: number; byType: { type: string; count: number }[] };
}

export interface PlatformHealth {
  status: "healthy" | "degraded";
  database: { ok: boolean; error?: string };
  automationScheduler: { running: boolean; lastTickAt: string | null };
  process: {
    uptimeSeconds: number;
    nodeVersion: string;
    memoryUsedMb: number;
    memoryTotalMb: number;
    cpuUsagePercent: number | null;
    cpuCount: number;
  };
  checkedAt: string;
}

export interface AiUsageStats {
  chatsByModel: { model: string; count: number }[];
  messagesByModel: { model: string; count: number }[];
}

export interface ErrorLogEntry {
  id: string;
  message: string;
  stack: string | null;
  path: string | null;
  method: string | null;
  statusCode: number | null;
  userId: string | null;
  createdAt: string;
}

export interface PaginatedErrorLogs {
  logs: ErrorLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actor: { id: string; email: string; name: string | null };
  action: "USER_ENABLED" | "USER_DISABLED" | "USER_DELETED" | "USER_ROLE_CHANGED";
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

async function handle(res: Response) {
  if (res.status === 204) return null;
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

export async function listUsers(filters: ListUsersFilters = {}): Promise<PaginatedUsers> {
  const res = await fetch(`${API_URL}/api/admin/users${buildQuery(filters)}`, { headers: authHeaders() });
  return handle(res);
}

export async function getUserDetails(id: string): Promise<AdminUserDetail> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}`, { headers: authHeaders() });
  const data = await handle(res);
  return data.user;
}

export async function setUserActive(id: string, isActive: boolean): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ isActive }),
  });
  const data = await handle(res);
  return data.user;
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to delete user");
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_URL}/api/admin/stats`, { headers: authHeaders() });
  return handle(res);
}

export async function getPlatformHealth(): Promise<PlatformHealth> {
  const res = await fetch(`${API_URL}/api/admin/health`, { headers: authHeaders() });
  return handle(res);
}

export async function getAiUsageStats(): Promise<AiUsageStats> {
  const res = await fetch(`${API_URL}/api/admin/ai-usage`, { headers: authHeaders() });
  return handle(res);
}

export async function getErrorLogs(page = 1, pageSize = 25): Promise<PaginatedErrorLogs> {
  const res = await fetch(`${API_URL}/api/admin/errors${buildQuery({ page, pageSize })}`, {
    headers: authHeaders(),
  });
  return handle(res);
}

export async function getAuditLogs(page = 1, pageSize = 25): Promise<PaginatedAuditLogs> {
  const res = await fetch(`${API_URL}/api/admin/audit-logs${buildQuery({ page, pageSize })}`, {
    headers: authHeaders(),
  });
  return handle(res);
}

export async function updateUserRole(id: string, role: "USER" | "ADMIN"): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}/role`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  const data = await handle(res);
  return data.user;
}

// ---------------------------------------------------------------------------
// Admin Panel Part 3

export interface AdminMemory {
  id: string;
  type: "LONG_TERM" | "SHORT_TERM" | "PREFERENCE" | "FACT" | "SUMMARY";
  category: string | null;
  key: string | null;
  content: string;
  tags: string[];
  importance: number;
  source: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string };
}

export interface PaginatedAdminMemories {
  memories: AdminMemory[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminMemoryFilters {
  query?: string;
  type?: AdminMemory["type"];
  category?: string;
  tag?: string;
  pinned?: boolean;
  page?: number;
  pageSize?: number;
  [key: string]: string | number | boolean | undefined;
}

export async function listAllMemories(filters: AdminMemoryFilters = {}): Promise<PaginatedAdminMemories> {
  const res = await fetch(`${API_URL}/api/admin/memories${buildQuery(filters)}`, { headers: authHeaders() });
  return handle(res);
}

export async function updateAnyMemory(
  id: string,
  input: Partial<Pick<AdminMemory, "content" | "tags" | "pinned">>
): Promise<AdminMemory> {
  const res = await fetch(`${API_URL}/api/admin/memories/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await handle(res);
  return data.memory;
}

export async function deleteAnyMemory(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/memories/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete memory");
}

export interface AdminAgent {
  id: string;
  name: string;
  description: string | null;
  model: string;
  enabled: boolean;
  status: "IDLE" | "RUNNING";
  tools: string[];
  maxSteps: number;
  createdAt: string;
  user: { id: string; email: string };
  _count: { runs: number };
}

export interface PaginatedAdminAgents {
  agents: AdminAgent[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listAllAgents(query?: string, page = 1, pageSize = 25): Promise<PaginatedAdminAgents> {
  const res = await fetch(`${API_URL}/api/admin/agents${buildQuery({ query, page, pageSize })}`, {
    headers: authHeaders(),
  });
  return handle(res);
}

export async function setAgentEnabled(id: string, enabled: boolean): Promise<AdminAgent> {
  const res = await fetch(`${API_URL}/api/admin/agents/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ enabled }),
  });
  const data = await handle(res);
  return data.agent;
}

export interface AdminConversation {
  id: string;
  title: string;
  model: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string };
  _count: { messages: number };
}

export interface PaginatedAdminConversations {
  chats: AdminConversation[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listAllConversations(
  query?: string,
  page = 1,
  pageSize = 25
): Promise<PaginatedAdminConversations> {
  const res = await fetch(`${API_URL}/api/admin/conversations${buildQuery({ query, page, pageSize })}`, {
    headers: authHeaders(),
  });
  return handle(res);
}

export interface AdminDocument {
  id: string;
  filename: string;
  fileUrl: string;
  mimeType: string;
  status: "PROCESSING" | "READY" | "FAILED";
  error: string | null;
  createdAt: string;
  user: { id: string; email: string };
}

export interface PaginatedAdminDocuments {
  documents: AdminDocument[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listAllDocuments(
  filters: { query?: string; onlyOcr?: boolean; page?: number; pageSize?: number } = {}
): Promise<PaginatedAdminDocuments> {
  const res = await fetch(`${API_URL}/api/admin/documents${buildQuery(filters)}`, { headers: authHeaders() });
  return handle(res);
}

export async function deleteAnyDocument(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/documents/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete document");
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultModel: string;
  allowSignups: boolean;
  requireEmailVerification: boolean;
  maxUploadMb: number;
  sessionLengthDays: number;
  featureFlags: {
    deepResearch: boolean;
    agents: boolean;
    automation: boolean;
    voiceMode: boolean;
  };
  proPriceInr: number;
  ultraPriceInr: number;
}

export async function getSettings(): Promise<PlatformSettings> {
  const res = await fetch(`${API_URL}/api/admin/settings`, { headers: authHeaders() });
  const data = await handle(res);
  return data.settings;
}

export async function updateSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const res = await fetch(`${API_URL}/api/admin/settings`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  const data = await handle(res);
  return data.settings;
}
