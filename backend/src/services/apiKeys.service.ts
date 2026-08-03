import crypto from "crypto";
import { prisma } from "../config/db";
import { ApiKeyProvider } from "@prisma/client";
import { AiProvider, getModelProvider } from "./ai.service";

// ---------------------------------------------------------------------------
// Encryption — AES-256-GCM. Same fallback pattern as utils/signedFileUrl.ts: prefer a
// dedicated secret, but derive one from JWT_SECRET (never the raw secret itself) if it's
// unset, so an existing deployment doesn't break on upgrade without an immediate .env
// change. Production should still set API_KEY_ENCRYPTION_SECRET explicitly — see
// .env.example — so this signing domain doesn't share key material with JWT or file-URL
// signing either.
// ---------------------------------------------------------------------------

function getEncryptionKey(): Buffer {
  const dedicated = process.env.API_KEY_ENCRYPTION_SECRET;
  const material = dedicated || `${process.env.JWT_SECRET as string}:api-key-encryption`;
  // AES-256 needs exactly 32 bytes — hash whatever-length secret down to that deterministically.
  return crypto.createHash("sha256").update(material).digest();
}

/** Encrypts a plaintext API key for storage. Format: "iv:authTag:ciphertext", all hex. */
export function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV, standard for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/** Reverses encryptApiKey. Throws if the ciphertext is malformed or the auth tag doesn't match
    (tampered/corrupted data, or the encryption secret changed since it was stored). */
