export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  model?: string;
  createdAt?: string;
  /** Set when this assistant message is actually a surfaced stream/provider error (bad BYOK
      key, rate limit, upstream failure, etc.) rather than a real reply — lets the UI style it
      distinctly instead of rendering it as a normal answer. */
  error?: boolean;
}

export interface ChatSummary {
  id: string;
  title: string;
  model: string;
  pinned: boolean;
  updatedAt: string;
}

export const AVAILABLE_MODELS = [
  // OpenAI
  { id: "gpt-4.1", label: "GPT-4.1", group: "OpenAI" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", group: "OpenAI" },
  { id: "gpt-4o", label: "GPT-4o", group: "OpenAI" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", group: "OpenAI" },
  { id: "o3", label: "o3", group: "OpenAI" },
  { id: "o4-mini", label: "o4-mini", group: "OpenAI" },
  // Anthropic
  { id: "claude-sonnet-4", label: "Claude Sonnet 4", group: "Anthropic" },
  { id: "claude-opus-4", label: "Claude Opus 4", group: "Anthropic" },
  // Google
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", group: "Google" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", group: "Google" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", group: "Google" },
  // Meta
  { id: "llama-4-scout", label: "Llama 4 Scout", group: "Meta" },
  { id: "llama-4-maverick", label: "Llama 4 Maverick", group: "Meta" },
  // DeepSeek
  { id: "deepseek-v3", label: "DeepSeek V3", group: "DeepSeek" },
  { id: "deepseek-r1", label: "DeepSeek R1", group: "DeepSeek" },
  // Alibaba
  { id: "qwen-3-72b", label: "Qwen 3", group: "Alibaba" },
  // Mistral
  { id: "mistral-large", label: "Mistral Large", group: "Mistral" },
  // xAI
  { id: "grok-4.3", label: "Grok 4.3", group: "xAI" },
  { id: "grok-4.1-fast", label: "Grok 4.1 Fast", group: "xAI" },
] as const;
