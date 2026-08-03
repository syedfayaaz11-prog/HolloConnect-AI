import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  // Capped even though bcrypt itself only reads the first 72 bytes — an uncapped field lets
  // a client send a multi-MB "password" string that still costs real CPU to hash before
  // that truncation kicks in.
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  name: z.string().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

// PATCH /api/auth/me — Settings page's real update endpoint. Every field optional (a partial
// update); at least one of them must be present, checked in the controller since zod's
// `.object` alone doesn't reject an empty body.
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  reducedMotion: z.boolean().optional(),
  memoryEnabled: z.boolean().optional(),
  // Was previously read-only (Settings just displayed it); the new AI Providers panel lets a
  // user actually change it. resolveUserModel.ts already reads this column as the fallback
  // when a chat request doesn't specify a model, so this makes an existing, already-used
  // field editable rather than introducing new behavior.
  defaultModel: z.string().trim().min(1).max(120).optional(),
});

export const createMessageSchema = z.object({
  chatId: z.string().uuid().optional(), // omit to create a new chat
  // ~24k chars (~4-6k words) is generous for a legitimate pasted document while bounding how
  // much a single request can cost in LLM tokens — previously unbounded (only the global
  // 10mb JSON body limit applied), a real cost-abuse vector on the most-used endpoint.
  content: z.string().min(1).max(24000),
  model: z.string().min(1).optional(),
});

// Chat.title already existed on the schema (used for the auto-generated "New Chat" /
// first-message-derived title) — this just lets a user override it via the sidebar's Rename
// action. No schema change needed.
export const updateChatSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
});

export const assignChatToProjectSchema = z.object({
  chatId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
});

export const searchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  model: z.string().min(1).optional(),
});

export const researchTopicSchema = z.object({
  topic: z.string().min(1).max(500),
  model: z.string().min(1).optional(),
});

export const generateImageSchema = z.object({
  prompt: z.string().min(1).max(1000),
  size: z.enum(["1024x1024", "1024x1792", "1792x1024"]).optional(),
  // Same convention as generateVideoSchema's sourceImageUrl below — always our own signed
  // /uploads path from POST /api/images/upload-source, never an arbitrary external URL.
  referenceImageUrl: z.string().min(1).max(2000).startsWith("/uploads/").optional(),
});

export const generateVideoSchema = z.object({
  prompt: z.string().min(1).max(1000),
  // Deliberately not z.string().url() — this is always our own /uploads path (now
  // additionally signed, e.g. "/uploads/video-sources/<uuid>.png?exp=...&sig=..."),
  // returned by POST /api/videos/upload-source, never an arbitrary external URL from the
  // client. A relative path fails a strict .url() check, so this instead just bounds length
  // and requires it look like one of our own upload paths.
  sourceImageUrl: z.string().min(1).max(2000).startsWith("/uploads/").optional(),
  // Video-to-video reference, from POST /api/videos/upload-video-source. Only meaningful if
  // the deployment's REPLICATE_VIDEO_MODEL_VERSION points at a model that accepts a video
  // input — see videogen.service.ts.
  sourceVideoUrl: z.string().min(1).max(2000).startsWith("/uploads/").optional(),
});

export const speakTextSchema = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().min(1).optional(),
});

export const updateVoiceSettingsSchema = z.object({
  defaultVoice: z.string().min(1),
});

export const askDocumentSchema = z.object({
  question: z.string().min(1).max(1000),
});

export const compareDocumentsSchema = z.object({
  documentIdA: z.string().uuid(),
  documentIdB: z.string().uuid(),
});

export const translateDocumentSchema = z.object({
  targetLanguage: z.string().min(1).max(60),
});

export const createAutomationSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    prompt: z.string().min(1).max(4000),
    model: z.string().min(1).optional(),
    type: z.enum(["SCHEDULED", "ONE_TIME", "TRIGGER"]),
    cronExpression: z.string().min(1).max(120).optional(),
    runAt: z.coerce.date().optional(),
  })
  .refine((data) => data.type !== "SCHEDULED" || !!data.cronExpression, {
    message: "cronExpression is required for SCHEDULED automations",
    path: ["cronExpression"],
  })
  .refine((data) => data.type !== "ONE_TIME" || !!data.runAt, {
    message: "runAt is required for ONE_TIME automations",
    path: ["runAt"],
  })
  .refine((data) => data.type !== "ONE_TIME" || (data.runAt && data.runAt.getTime() > Date.now()), {
    message: "runAt must be in the future",
    path: ["runAt"],
  });

export const updateAutomationSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  prompt: z.string().min(1).max(4000).optional(),
  model: z.string().min(1).optional(),
  cronExpression: z.string().min(1).max(120).optional(),
  runAt: z.coerce.date().optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
});

// Keep in sync with the keys of AGENT_TOOLS in agentTools.service.ts.
export const AGENT_TOOL_NAMES = [
  "web_search",
  "list_documents",
  "document_qa",
  "list_automations",
  "run_automation",
  "recall_past_chats",
  "recall_memory",
  "save_memory",
] as const;

export const createAgentSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  instructions: z.string().min(1).max(4000),
  model: z.string().min(1).optional(),
  tools: z.array(z.enum(AGENT_TOOL_NAMES)).max(AGENT_TOOL_NAMES.length).optional(),
  maxSteps: z.coerce.number().int().min(1).max(12).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  instructions: z.string().min(1).max(4000).optional(),
  model: z.string().min(1).optional(),
  tools: z.array(z.enum(AGENT_TOOL_NAMES)).max(AGENT_TOOL_NAMES.length).optional(),
  maxSteps: z.coerce.number().int().min(1).max(12).optional(),
});

