/**
 * Provider-abstracted AI service.
 *
 * To add a new model/provider: add a case to `streamCompletion` that yields
 * text chunks from that provider's streaming API. No other code in the app
 * needs to change — the chat controller and frontend only know about model
 * *names*, not provider details.
 */

export interface ChatTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Per-call credential override — BYOK's payoff. When provided, these are used instead of
    the server's own env-var-configured key/endpoint for this one call. Left undefined (the
    default for every pre-existing caller), behavior is byte-for-byte what it was before BYOK
    existed. See services/apiKeys.service.ts's getUserCredentials for how these get filled in. */
export interface CredentialOverride {
  apiKey?: string;
  baseUrl?: string;
}

export type AiProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "deepseek"
  | "mistral"
  | "xai"
  | "openai-compatible"
  | "ollama";

// Fixed hosted-API base URLs for the providers that have exactly one canonical endpoint. Used
// as the default when a BYOK credential override doesn't supply its own baseUrl (which, for
// these three, it never should — see apiKeys.service.ts's DEFAULT_BASE_URL).
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const MISTRAL_BASE_URL = "https://api.mistral.ai/v1";
const XAI_BASE_URL = "https://api.x.ai/v1";

// Maps a user-facing model id to which provider handles it.
// Add entries here as you wire up more providers (Gemini, DeepSeek, Llama via
// a hosting provider, etc). Old ids are kept mapped even after the frontend selector moves
// to newer ones — an existing chat's `model` column stores whatever id was current when it
// was created, so removing an old entry here would break that chat's next message.
const MODEL_PROVIDER: Record<string, AiProvider> = {
  // OpenAI
  "gpt-4.1": "openai",
  "gpt-4.1-mini": "openai",
  "gpt-4o": "openai",
  "gpt-4o-mini": "openai",
  o3: "openai",
  "o4-mini": "openai",
  // Anthropic
  "claude-sonnet-4": "anthropic",
  "claude-opus-4": "anthropic",
  "claude-sonnet": "anthropic", // legacy id, pre-dates the Sonnet 4 / Opus 4 rename
  "claude-opus": "anthropic", // legacy id
  // Google
  "gemini-2.5-pro": "gemini",
  "gemini-2.5-flash": "gemini",
  "gemini-2.5-flash-lite": "gemini",
  "gemini-1.5-pro": "gemini", // legacy id
  "gemini-1.5-flash": "gemini", // legacy id
  // DeepSeek — native platform API (api.deepseek.com), fixed base URL, own BYOK bucket.
  "deepseek-v3": "deepseek",
  "deepseek-r1": "deepseek",
  "deepseek-chat": "deepseek", // legacy id
  // Mistral — native La Plateforme API (api.mistral.ai), fixed base URL, own BYOK bucket.
  "mistral-large": "mistral",
  // xAI Grok — native API (api.x.ai), fixed base URL, own BYOK bucket. grok-4.3 is current
  // flagship as of mid-2026; grok-4.1-fast is the budget/low-latency tier. Older ids
  // (grok-4-0709, grok-3*) now 302-redirect upstream to grok-4.3, so they're not listed here —
  // add them back only if a stored chat's `model` column is ever found using one.
  "grok-4.3": "xai",
  "grok-4.1-fast": "xai",
  // OpenAI-compatible chat-completions APIs without a fixed single endpoint of their own
  // (Llama/Qwen have no first-party hosted API — they're reached through an aggregator like
  // Groq, Together AI, or OpenRouter) or true aggregators/custom endpoints in general.
  // Point the user's OPENAI_COMPATIBLE key's baseUrl at the chosen aggregator.
  "llama-4-scout": "openai-compatible",
  "llama-4-maverick": "openai-compatible",
  "llama-3.3-70b": "openai-compatible", // legacy id
  "qwen-3-72b": "openai-compatible",
  "qwen-2.5-72b": "openai-compatible", // legacy id
};

// Ollama models are whatever the user has pulled locally, not a fixed catalog — routed via an
// explicit "ollama:<model>" id (e.g. "ollama:llama3.3") rather than a static map entry, same
// convention the BYOK Settings UI uses when it sets a default model for an Ollama key.
const OLLAMA_PREFIX = "ollama:";

// Same idea for OpenAI-compatible providers (OpenRouter, Groq, Together AI, DeepSeek, or any
// other OpenAI-shaped API): the whole point of BYOK-ing one of these is usually to reach a
// model that ISN'T in the fixed catalog above (that's most of what OpenRouter exists for). A
// "custom:<model>" id routes to the user's OPENAI_COMPATIBLE key with the suffix passed
// through verbatim as the upstream model id — e.g. "custom:mistralai/mixtral-8x22b-instruct".
const CUSTOM_COMPATIBLE_PREFIX = "custom:";

/** Determines which provider handles a given model id — exported so BYOK credential lookup
    (services/apiKeys.service.ts) can resolve the right stored key without duplicating this
    table. Returns undefined for a truly unrecognized id (not even the Ollama/custom prefixes). */
export function getModelProvider(model: string): AiProvider | undefined {
  if (model.startsWith(OLLAMA_PREFIX)) return "ollama";
  if (model.startsWith(CUSTOM_COMPATIBLE_PREFIX)) return "openai-compatible";
  return MODEL_PROVIDER[model];
}

