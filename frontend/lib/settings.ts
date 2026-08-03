import { getToken, clearToken, AuthUser } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

async function handle(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export interface ProfileUpdate {
  name?: string;
  reducedMotion?: boolean;
  memoryEnabled?: boolean;
  defaultModel?: string;
}

/** PATCH /api/auth/me — real, persisted updates for Appearance and Memory (and name). */
export async function updateProfile(patch: ProfileUpdate): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  const data = await handle(res);
  return data.user as AuthUser;
}

/**
 * DELETE /api/auth/me — permanently deletes the account and everything owned by it (every
 * relation cascades in schema.prisma). Clears the local token on success since the account
 * genuinely no longer exists to authenticate against.
 */
export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to delete account");
  }
  clearToken();
}