export const runAgentSchema = z.object({
  task: z.string().min(1).max(4000),
});

// ---------------------------------------------------------------------------
// Memory (module 15, Part 1)

export const MEMORY_TYPES = ["LONG_TERM", "SHORT_TERM", "PREFERENCE", "FACT", "SUMMARY"] as const;

const memoryTagsField = z
  .array(z.string().trim().min(1).max(60))
  .max(30)
  .optional();

const memoryMetadataField = z.record(z.any()).optional();

export const createMemorySchema = z.object({
  type: z.enum(MEMORY_TYPES),
  category: z.string().trim().min(1).max(80).optional(),
  key: z.string().trim().min(1).max(120).optional(),
  content: z.string().min(1).max(8000),
  tags: memoryTagsField,
  importance: z.coerce.number().int().min(0).max(10).optional(),
  source: z.string().max(200).optional(),
  metadata: memoryMetadataField,
  pinned: z.boolean().optional(),
  expiresAt: z.coerce.date().optional(),
});

export const updateMemorySchema = z.object({
  type: z.enum(MEMORY_TYPES).optional(),
  category: z.string().trim().min(1).max(80).nullable().optional(),
  key: z.string().trim().min(1).max(120).nullable().optional(),
  content: z.string().min(1).max(8000).optional(),
  tags: memoryTagsField,
  importance: z.coerce.number().int().min(0).max(10).optional(),
  source: z.string().max(200).nullable().optional(),
  metadata: memoryMetadataField,
  pinned: z.boolean().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});

const boolQueryParam = z
  .enum(["true", "false"])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === "true"));

export const listMemoriesQuerySchema = z.object({
  type: z.enum(MEMORY_TYPES).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  tag: z.string().trim().min(1).max(60).optional(),
  source: z.string().trim().min(1).max(200).optional(),
  pinned: boolQueryParam,
  includeExpired: boolQueryParam,
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const searchMemoriesQuerySchema = listMemoriesQuerySchema.extend({
  q: z.string().trim().min(1).max(500),
});

export const retrieveMemoriesSchema = z.object({
  query: z.string().min(1).max(2000),
  type: z.enum(MEMORY_TYPES).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  source: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const listUsersQuerySchema = z.object({
  query: z.string().trim().min(1).max(200).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  isActive: boolQueryParam,
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const setUserActiveSchema = z.object({
  isActive: z.boolean(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const adminListQuerySchema = z.object({
  query: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const adminListDocumentsQuerySchema = adminListQuerySchema.extend({
  onlyOcr: boolQueryParam,
});

export const adminListMemoriesQuerySchema = z.object({
  type: z.enum(MEMORY_TYPES).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  tag: z.string().trim().min(1).max(60).optional(),
  pinned: boolQueryParam,
  source: z.string().trim().min(1).max(200).optional(),
  query: z.string().trim().min(1).max(500).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
});

export const setAgentEnabledSchema = z.object({
  enabled: z.boolean(),
});

export const updateSettingsSchema = z.object({
  platformName: z.string().min(1).max(120).optional(),
  supportEmail: z.string().email().or(z.literal("")).optional(),
  defaultModel: z.string().min(1).max(80).optional(),
  allowSignups: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  maxUploadMb: z.number().int().min(1).max(500).optional(),
  sessionLengthDays: z.number().int().min(1).max(90).optional(),
  featureFlags: z
    .object({
      deepResearch: z.boolean().optional(),
      agents: z.boolean().optional(),
      automation: z.boolean().optional(),
      voiceMode: z.boolean().optional(),
    })
    .optional(),
  proPriceInr: z.number().int().min(0).max(1000000).optional(),
  ultraPriceInr: z.number().int().min(0).max(1000000).optional(),
});

export const upgradePlanSchema = z.object({
  plan: z.enum(["PRO", "ULTRA"]),
});

// --- BYOK (API Keys) ---------------------------------------------------------------------

const API_KEY_PROVIDERS = ["OPENAI", "ANTHROPIC", "GEMINI", "OLLAMA", "OPENAI_COMPATIBLE"] as const;

export const createApiKeySchema = z
  .object({
    provider: z.enum(API_KEY_PROVIDERS),
    label: z.string().trim().min(1).max(80),
    apiKey: z.string().trim().min(1).max(500).optional(), // optional: Ollama needs none
    baseUrl: z.string().trim().url().max(300).optional(),
    defaultModel: z.string().trim().min(1).max(120).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((v) => v.provider !== "OLLAMA" || v.baseUrl, {
    message: "Base URL is required for Ollama (e.g. http://localhost:11434)",
    path: ["baseUrl"],
  })
  .refine((v) => v.provider !== "OPENAI_COMPATIBLE" || v.baseUrl, {
    message: "Base URL is required for OpenAI-compatible providers",
    path: ["baseUrl"],
  })
  .refine((v) => v.provider === "OLLAMA" || !!v.apiKey, {
    message: "An API key is required for this provider",
    path: ["apiKey"],
  });

// Every field optional (partial update) — provider is intentionally NOT editable after
// creation (changing it would invalidate baseUrl/key assumptions); delete and re-add instead.
export const updateApiKeySchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  apiKey: z.string().trim().min(1).max(500).optional(), // omit to keep the existing stored key
  baseUrl: z.string().trim().url().max(300).optional(),
  defaultModel: z.string().trim().min(1).max(120).optional(),
  isDefault: z.boolean().optional(),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(10), // the Google Identity Services ID token (JWT)
});