export async function* streamCompletion(
  model: string,
  messages: ChatTurn[],
  credentials?: CredentialOverride
): AsyncGenerator<string, void, unknown> {
  const provider = getModelProvider(model);

  if (!provider) {
    throw new Error(`Unknown or unsupported model: ${model}`);
  }

  if (provider === "openai") {
    yield* streamOpenAI(
      model,
      messages,
      `${(credentials?.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "")}/chat/completions`,
      credentials?.apiKey || process.env.OPENAI_API_KEY
    );
  } else if (provider === "anthropic") {
    yield* streamAnthropic(model, messages, credentials?.apiKey);
  } else if (provider === "gemini") {
    yield* streamGemini(model, messages, credentials?.apiKey);
  } else if (provider === "deepseek") {
    yield* streamOpenAI(
      model,
      messages,
      `${(credentials?.baseUrl || DEEPSEEK_BASE_URL).replace(/\/+$/, "")}/chat/completions`,
      credentials?.apiKey || process.env.DEEPSEEK_API_KEY
    );
  } else if (provider === "mistral") {
    yield* streamOpenAI(
      model,
      messages,
      `${(credentials?.baseUrl || MISTRAL_BASE_URL).replace(/\/+$/, "")}/chat/completions`,
      credentials?.apiKey || process.env.MISTRAL_API_KEY
    );
  } else if (provider === "xai") {
    yield* streamOpenAI(
      model,
      messages,
      `${(credentials?.baseUrl || XAI_BASE_URL).replace(/\/+$/, "")}/chat/completions`,
      credentials?.apiKey || process.env.XAI_API_KEY
    );
  } else if (provider === "openai-compatible") {
    const baseUrl = credentials?.baseUrl || process.env.OPENAI_COMPATIBLE_BASE_URL;
    if (!baseUrl) throw new Error("No base URL configured for this OpenAI-compatible provider");
    const upstreamModel = model.startsWith(CUSTOM_COMPATIBLE_PREFIX)
      ? model.slice(CUSTOM_COMPATIBLE_PREFIX.length)
      : model;
    yield* streamOpenAI(
      upstreamModel,
      messages,
      `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
      credentials?.apiKey || process.env.OPENAI_COMPATIBLE_API_KEY
    );
  } else if (provider === "ollama") {
    const baseUrl = credentials?.baseUrl || "http://localhost:11434";
    const ollamaModel = model.startsWith(OLLAMA_PREFIX) ? model.slice(OLLAMA_PREFIX.length) : model;
    yield* streamOllama(ollamaModel, messages, baseUrl);
  }
}

async function* streamOpenAI(
  model: string,
  messages: ChatTurn[],
  endpoint: string,
  apiKey: string | undefined
) {
  if (!apiKey) throw new Error(`API key not configured for endpoint: ${endpoint}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Request to ${endpoint} failed: ${response.status} ${await safeText(response)}`);
  }

  for await (const chunk of parseSSE(response.body)) {
    if (chunk === "[DONE]") return;
    try {
      const json = JSON.parse(chunk);
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    } catch {
      // ignore malformed keep-alive chunks
    }
  }
}

async function* streamGemini(model: string, messages: ChatTurn[], apiKeyOverride?: string) {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const system = messages.find((m) => m.role === "system")?.content;
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    console.log("MODEL SENT TO GEMINI:", model);
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Gemini request failed: ${response.status} ${await safeText(response)}`);
  }

  for await (const chunk of parseSSE(response.body)) {
    try {
      const json = JSON.parse(chunk);
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) yield text as string;
    } catch {
      // ignore malformed keep-alive chunks
    }
  }
}

async function* streamAnthropic(model: string, messages: ChatTurn[], apiKeyOverride?: string) {
  const apiKey = apiKeyOverride || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const ANTHROPIC_MODEL_MAP: Record<string, string> = {
    "claude-opus-4": "claude-opus-4-8",
    "claude-opus": "claude-opus-4-8", // legacy id
    "claude-sonnet-4": "claude-sonnet-5",
    "claude-sonnet": "claude-sonnet-5", // legacy id
  };
  const anthropicModel = ANTHROPIC_MODEL_MAP[model] ?? "claude-sonnet-5";
  const system = messages.find((m) => m.role === "system")?.content;
  const turns = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: anthropicModel,
      system,
      messages: turns,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Anthropic request failed: ${response.status} ${await safeText(response)}`);
  }

  for await (const chunk of parseSSE(response.body)) {
    try {
      const json = JSON.parse(chunk);
      if (json.type === "content_block_delta" && json.delta?.text) {
        yield json.delta.text as string;
      }
    } catch {
      // ignore malformed keep-alive chunks
    }
  }
}

/** Ollama's native /api/chat streaming endpoint — newline-delimited JSON, not SSE, and no
    API key (it's an unauthenticated local/self-hosted server), so this doesn't reuse
    streamOpenAI/parseSSE like the other providers do. */
async function* streamOllama(model: string, messages: ChatTurn[], baseUrl: string) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Ollama request failed: ${response.status} ${await safeText(response)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        const content = json.message?.content;
        if (content) yield content as string;
        if (json.done) return;
      } catch {
        // ignore malformed keep-alive lines
      }
    }
  }
}

export async function getCompletion(
  model: string,
  messages: ChatTurn[],
  credentials?: CredentialOverride
): Promise<string> {
  let full = "";
  for await (const chunk of streamCompletion(model, messages, credentials)) {
    full += chunk;
  }
  return full;
}

/** Parses a `text/event-stream` body into individual `data:` payloads. */
async function* parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        yield line.slice("data: ".length).trim();
      }
    }
  }
}

async function safeText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
