const TOKEN_KEY = "hollo_token";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://holloconnect-ai-8xm8.onrender.com";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  invalidateSessionUser();
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role: "USER" | "ADMIN";
  // Populated by GET /api/auth/me (fetchMe below); register/login's response doesn't
  // include these, so they're optional here too rather than assumed always-present.
  reducedMotion?: boolean;
  memoryEnabled?: boolean;
  avatarUrl?: string | null;
  defaultModel?: string;
}

async function handle(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function register(email: string, password: string, name?: string) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await handle(res);
  setToken(data.token);
  return data.user as AuthUser;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handle(res);
  setToken(data.token);
  return data.user as AuthUser;
}

/** Sign in (or sign up / link) with Google. `credential` is the ID token JWT Google Identity
    Services hands the frontend directly in the browser — see components/auth/GoogleSignInButton.tsx. */
export async function googleLogin(credential: string) {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  const data = await handle(res);
  setToken(data.token);
  return data.user as AuthUser;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as AuthUser;
}

// ---- Session cache -------------------------------------------------------------------
// Every AI module page independently calls useRequireAuth() on mount (see
// hooks/useRequireAuth.ts), and until now that meant every single navigation between, say,
// Chat and Image AI blocked on a fresh network round trip to /api/auth/me before the page
// could even start fetching its own data — the dominant cause of "switching modules takes
// several seconds". This module-level cache persists for the lifetime of the page load (it's
// just a JS variable, not storage) so the *first* auth check of a session pays the network
// cost and every subsequent one resolves instantly from memory, while still revalidating in
// the background so an expired/revoked token is still caught promptly.
let cachedUser: AuthUser | null | undefined; // undefined = not yet checked this session
let inFlight: Promise<AuthUser | null> | null = null;

/** Cached, deduped version of fetchMe() for UI code that just needs "am I logged in, and as
    whom" on every page (i.e. useRequireAuth) — anything that needs a guaranteed-fresh result
    (e.g. right after login) should keep using fetchMe() directly. */
export function getCachedUser(): AuthUser | null | undefined {
  return cachedUser;
}

export async function getSessionUser(): Promise<AuthUser | null> {
  if (!inFlight) {
    inFlight = fetchMe().then((u) => {
      cachedUser = u;
      inFlight = null;
      return u;
    });
  }
  return inFlight;
}

/** Clears the cached session user — called on logout, and whenever a request comes back 401
    (see lib/apiFetch.ts), so a revoked/expired token can't keep serving a stale cached user. */
export function invalidateSessionUser() {
  cachedUser = undefined;
  inFlight = null;
}