export function decryptApiKey(stored: string): string {
  const [ivHex, tagHex, dataHex] = stored.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted API key");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}

/** "sk-abc123...xyz9" -> "sk-...xyz9" — enough for a user to recognize a key without ever
    round-tripping the full secret back to the browser after creation. */
export function previewKey(raw: string): string {
  if (raw.length <= 8) return "••••";
  const prefix = raw.slice(0, 3);
  const suffix = raw.slice(-4);
  return `${prefix}...${suffix}`;
}

// ---------------------------------------------------------------------------
// Provider metadata — endpoints/requirements shared by the CRUD validation, the connection
// tester, and the credential resolver below.
// ---------------------------------------------------------------------------

export const PROVIDERS_REQUIRING_KEY: ApiKeyProvider[] = [
  "OPENAI",
  "ANTHROPIC",
  "GEMINI",
  "DEEPSEEK",
  "MISTRAL",
  "XAI",
  "OPENAI_COMPATIBLE",
];
// DEEPSEEK/MISTRAL/XAI deliberately do NOT require a base URL from the user — like OPENAI,
// they have exactly one canonical hosted endpoint (see DEFAULT_BASE_URL below), which is the
// whole point of splitting them out of OPENAI_COMPATIBLE. Only OLLAMA (self-hosted, address
// varies) and OPENAI_COMPATIBLE (true aggregators/custom endpoints) need one from the user.
export const PROVIDERS_REQUIRING_BASE_URL: ApiKeyProvider[] = ["OLLAMA", "OPENAI_COMPATIBLE"];

const DEFAULT_BASE_URL: Partial<Record<ApiKeyProvider, string>> = {
  OPENAI: "https://api.openai.com/v1",
  OLLAMA: "http://localhost:11434",
  DEEPSEEK: "https://api.deepseek.com",
  MISTRAL: "https://api.mistral.ai/v1",
  XAI: "https://api.x.ai/v1",
};

export interface TestResult {
  ok: boolean;
  error?: string;
}

/**
 * Pings the provider's lightest-weight authenticated endpoint (a models-list call wherever
 * one exists) rather than running an actual completion — validates the key/endpoint works
 * without spending the user's tokens or quota on every "Test" click.
 */
export async function testProviderConnection(
  provider: ApiKeyProvider,
  apiKey: string | undefined,
  baseUrl: string | undefined
): Promise<TestResult> {
  try {
    if (
      provider === "OPENAI" ||
      provider === "OPENAI_COMPATIBLE" ||
      provider === "DEEPSEEK" ||
      provider === "MISTRAL" ||
      provider === "XAI"
    ) {
      const base = (baseUrl || DEFAULT_BASE_URL[provider])!.replace(/\/+$/, "");
      if (!apiKey) return { ok: false, error: "An API key is required for this provider." };
      const res = await fetchWithTimeout(`${base}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { ok: false, error: await describeFailure(res) };
      return { ok: true };
    }

    if (provider === "ANTHROPIC") {
      if (!apiKey) return { ok: false, error: "An API key is required for this provider." };
      const res = await fetchWithTimeout("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      });
      if (!res.ok) return { ok: false, error: await describeFailure(res) };
      return { ok: true };
    }

    if (provider === "GEMINI") {
      if (!apiKey) return { ok: false, error: "An API key is required for this provider." };
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
      );
      if (!res.ok) return { ok: false, error: await describeFailure(res) };
      return { ok: true };
    }

    if (provider === "OLLAMA") {
      const base = (baseUrl || DEFAULT_BASE_URL.OLLAMA)!.replace(/\/+$/, "");
      const res = await fetchWithTimeout(`${base}/api/tags`);
      if (!res.ok) return { ok: false, error: await describeFailure(res) };
      return { ok: true };
    }

    return { ok: false, error: `Unknown provider: ${provider}` };
  } catch (err) {
    // Covers network failures, DNS errors, and the timeout below — all of which mean "we
    // couldn't confirm this works", not "this app is broken", so they're reported the same
    // way as an HTTP error rather than bubbling up as a 500.
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message.includes("timed out") ? "Connection timed out." : message };
  }
}

async function describeFailure(res: Response): Promise<string> {
  if (res.status === 401 || res.status === 403) return "Invalid or unauthorized API key.";
  if (res.status === 404) return "Endpoint not found — check the base URL.";
  try {
    const text = (await res.text()).slice(0, 200);
    return text || `Request failed with status ${res.status}.`;
  } catch {
    return `Request failed with status ${res.status}.`;
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new Error("Connection timed out.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Credential resolution for actual AI calls (chat, etc.) — the BYOK payoff. Falls back to
// undefined (meaning "use the server's own env-var key", exactly like before this feature
// existed) when the user has no matching-provider key, so nothing breaks for users who never
// touch BYOK.
// ---------------------------------------------------------------------------

export interface ResolvedCredentials {
  apiKey?: string;
  baseUrl?: string;
}

/** Maps a chat model id's provider (as already computed by ai.service.ts's getModelProvider)
    to which ApiKeyProvider enum value it corresponds to for BYOK lookup purposes. */
export function toApiKeyProvider(aiServiceProvider: AiProvider): ApiKeyProvider {
  return {
    openai: "OPENAI" as const,
    anthropic: "ANTHROPIC" as const,
    gemini: "GEMINI" as const,
    deepseek: "DEEPSEEK" as const,
    mistral: "MISTRAL" as const,
    xai: "XAI" as const,
    "openai-compatible": "OPENAI_COMPATIBLE" as const,
    ollama: "OLLAMA" as const,
  }[aiServiceProvider];
}

/**
 * Looks up the user's default key for the given provider (if any) and decrypts it for use.
 * Returns `{}` (no override) if the user hasn't stored a key for this provider — callers
 * should then fall back to the server's own env-var-configured key, unchanged from before
 * this feature existed.
 */
export async function getUserCredentials(
  userId: string,
  provider: ApiKeyProvider,
  model?: string
): Promise<ResolvedCredentials> {
  const candidates = await prisma.apiKey.findMany({
    where: { userId, provider },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  if (candidates.length === 0) return {};

  // Providers where a single user can plausibly hold more than one key at once — different
  // aggregators (OPENAI_COMPATIBLE) or different self-hosted servers (OLLAMA) — need to be
  // matched to the model actually being requested, not just "whichever key is newest/default".
  // Fixed-endpoint providers (OPENAI, ANTHROPIC, GEMINI, DEEPSEEK, MISTRAL, XAI) only ever have
  // one meaningful key per user, so this is a no-op for them beyond the fallback below.
  const key =
    (model && candidates.find((k) => k.defaultModel === model)) ||
    candidates[0]; // isDefault-first, then most-recently-updated, per the orderBy above

  const apiKey = key.encryptedKey ? decryptApiKey(key.encryptedKey) : undefined;
  return { apiKey, baseUrl: key.baseUrl ?? undefined };
}

/** One-call convenience for AI call sites: resolves BYOK credentials directly from a model
    id, or `{}` if the model's provider is unrecognized or the user has no key for it — in
    either case the caller should fall back to the server's env-var key exactly as before. */
export async function getUserCredentialsForModel(userId: string, model: string): Promise<ResolvedCredentials> {
  const provider = getModelProvider(model);
  if (!provider) return {};
  return getUserCredentials(userId, toApiKeyProvider(provider), model);
}
