# HolloConnect AI — Project Progress

This file is the source of truth for what's built vs. remaining. Updated after every module.
Do not restructure this repo's core architecture (Next.js frontend + Express/Prisma backend,
one shared Postgres DB) to add a module — extend it.

## Status legend
✅ Done &nbsp;&nbsp; 🚧 Partial &nbsp;&nbsp; ⬜ Not started

## Modules

| # | Module | Status | Notes |
|---|--------|--------|-------|
| 1 | Auth | ✅ | Register/login/JWT, protected routes. Google/GitHub OAuth not yet added. |
| 2 | Dashboard | ✅ | Usage stats, recent chats, model usage, quick actions. |
| 3 | AI Chat | ✅ | Streaming (SSE), markdown/code rendering, persisted history, stop generation. |
| 4 | Multi AI Models | ✅ | OpenAI, Anthropic, Gemini wired natively; DeepSeek/Llama/Qwen/Mistral via generic OpenAI-compatible endpoint (set `OPENAI_COMPATIBLE_BASE_URL`). Grok not yet added (no public OpenAI-compatible endpoint at time of writing — add as its own case when available). |
| 5 | AI Search | ✅ | Tavily web search + cited AI answer synthesis, history, follow-ups. Requires `TAVILY_API_KEY`. |
| 6 | Deep Research | ✅ | Sub-question planning → multi-query search → synthesized report, timeline, PDF export (pdfkit). Runs synchronously per request (~15-40s); see architecture note below for the queue-based upgrade path. |
| 7 | Image AI | 🚧 | Text-to-image (OpenAI DALL-E 3) is fully working: generate, persist, gallery, download, delete. Editing/inpainting/outpainting/upscaling/background-removal NOT yet implemented — each needs its own provider integration (Stability AI or similar) and is a reasonable next sub-pass rather than bundled in here. |
| 8 | Video AI | ✅ | Text-to-video + image-to-video via Replicate (async job pattern: start → poll). Frontend polls automatically until COMPLETE/FAILED. Image-to-video requires `PUBLIC_BACKEND_URL` set (provider must fetch the source image over the internet — won't work against localhost). |
| 9 | Voice AI | ✅ | STT (Whisper) + TTS (OpenAI, optional ElevenLabs), voice settings, mic input wired into Chat, turn-based voice conversation mode (auto-speak replies). NOT full-duplex real-time audio (a live phone-call-style continuous stream) — that needs WebRTC/streaming infra; this is record→transcribe→reply→speak per turn, which is what "voice conversation" means in nearly every production chat product today. Flagging the distinction explicitly rather than overclaiming. |
| 10 | Document AI | ✅ | Upload + extraction for PDF (pdf-parse), DOCX (mammoth), PPTX (custom OOXML text-run extraction), XLSX/CSV (SheetJS), TXT. Summarize, ask-questions, translate, compare-two-documents all working via `getCompletion()`. Image-based/scanned-PDF OCR is NOT covered here — that's the next module. |
| 11 | OCR | ✅ | Image OCR (PNG/JPEG/WEBP/GIF/BMP) via OpenAI Vision (default) or Google Cloud Vision, wired directly into Document AI's existing upload/extract pipeline — same endpoint, no parallel system. Scanned/image-only PDFs are explicitly NOT supported yet (would need Poppler/GraphicsMagick to rasterize pages, a native dependency not yet added) — uploading one now fails with a clear message and a real workaround (convert pages to images, upload those). |
| 12 | Automation | ✅ | Scheduled (cron via `cron-parser`), one-time, and webhook-triggered AI tasks. Restart-safe polling scheduler (60s tick, no Redis/queue needed at this scale), full run history/logs, manual "run now," pause/resume, token-secured public webhook endpoint. |
| 13 | Workflow Builder | ⬜ | |
| 14 | AI Agents | ✅ | Configurable agents (persona/goal + model + tool allow-list) that run tasks via a provider-agnostic ReAct loop (think → act → observe, JSON-structured decisions) up to a per-agent step cap (hard-limited server-side at 12). Tools wrap existing services: `web_search` (websearch.service.ts), `list_documents`/`document_qa` (Document model + getCompletion, same as Document AI's ask-question), `list_automations`/`run_automation` (automationEngine.service.ts's `executeAutomation()`), `recall_past_chats` (plain substring search over the user's own Chat/Message history), and `recall_memory`/`save_memory` (now backed by the shared Memory module #15, not a per-agent JSON store — see Memory Part 2 notes). Every run and every step is persisted (`AgentRun`/`AgentStep`) and viewable as a full trace in the UI. Runs synchronously per request, same documented tradeoff as Deep Research. |
| 15 | Memory | ✅ | Full backend (Part 1) + Chat/AI Agents/Automation integration (Part 2) + frontend browser page (Part 3) — see notes below. `/memory`: search, filter (type/category/tag/pinned), create, inline edit, pin/unpin, delete, pagination. |
| 16 | Knowledge Base | ⬜ | |
| 17 | Projects | ✅ | Full CRUD, chat assignment, project detail view. |
| 18 | Team Workspace | ⬜ | |
| 19 | Notifications | ⬜ | |
| 20 | Billing | ⬜ | |
| 21 | API Keys | ⬜ | |
| 22 | Admin Panel | ✅ | **Complete (Parts 1-3).** All 12 pages fully functional against real, platform-wide endpoints, except Product Scan Analytics — a real UI shell with zero data, since building it for real means starting the Smart Product Scan module, explicitly out of scope. See notes below for exactly what each part added. |
| 23 | Analytics | ⬜ | Dashboard covers basic per-user stats; org-wide analytics not built. |
| 24 | Mobile App | ⬜ | Backend is mobile-ready (stateless REST + SSE); no React Native app yet. |
| 25 | Testing | 🚧 | **Part 1 of 2 done — static consistency verification + a critical migration fix.** No automated test suite (unit/integration/e2e) yet — that's Part 2. See notes below. |
| 26 | Deployment | ⬜ | No CI/CD or infra config yet. |

## Module 15 — Memory: complete (Parts 1-3)

### Part 3 — frontend Memory browser page (this pass)

- **`frontend/lib/memory.ts`**: API client matching `memory.controller.ts` response shapes
  exactly (`listMemories`/`searchMemories` return the paginated `{memories, total, page,
  pageSize}` shape unwrapped from the response body; create/get/update return `{memory}`
  unwrapped to the `Memory` object; `setMemoryPinned` is a thin wrapper over `updateMemory`
  rather than a separate endpoint, since pin is just a field).
- **`components/memory/MemoryCard.tsx`**: view/inline-edit (content + tags)/pin-toggle/delete
  per memory. Shows type, category, a human-readable source badge (`chat:<id>` →
  "Chat · a1b2c3d4", etc.), pinned indicator, and tag chips.
- **`components/memory/MemoryFilterBar.tsx`**: search box (debounced 250ms in the page) +
  filter pills for type, category, tag (categories/tags fetched from
  `GET /api/memory/categories`/`/tags` so the filter options reflect what actually exists,
  not a hardcoded list), and a pinned-only toggle.
- **`components/memory/CreateMemoryForm.tsx`**: manually add a memory (FACT/PREFERENCE/
  LONG_TERM — SHORT_TERM and SUMMARY are system-generated types, deliberately not offered
  here since a user manually creating a "short-term" or "summary" memory doesn't really make
  sense given what those types mean elsewhere in the system).
- **`app/memory/page.tsx`**: composes the above with real pagination (respects the backend's
  `total`/`page`/`pageSize`, not a client-side slice of one big fetch).
- Nav entry added to `AppShell.tsx`'s `NAV_ITEMS`, same pattern as every other module.

### Parts 1-2 — backend foundation + Chat/Agents/Automation integration


Part 1 (previous pass) built the backend foundation — schema, `memory.service.ts` CRUD/
search/retrieve, controller, routes, validation. Unchanged this pass except two additive,
backward-compatible extensions needed for scoping (below). This pass wired that service into
the three modules that actually produce/consume memory.

**Service additions** (`memory.service.ts`):
- `source` filter added to `ListMemoriesFilters` and `RetrieveOptions` — lets a caller scope
  to e.g. `"chat:<id>"` or `"agent:<id>"`. In `retrieveRelevantMemories`, a `source` scopes
  candidates to *that source's memories PLUS the user's unscoped/global ones* (not source-only)
  — a chat should see its own short-term summary AND the user's general preferences together.
- `buildMemoryContextBlock(memories)`: formats Memory rows or ScoredMemory results into one
  prompt-ready string. Used identically by Chat, Agents, and Automation so memory context
  looks the same everywhere it's surfaced.
- `extractAndStoreFacts(userId, source, exchange, model)`: given one exchange of text, asks
  the model for durable facts/preferences worth remembering (strict JSON, max 3 items,
  silently returns `[]` on anything malformed — best-effort, never throws into the caller).
- `refreshShortTermSummary(userId, source, transcript, model)`: upserts (not duplicates) a
  single rolling `SHORT_TERM` summary memory per `source`, renewing its TTL each call.

**Chat integration** (`chat.controller.ts`):
- Before streaming a reply: `retrieveRelevantMemories(userId, content, { source: "chat:<id>" })`
  → `buildMemoryContextBlock` → prepended as a system turn. Surfaces this chat's short-term
  summary and any facts scoped to it, plus the user's global memories, ranked together.
- After a reply finishes (fire-and-forget, not awaited — never adds latency to the streamed
  response the user is watching):
  - `extractAndStoreFacts` runs on every turn where the user's message is ≥20 chars (skips
    trivial greetings/one-word replies as not worth a model call).
  - `refreshShortTermSummary` runs every 4th user message, not every turn — a rolling summary
    is meant to capture drift over a conversation, not change on every back-and-forth; this
    keeps the extra model call proportional to conversation length. Both tradeoffs (why fact
    extraction is per-turn but summarization is batched) are commented inline at the call site.

**AI Agents integration** — the temporary store is fully removed, not just superseded:
- `agentTools.service.ts`'s `recall_memory`/`save_memory` tools no longer touch `Agent.memory`
  at all; they call `memoryService.searchMemories`/`listMemories`/`createMemory` scoped to
  `source: "agent:<agentId>"`. Tool names/input shapes unchanged (`{"key"?: string}` /
  `{"value": string, "key"?: string}`) so existing agent configs referencing these tools by
  name keep working.
- `agent.service.ts`'s `buildSystemPrompt` is now async and calls `retrieveRelevantMemories`
  (same `source` scoping) before every run, injecting relevant memory into the agent's system
  prompt automatically — not just reachable via the `recall_memory` tool mid-run.
- `Agent.memory` (the old JSON field) is left in the schema, marked `DEPRECATED` in a comment,
  intentionally NOT dropped — removing a column is a breaking migration and nothing reads/
  writes it anymore, so there's no reason to force one. No new migration needed for Part 2:
  only comments changed in schema.prisma, no structural change.

**Automation integration** (`automationEngine.service.ts`):
- Before running an automation's task: same `retrieveRelevantMemories(source: "automation:<id>")`
  → `buildMemoryContextBlock`, appended to the system prompt.
- After a successful run (fire-and-forget): `extractAndStoreFacts` runs on the task+result pair,
  so a recurring automation (e.g. "check X and report") can build durable findings over time
  rather than starting from scratch on every scheduled run.

**Reusable API surface** (goal: Chat/Agents/Automation/Workflow Builder/Knowledge Base all use
one service) — already fully exposed since Part 1, confirmed still correct this pass:
create, list (paginated, filterable by type/category/tag/pinned/source), search (full-text-ish
`contains` match), retrieve (relevance-ranked, the function used for automatic context
injection above), get/update/delete by id, list categories, list tags. Tagging and pinning are
plain fields on create/update (`tags: string[]`, `pinned: boolean`), not separate endpoints —
already correct, no extra routes needed for those two.

**Explicitly NOT done in Part 2** (completed in Part 3, same pass as this update): frontend
Memory browser page. Workflow Builder was not touched.

## Architecture decisions in effect (do not violate without strong reason)

- One Postgres DB via Prisma; new modules add models/migrations, never a second DB.
- One Express API (`backend/src/`); new modules add `routes/`, `controllers/`, `services/`
  files following the existing pattern — no separate microservices unless a module has a
  genuinely different scaling profile (e.g. video rendering).
- Frontend auth-gating goes through `hooks/useRequireAuth.ts`; new pages wrap content in
  `<AppShell>` and add their nav entry to `NAV_ITEMS` in `components/layout/AppShell.tsx`.
- AI provider calls go through `services/ai.service.ts`'s abstraction — new models are a new
  `case`, not a new calling convention.
- Web search calls go through `services/websearch.service.ts` (Tavily by default) — same
  swap-a-case pattern as AI providers.
- Modules that produce a single synthesized (non-streamed) AI output use
  `ai.service.ts`'s `getCompletion()` helper rather than duplicating SSE-consumption logic.
- Deep Research currently runs its whole pipeline synchronously inside one request. The
  Automation module (module 12) now provides a polling-based scheduler, but it's built for
  discrete AI *tasks*, not generic background jobs with progress streaming — migrating
  Research onto it would need a dedicated "run once, right now, with status polling" path
  rather than reusing the cron/scheduled-automation flow as-is. Revisit when this becomes an
  actual UX problem, not preemptively.
- Generated media (images now; video/voice/documents next) goes through
  `services/storage.service.ts` (`saveBuffer`/`deleteFile`), served locally at `/uploads` for
  now. Swap the implementation for S3/Cloudinary in that one file when moving to production
  scale — no caller changes needed elsewhere.
- Image/video/voice generation providers follow the same swap-a-case pattern as
  `ai.service.ts` and `websearch.service.ts` — see `imagegen.service.ts`, `videogen.service.ts`.
- Async provider jobs (video now; likely voice/OCR later) follow the start/poll pattern in
  `videogen.service.ts` + `video.controller.ts`'s `getVideo`: no websockets yet — the
  frontend polls on an interval (`hooks/useVideoStatusPolling.ts`) and stops once the job
  resolves. Reuse this pattern rather than inventing a new one per module.
- File uploads go through `middleware/upload.ts` (multer, in-memory) into
  `storage.service.ts` — never write multipart files to disk directly in a controller.
- Voice AI (STT/TTS) is intentionally stateless — no audio persisted to DB/disk by default,
  since it exists to feed Chat's voice input/output rather than as a content gallery. If a
  future need arises to save voice notes, add a model then, don't retrofit storage into the
  existing pass-through endpoints.
- "Real-time voice conversation" across this codebase means turn-based (record → transcribe
  → reply → speak → ready for next turn), implemented in `ChatWindow.tsx`'s voice mode. True
  full-duplex streaming audio is a distinct, much larger feature (WebRTC, continuous audio
  pipes) — do not claim it's done unless actually built.
- Document text extraction is dispatched by mime-type/extension in
  `documentExtract.service.ts` — add a new format there the same way models/providers get a
  new case elsewhere. Extracted text is capped at 200k chars per document and prompts built
  from it are capped further (`CONTEXT_CHAR_LIMIT` in `document.controller.ts`) to keep model
  calls bounded regardless of source file size.
- OCR is not a separate upload path — it's a branch inside `documentExtract.service.ts`'s
  dispatcher, calling `ocr.service.ts`. Any module that needs "extract text from this file"
  should call `extractText()` from that one service rather than reimplementing dispatch logic.
- Resolving which AI model to use for a request (`explicit request → user default → global
  default`) is centralized in `utils/resolveUserModel.ts`. This was duplicated across chat,
  search, research, and document controllers as of the Voice AI pass — refactored into one
  helper during the OCR pass. Any new module needing a model does the same: call
  `resolveUserModel(userId, requestedModel?)`, don't re-derive it.
- Automations execute through one function regardless of trigger source — scheduler tick,
  manual "run now," or public webhook all call `automationEngine.service.ts`'s
  `executeAutomation()`, which is what keeps run history/logs consistent no matter how a run
  started. Any new trigger source should call this same function, not reimplement execution.
- The automation scheduler (`automationScheduler.service.ts`) is a simple DB-polling ticker
  (every 60s), not an external queue (no Redis/BullMQ). This is intentional at current scale —
  it's restart-safe and works with zero extra infra. Revisit only if automation volume or
  timing precision actually demands it.
- AI Agents (`agent.service.ts`) run a provider-agnostic ReAct loop on top of `ai.service.ts`'s
  plain-text `getCompletion()` rather than any provider's native function-calling — OpenAI,
  Anthropic, and Gemini each have a different tool-calling contract, and unifying that wasn't
  worth it versus asking the model for one structured JSON decision per step. Each tool in
  `agentTools.service.ts` is a thin wrapper around an existing service (never new business
  logic) — add a new tool by adding an entry there and to `AGENT_TOOL_NAMES` in
  `utils/validation.ts`, the same add-a-case pattern as models/providers elsewhere. An agent
  run is bounded by `MAX_STEPS_LIMIT` (12) regardless of its own `maxSteps` setting, and runs
  synchronously per request — same documented tradeoff as Deep Research (module 6).
- Memory (`memory.service.ts`) is one shared model/table discriminated by a `type` enum
  (`LONG_TERM`/`SHORT_TERM`/`PREFERENCE`/`FACT`/`SUMMARY`), not five separate tables — add a
  new kind by adding an enum value, not a new table. All reads/writes to the `memories` table
  go through `memory.service.ts`; no controller or caller (Chat, Agents, Automation) should
  query `prisma.memory` directly. Retrieval (`retrieveRelevantMemories`) is a plain in-process
  keyword+importance+recency scorer, no vector DB — same no-extra-infra philosophy as the
  automation scheduler. Wired into Chat, AI Agents, and Automation as of Part 2 (each via
  `source`-scoped retrieval + `buildMemoryContextBlock` for context injection, plus
  fire-and-forget `extractAndStoreFacts`/`refreshShortTermSummary` for automatic capture — see
  the Module 15 section above for exactly what runs where and why). Frontend Memory page
  (`/memory`) is built (Part 3) — search/filter/create/edit/pin/delete, matching the
  `memory.controller.ts` API exactly.

## Maintenance log

- **Sidebar chat management: Rename and Delete via a ChatGPT-style three-dot menu.**
  Previously the sidebar's "Chats" list was click-to-navigate only — no way to rename or
  delete a conversation without opening the full search modal. Backend, frontend; no schema
  change, no auth change, no change to chat history loading or streaming. Verified via
  TypeScript syntax + import/export checks across all 114 frontend and 66 backend files (0
  errors).
  - **New `PATCH /api/chat/:id` endpoint** (`{ title }`) — additive; `Chat.title` already
    existed on the schema (used for the auto-generated title), this is just the first
    endpoint that lets a user override it. Same ownership-check pattern as the existing
    `deleteChat`/`getChat` handlers. `DELETE /api/chat/:id`, `GET /api/chat`, `GET
    /api/chat/:id`, and the streaming `POST /api/chat/message` are all byte-for-byte
    unchanged.
  - **Rename now actually persists.** Previously `useChatList`'s `renameChat` only ever wrote
    to a client-local override map that silently reset on reload (documented as a known
    limitation in an earlier pass, made before this endpoint existed). Now: optimistic
    instant UI update, backend PATCH call, then folded into the real `title` on success or
    rolled back on failure.
  - **`SidebarChatList`** (`components/layout/SidebarChatList.tsx`, full rewrite of this one
    component only): each row gets a three-dot trigger, shown on hover or when the chat is
    active/its menu is open (so it's still reachable on touch devices where hover never
    fires). Opens a small dropdown (Rename / Delete), closes on outside click or Escape.
    Rename swaps the row for an inline input — autofocused, text pre-selected, saves on
    Enter or blur (clicking outside), Escape cancels and discards the edit. Delete opens a
    themed confirmation dialog (glass/blur, matching `ChatSearchModal`'s modal language)
    rather than a native `confirm()` popup; on confirm, deletes via the existing
    `removeChat`, and if the deleted chat was the one currently open, navigates to `/chat`
    (a fresh blank chat) so the user is never left looking at a conversation that no longer
    exists.
  - **Plumbing**: `removeChat`/`renameChat` (already fetched once in `AppShell` and shared via
    `SidebarContext`, from the earlier chat-list-deduplication pass) threaded through
    `SidebarContent` into `SidebarChatList` — the only prop-chain change, everything else
    about how the chat list is fetched/shared is untouched.

- **BYOK (Bring Your Own API Keys), Google Sign-In, and a premium "AI Providers" Settings
  section.** Backend, schema, and auth-flow changes this time, unlike the previous (frontend
  -only) pass — called out explicitly since the instructions for that one restricted changes
  to the frontend; this one asked for exactly these backend additions. Every change is
  additive: existing email/password auth, chat, and every other feature keep working
  unchanged for a user who never touches either new feature. Verified the same way as every
  other pass in this log — a full `npm install`/`tsc --noEmit` is still blocked by the
  registry's 403 on package tarballs in this sandbox, so this was checked via the TypeScript
  compiler's `transpileModule` across all 66 backend and 114 frontend files (0 syntax errors),
  a custom import/export cross-reference (0 broken imports, re-run after every batch of
  edits), a duplicate-export check, a migration-vs-schema field cross-check, and a brace-
  balance/model-count sanity check on `schema.prisma` itself.

  - **Schema**: new `ApiKey` model (`ApiKeyProvider`/`ApiKeyStatus` enums) storing an
    AES-256-GCM-encrypted key, optional base URL/default model, a per-provider `isDefault`
    flag, and test-connection status/error/timestamp. `User.passwordHash` widened from
    required to nullable (Google-only accounts have no password — every pre-existing row
    already has a real hash, so this is a pure widening, not a data change) and a new nullable
    unique `User.googleId`. Hand-written migration
    (`20260707000000_add_byok_and_google_auth`), matching this project's established
    convention for this sandbox.
  - **Encryption**: `services/apiKeys.service.ts` — AES-256-GCM, same key-derivation fallback
    pattern already established by `utils/signedFileUrl.ts` (prefer a dedicated
    `API_KEY_ENCRYPTION_SECRET`, derive one from `JWT_SECRET` if unset so an upgrade doesn't
    hard-fail on a missing env var). Only ciphertext and a last-4-characters preview
    (`"sk-...ab12"`) are ever stored/returned — the full key is never shown again after the
    moment it's saved, and every API response is built from an explicit `SAFE_SELECT` in
    `apiKeys.controller.ts` so a future field addition to the model can't accidentally leak
    through it.
  - **Providers supported**: OpenAI, Anthropic Claude, Google Gemini, Ollama (local, typically
    no key — a base URL like `http://localhost:11434` instead), and OpenAI-compatible (any
    provider that speaks the OpenAI chat-completions shape — OpenRouter, Groq, Together AI,
    DeepSeek, etc., with its own base URL). Connection testing pings each provider's
    lightest-weight authenticated endpoint (a models-list call, or Ollama's `/api/tags`)
    rather than running an actual completion, so clicking "Test" doesn't spend the user's
    tokens/quota.
  - **Model routing gap I found and fixed myself mid-build**: `ai.service.ts`'s model→provider
    map is a fixed catalog (`"gpt-4o"`, `"claude-sonnet-4"`, etc.), but the entire reason
    someone BYOKs an OpenAI-compatible provider like OpenRouter is usually to reach a model
    that ISN'T in any fixed catalog. Initially this meant a custom model string would hit
    "Unknown or unsupported model" even with a valid BYOK key. Fixed with an explicit
    `custom:<model>` prefix (e.g. `custom:mistralai/mixtral-8x22b-instruct`), mirroring the
    same `ollama:<model>` convention already needed for Ollama's user-defined local models —
    both route to their provider with the prefix stripped before the request goes upstream.
    Documented in the Settings UI's default-model help text so it's actually discoverable.
  - **Credential resolution**: `getUserCredentialsForModel(userId, model)` — determines the
    model's provider, looks up the user's default key for it, decrypts, and returns
    `{apiKey, baseUrl}`; returns `{}` (meaning "fall back to the server's own env-var key,
    exactly as before this feature existed") if the user has no matching-provider key. Wired
    into `chat.controller.ts` — the primary interactive surface. **Not yet wired into** the
    other ~12 call sites of `streamCompletion`/`getCompletion` (documents, agents,
    automations, research, search, memory) — those still use the server's configured keys
    only. `streamCompletion`/`getCompletion`'s new `credentials` parameter is optional and
    additive, so wiring up each remaining call site later is a small, isolated change per site
    whenever that's prioritized, not a redesign.
  - **CRUD + testing API**: `POST/GET/PATCH/DELETE /api/api-keys`, `POST
    /api/api-keys/:id/test` (rate-limited via the existing `aiLimiter` — it makes a real
    outbound request, same cost-abuse shape as an actual completion call). "At most one
    default key per provider" is enforced at the service layer (`clearOtherDefaults`), not a
    DB constraint, since Postgres/Prisma can't express that partial uniqueness declaratively
    here. The first key added for a given provider becomes that provider's default
    automatically.
  - **Google Sign-In**: `services/googleAuth.service.ts` verifies the ID token via Google's
    own `tokeninfo` HTTPS endpoint rather than a JWT/JWKS-verification library — there's no
    way to install a new npm dependency in this sandbox (registry blocks tarball fetches with
    a 403), and this is a real, supported part of Google's OAuth2 API, not a hack; worth
    swapping for `google-auth-library`'s local JWKS verification in a deployment where
    installing it is possible (marginally lower latency, one fewer network hop per sign-in).
    `POST /api/auth/google` then: logs in if `googleId` already matches; links Google to an
    existing email/password account if the email matches (their password keeps working
    afterward too — this is additive, not a replacement); otherwise creates a new account with
    the same trial setup as normal registration, just with no password. `login()` now rejects
    a password attempt on a Google-only account with a clear "use Google Sign-In" message
    instead of crashing `bcrypt.compare` on a null hash.
    - **Caught and fixed my own mistake mid-build**: an early edit to insert the new
      `googleAuth` function accidentally deleted the existing `deleteMe` account-deletion
      handler (used by Settings → Privacy) in the same diff. Caught before finishing the pass
      by re-checking the file's function list; restored `deleteMe` immediately alongside
      `googleAuth`, then re-verified both are present and the rest of the file is otherwise
      untouched.
  - **Frontend**: `components/auth/GoogleSignInButton.tsx` loads Google Identity Services via
    a script tag (not an npm package — same reasoning as the backend's tokeninfo choice: no
    way to install a new dependency here), renders Google's own button widget, and forwards
    the resulting credential to the new endpoint. Silently renders nothing if
    `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is unset, so a deployment that hasn't configured Google
    Sign-In just keeps showing email/password only, unchanged. Added to both the login and
    register pages, below the existing form, inside the same card.
  - **Settings → "AI Providers"** (`components/settings/AiProvidersPanel.tsx`): replaces the
    old "AI Models" section, which only ever displayed `defaultModel` read-only — same
    underlying field, now with an actual editable control, so this is an upgrade of existing
    functionality rather than a removal of it. Includes: add/edit/delete/test for keys, a
    compact per-provider-type status strip (at a glance, which of the 5 provider types
    actually has a working key), a "make default" star for when a user has stored more than
    one key for the same provider, and a default-model field (with a `<datalist>` of the
    built-in catalog for convenience, but free-text so a BYOK/Ollama/custom model id can be
    typed directly). `defaultModel` is now genuinely patchable via `PATCH /api/auth/me`
    (previously validation-schema-blocked even though the column and its read path,
    `resolveUserModel.ts`, already existed) — a small, additive validation-schema change.

- **Chat page redesign (ChatGPT-style layout) + a full frontend production performance
  pass.** No backend, Prisma schema, API contract, or routing changes — everything below is
  frontend-only, and every existing feature/behavior not explicitly called out as changed
  still works exactly as before. Verified by TypeScript syntax-checking (via the TypeScript
  compiler's `transpileModule`, since a full `npm install` is blocked by a registry 403 in
  this sandbox — same limitation documented in earlier entries below) across all 111 frontend
  `.ts`/`.tsx` files (0 errors) and a custom import/export cross-reference script confirming
  every named import in the codebase resolves to a real export in its target module (0
  broken imports) — both re-run after every batch of edits, not just once at the end.

  - **Fixed the actual cause of chat-page layout jumps**: `AppShell`'s `<main>` was itself a
    scroll container (`overflow-y-auto`) *at the same time* `ChatWindow` had its own internal
    scrolling message list — two competing scroll contexts on one page, which is what
    produced the jumpiness. Added an opt-in `lockMainScroll` prop to `AppShell` (default
    `false` — every other page's `main` element renders with the exact same classes as
    before, confirmed by re-reading the conditional's false-branch output). Only the Chat
    page passes it. When active, `main` gets a precise height (`h-screen` on desktop,
    `calc(100dvh - 3.5rem)` on mobile, accounting for the mobile top bar which was given an
    explicit `h-14` to make that math exact) instead of scrolling itself, and `ChatWindow`
    fills it via `min-h-0` at every level of the flex chain (the classic flexbox bug where a
    scrolling descendant needs `min-h-0` on *every* ancestor flex item, not just the
    scrolling element itself, or the browser grows the box instead of scrolling it). Result:
    sidebar, top header, model selector, and composer are genuinely fixed; only the message
    list scrolls; no layout shift when new messages arrive.
  - **Auto-scroll now matches ChatGPT's actual behavior**, not "always scroll to bottom on
    every update" (which the previous implementation did via `scrollIntoView({behavior:
    "smooth"})` on every `displayMessages` change). Replaced with a scroll-position tracker
    (`isNearBottomRef`, ~120px threshold) read from a `scroll` listener on the message
    container: auto-scroll fires only when the user hasn't scrolled up. Sending a new message
    resets the "stick to bottom" intent, same as ChatGPT. Also switched from `smooth` to
    instant scrolling *during* streaming specifically — smooth-scroll animations queue up and
    visibly lag behind fast token updates, which reads as jumpy; a plain jump keeps the
    bottom pinned exactly on every update with nothing to fall behind on.
  - **Streaming re-render/reparse volume cut via `requestAnimationFrame` batching.** The
    backend can emit many small SSE token events per second; the old code called `setMessages`
    (a full state update, full `ChatWindow` re-render, and a full markdown+syntax-highlight
    reparse of the growing message via `react-markdown`/`rehype-highlight` in `Markdown.tsx`)
    once per token. `useChat` now buffers incoming tokens in a ref and flushes at most once
    per animation frame, capping update frequency at the display refresh rate regardless of
    token rate — with a synchronous final flush (`finalizeFlush`, cancels any pending frame
    and flushes immediately) wired into stream completion, `stop()`, and `startNewChat()`, so
    no buffered characters are ever lost or left one frame stale when a stream ends or is
    aborted. Same final message content either way — this only changes how often React
    re-renders while it's arriving, not what arrives.
  - **Stopped re-rendering components that don't need it.** `ChatWindow`'s `handleSend`,
    `handleNewChat`, and the web-search toggle are now `useCallback`-stabilized instead of
    being redefined (new function identity) on every render; `ChatInput` and `ModelSelector`
    are now wrapped in `React.memo`, so they stop re-rendering purely because their parent
    re-rendered on a streamed token even though their own props didn't meaningfully change.
    (`MessageBubble` was already correctly memoized from an earlier pass — confirmed, not
    re-verified from scratch.)
  - **Removed a genuine duplicate/redundant API request.** `useChatList()` (the chat-history
    fetch backing the sidebar's recent-chats list) was being called independently by three
    separate components — `SidebarChatList`, `ChatSearchModal`, and the Chat page's
    `WelcomeScreen` — meaning up to three identical requests fired on a single page load
    (worse, `WelcomeScreen` re-fetched on every remount, which happens each time the
    conversation goes from empty back to empty, e.g. rapid "New Chat" clicks). Consolidated
    into a single `useChatList()` call in `AppShell`, exposed via the existing
    `SidebarContext` (which `ChatWindow`/`WelcomeScreen` already consume for other sidebar
    coordination) as `chats`/`chatsLoading`. `SidebarChatList` and `ChatSearchModal` now
    receive the list and its mutation actions (`removeChat`/`togglePin`/`renameChat`) as
    props instead of fetching their own copy. This is also a small correctness fix, not just
    a perf one: previously, renaming or pinning a chat from the search modal wouldn't show up
    in the sidebar's list (two independent copies of session-local rename/pin state) — now
    there's one shared copy, so it's consistent everywhere.
  - **Reduced-motion support extended to `MessageBubble`**, the highest-frequency mounting
    animated component in the app during an active chat session (one per message). Under
    `useMotionPreference()`, it now skips the y-transform and animates opacity only, at
    ~0-duration — same pattern already established for `HolloConnectLogo`. Not extended
    further than this in this pass; see the note below (still scoped intentionally, same
    reasoning as the existing note on this near the bottom of this file, just now also
    covering the component that actually matters most for the chat redesign).
  - **Added root-level error boundaries** (`app/error.tsx`, `app/global-error.tsx`) — these
    didn't exist anywhere in the app before this pass, meaning any uncaught render error on
    any page crashed to a blank white screen with no recovery path. `error.tsx` is a
    Next.js App Router convention that wraps every route; `global-error.tsx` is the required
    pairing that catches errors in the root layout itself. Both are new files — nothing
    existing was touched to add them. On-brand styling (glass card, accent gradient) for the
    former; deliberately dependency-free inline styles for the latter, since it's the last
    line of defense if something foundational (Tailwind, framer-motion, etc.) itself fails to
    load.
  - **What this pass did *not* do**, on purpose: convert `ImageCard`'s generated-image `<img>`
    tags to `next/image` (would need `remotePatterns` configured against a dynamic backend
    origin, and risks touching the already-completed Image AI gallery work the instructions
    said to leave alone — left as a candidate for a dedicated pass with a live environment to
    verify against); broaden reduced-motion coverage beyond `MessageBubble` to the other ~54
    files using `framer-motion` (same "worth doing as its own focused pass" reasoning as the
    existing note below); add `loading.tsx` route-level boundaries (limited value here since
    every page is a client component already gating its own loading state via
    `useRequireAuth()` — Next's RSC-level loading UI wouldn't meaningfully change perceived
    speed in a client-component-heavy app like this one); or change the per-page
    `useRequireAuth()` auth-check pattern (each page fetching `/me` once on mount is
    consistent, intentional, and not a duplicate-within-a-page bug — restructuring it into a
    shared layout-level auth context would be an authentication-flow architecture change,
    which the instructions for this pass explicitly said not to make without an actual bug to
    fix).

- **Image AI inspiration gallery now uses real bundled photos, supplied by the project
  owner.** The prior two sessions correctly declined to source/fabricate stock photography
  (no license to redistribute third-party stock media, no way to legitimately obtain any) -
  this session the user uploaded 12 original images directly and asked for them to be wired
  in, which is a different and legitimate situation (their own supplied assets, not something
  sourced from the open internet). Frontend `npx tsc --noEmit`: 0 errors. No backend, auth,
  routing, or generation-logic changes - scoped exactly to the Image AI inspiration gallery
  as instructed.
  - **12 images converted and bundled**: saved to `frontend/public/samples/images/` as WebP
    (Pillow, quality 82, longer edge capped at 1200px - cut every file to well under 250KB,
    down from much larger source PNGs) with the exact requested filenames
    (`portrait-photography.webp`, `luxury-car.webp`, `architecture.webp`,
    `cyberpunk-city.webp`, `fantasy-landscape.webp`, `product-photography.webp`,
    `logo-design.webp`, `food-photography.webp`, `nature.webp`, `interior-design.webp`,
    `anime-style.webp`, `space-scene.webp`). Each mapping was visually verified against the
    actual image content before wiring anything up, not assumed from upload order alone.
  - **One real mismatch caught and resolved**: the existing `IMAGE_INSPIRATION` list's 12th
    category was "Cinematic" (from the earlier abstract-art session), but the 12 supplied
    images don't include a cinematic-themed one - they include a space/galaxy scene instead.
    Rather than leave a category with no image or force a wrong image onto it, swapped
    "Cinematic" for "Space Scene" in `lib/inspiration.ts` to match what was actually supplied
    (removed the now-unused `Clapperboard` icon import that only that category used).
  - **`InspirationGrid.tsx`**: `InspirationItem` gained an optional `image` field. When
    present, the tile renders the real photo via `next/image` (`fill` + `object-cover`,
    lazy-loaded by next/image's default behavior, `sizes` hinted per tile size) under a
    bottom-darkening gradient for text legibility - the previous colored gradient wash is
    skipped for these tiles (the photo itself carries the color now) and kept only as the
    fallback for categories with no bundled asset (every Video AI tile, since no video assets
    were supplied this session). Card shell, hover animation, glassmorphism icon badge,
    click-to-fill (`onClick={() => onUse(item.prompt)}`, byte-for-byte unchanged), responsive
    grid, and loading skeleton logic were not touched.
  - **Verification**: confirmed all 12 `image` paths resolve to files that actually exist in
    `public/samples/images/` (directory listing), visually opened 3 of the 12 rendered WebP
    files directly to confirm the id-to-filename-to-content mapping is correct (luxury-car,
    logo-design, portrait-photography, fantasy-landscape all spot-checked), confirmed
    `app/images/page.tsx`'s usage of `IMAGE_INSPIRATION`/`InspirationGrid` is unchanged, and
    confirmed the click handler passing the prompt through to the composer is the exact same
    line as before this session. `npx tsc --noEmit` clean.
- **Subscription & Pricing system (new feature) + final UI/QA pass.** Real backend work this
  time, not just presentation — new Prisma fields, a migration, new API endpoints, and a real
  Pricing page wired to them. Frontend `npx tsc --noEmit`: 0 errors. Backend `npx tsc
  --noEmit`: 45 errors, same count as the prior session's baseline, zero of them new (checked
  by exact file+line against the previous run's output, not just file name this time - every
  admin.service.ts line that appears is one of the already-known stub-Prisma-client
  categories, none reference the new pricing fields).
  - **Schema**: `User` gained `plan` (`TRIAL | FREE | PRO | ULTRA`, defaults to `"TRIAL"`) and
    `trialEndsAt` (nullable). New migration
    `20260706000000_add_subscription_trial/migration.sql`, hand-written per this project's
    established convention (no live DB in this sandbox). Backfills existing rows with a fresh
    60-day trial from deploy time rather than leaving them null or instantly-expired.
  - **Every new signup gets a real 2-month free trial**, set explicitly in
    `auth.controller.ts`'s `register` (`trialEndsAt = now + 60 days`, `plan = "TRIAL"`) since
    Prisma's `@default(now())` can't do relative date math - this has to happen in
    application code.
  - **Prices are genuinely admin-managed, not hardcoded**: `proPriceInr`/`ultraPriceInr` added
    to the existing JSON-backed `PlatformSettings` (admin.service.ts) - so, like every other
    setting there, this needed *zero* migration (it's schema-less JSONB) and is editable from
    the existing Admin > Settings page today (new "Subscription Pricing" section added there).
  - **New `GET /api/billing/me`**: returns plan, trial status, days remaining, and both the
    raw admin-set prices and the "display" prices with the trial override already applied
    (₹0/month for both plans while a trial is active - computed server-side so the frontend
    never has to duplicate that rule). **New `POST /api/billing/upgrade`**: sets the plan
    directly. Documented plainly, in both the backend and frontend, that this is not a real
    payment integration - none was requested, and building something that only *looks* like
    it charged a card would be actively misleading. It's shaped exactly like what a real
    payment provider's webhook handler would eventually call, so wiring one up later doesn't
    require changing anything else (the plan check, the Pricing page's "Current Plan"
    indicator).
  - **New `/pricing` page**: trial banner ("New User Offer - 2 Months Free", days remaining,
    expiry date), two real plan cards (Pro - "Most Popular" badge; Ultra - glow treatment,
    Crown icon), a 12-row feature comparison table, and CTA buttons that reflect actual
    current-plan state (a plan you're already on shows "Current Plan" and disables, not an
    active upgrade button). Added to the sidebar's primary nav as "Upgrade". New
    `lib/billing.ts` frontend client.
  - **The old "2-Month Subscription Plan" the request said to remove**: searched the whole
    codebase first, per "inspect before modifying" - it never existed here (only my own new
    code's "2-month free trial" comments matched the search, which is the trial, not a
    purchasable plan). Nothing to remove; confirmed rather than assumed.
  - **Image AI / Video AI inspiration - same honest position as last session, not
    re-litigated**: the request again asked for real bundled HD photos/video loops. That's
    still not something this environment can legitimately do (no license to redistribute
    stock media, no way to source or purchase any here) - re-confirmed the prior session's
    upgraded original-abstract-art tiles are intact and untouched rather than silently
    reverting to a weaker claim under a second ask.
  - **Visual/QA verification performed**: re-confirmed the background logo, search modal,
    sidebar, and attachment menu from the previous session are all still intact and untouched
    (grepped for their key markers rather than assuming) - per this session's own "if already
    correct, do not modify" instruction. No regressions found, so nothing was touched there.
- **Frontend UI/UX polish pass — background logo, search modal, page centering, Projects,
  Image/Video AI inspiration, Document AI, AI models, attachment menu, sidebar, performance,
  and general consistency.** Pure frontend + a small, backward-compatible backend model-list
  extension (see below) — no auth, Prisma, routing, or API-shape changes. Frontend
  `npx tsc --noEmit`: **0 errors**. Backend `npx tsc --noEmit`: 45 errors, identical count to
  the last session's baseline, zero of them in any file touched this session (confirmed by
  grep) — same pre-existing Prisma-stub-client limitation documented since the security audit.
  - **Background logo, fixed**: `PageWatermark.tsx` was genuinely broken — 640px, shifted
    `-top-32 -right-28` (off-screen-shifted, not centered), rotated, `max-w-none` (could
    overflow). Now: ~260px (~59% smaller), perfectly centered via flex, no rotation, soft
    `blur-[2px]`, opacity 0.06 (within the requested 4-8%), clipped by the existing
    `overflow-hidden` parent so it can never overflow. One shared component already used on
    every page via `AppShell`, so this single fix applies everywhere at once - no per-page
    changes needed.
  - **Search Conversations modal, redesigned**: was positioned at a fixed `top-[12vh]` offset,
    not truly centered. Now a real centered flex layout, richer glassmorphism (deeper blur,
    subtle top accent glow, layered shadow), a proper New/Esc affordance row, staggered
    empty-state entrance, and refined list-item hover/pin/rename/delete affordances -
    `components/layout/ChatSearchModal.tsx`.
  - **Vertical centering fixed** on Projects, Image AI, Video AI, Document AI, Memory, Voice
    AI, AI Agents, Automations, and Dashboard - each page's existing outer wrapper gained
    `min-h-full flex flex-col justify-center`, so a short/empty page centers in the available
    space (matching ChatGPT/Claude) while a page with substantial content still scrolls
    normally, since the flex item just grows past the container once content exceeds it.
  - **Projects page rebuilt with more care**: larger header treatment, refined create-project
    card with better input/button sizing, nicer "quick start" chips, a real empty state (icon
    + message) instead of a single gray sentence, staggered entrance animation.
    `ProjectCard.tsx` got a richer hover state (glow + border + shadow together).
  - **Image AI / Video AI inspiration - upgraded, with an honest limitation**: expanded to the
    requested category lists (Portrait, Product Photography, Luxury Cars, Architecture,
    Cyberpunk, Anime, Fantasy, Nature, Cinematic, Logo Design, Interior Design, Food
    Photography for images; Drone Flyover, Cinematic Pan, Ocean Waves, Product Spin, City
    Timelapse, Space Animation, Particle Motion, Fantasy Landscape, Luxury Car Motion, Water
    Splash, Fire Effects, Neon City for videos) with a richer per-category visual treatment
    (layered diagonal gradients, glass icon badge, hover glow, a play-affordance cue on video
    tiles). **What this is not, stated plainly**: real licensed stock photography or video
    loops. This app has no license to redistribute third-party stock media, and this
    environment has no way to source or purchase any - bundling real stock assets wasn't
    something safe to fake. The tiles are original, locally-bundled abstract art (gradients +
    icons, zero network requests), not photographs - documented directly in
    `InspirationGrid.tsx`'s own comment so this isn't quietly forgotten later. Clicking a tile
    still correctly populates the prompt and generation is completely unchanged.
  - **Document AI polish**: `DocumentUploader.tsx` - bigger icon treatment with a glow on
    drag-over, a breathing animation while uploading, better typography hierarchy, more
    generous padding, a real "Drop it right here" state. Centering came from the page-wrapper
    fix above.
  - **AI model list updated** to the requested current lineup (OpenAI GPT-4.1/GPT-4.1 Mini/
    GPT-4o/GPT-4o Mini/o3/o4-mini, Anthropic Claude Sonnet 4/Opus 4, Google Gemini 2.5 Pro/
    Flash/Flash Lite, Meta Llama 4 Scout/Maverick, DeepSeek V3/R1, Alibaba Qwen 3, Mistral
    Large) - `types/index.ts`'s `AVAILABLE_MODELS` now carries a `group` field, and
    `ModelSelector.tsx` renders them under provider group headers with a nicer glassmorphism
    dropdown. **Backend extended, not replaced**, to actually back these - the user-facing
    instruction said "keep existing architecture, only improve the frontend selector," but an
    id the backend's `MODEL_PROVIDER` map doesn't recognize would just break chat with
    "Unknown or unsupported model," which would violate "don't break existing functionality"
    more than a small, same-pattern map extension does. `ai.service.ts`'s `MODEL_PROVIDER`
    map gained the new ids alongside the **old ones, kept mapped** (`claude-sonnet` maps to
    `claude-sonnet-5`, etc.) - an existing chat's `model` column stores whatever id was
    current when it was created, so removing an old entry would break that chat's next
    message. Same treatment for the Anthropic model-string resolution (was a two-way ternary,
    now a map covering old + new ids) and the default-model fallbacks in
    `resolveUserModel.ts`/`admin.service.ts` (updated to the new default, zero DB migration
    needed since `User.defaultModel`'s DB-level default of `"claude-sonnet"` is still a valid,
    working, mapped id).
  - **Attachment (+) menu redesigned**: `ChatInput.tsx` - was a plain 2-line text list in a
    generic box. Now a Claude-inspired floating panel: deeper glassmorphism, icon badges per
    action (colored per destination), title + description per item, staggered entrance,
    animated + to x rotation on the trigger button itself.
  - **Sidebar polish**: `NavLink` in `AppShell.tsx` - active items now tint their icon
    accent-violet (previously only the text went white, icon stayed the same gray as
    inactive items), the active pill gained a subtle inset highlight, hover state added a
    gentle press-scale micro-interaction.
  - **Performance - targeted, evidence-based, not a blind pass**: traced `useChat.ts`'s
    streaming update (`prev.map` replacing only the matching message) and confirmed every
    non-streaming message keeps a stable object reference on every token tick - so wrapping
    `MessageBubble` in `React.memo` (`components/chat/MessageBubble.tsx`) means React now
    skips re-rendering every past message in a conversation on each streamed token, only
    re-rendering the one actually changing. This is the single highest-leverage fix for the
    reported sluggishness, concentrated exactly where the app re-renders most (long chat +
    active streaming). Also memoized `InspirationGrid` (static per-page item list - no longer
    re-renders on every keystroke in a sibling prompt composer), `ImageCard`, and `VideoCard`
    (gallery items - skip re-render when unrelated items in the list update, e.g. another
    video's status polling tick). **Checked, not changed**: this project has no Three.js
    dependency at all (confirmed via `package.json` - nothing to optimize that isn't there);
    Next.js App Router already code-splits every route by default and `<Link>` already
    prefetches by default, so "lazy load heavy pages"/"prefetch routes" were already true
    architecturally rather than needing new code.
  - **Verification**: frontend `npx tsc --noEmit` clean (0 errors) after every batch of
    changes and once more at the end; backend `npx tsc --noEmit` unchanged at 45 pre-existing
    errors with zero new ones (grepped the output for every file touched this session - none
    appear); brace/paren/bracket balance checked on every touched file. **Not independently
    re-verified by actually clicking through the running app** (no live frontend+backend+DB in
    this sandbox - same standing limitation as every prior session) - nothing touched in this
    pass changed data-fetching logic, API call shapes, or business logic, only presentation
    and the backward-compatible model-id mapping described above, so the risk profile is low,
    but this is stated plainly rather than claimed as tested.
- **Render deployment build fixes — real TypeScript errors from a real build, for the first
  time this whole project.** Render's build environment has full network access, so it got
  past `prisma generate` (which this sandbox has never been able to do — see every prior
  session's notes) and reached the actual `tsc` compile step, surfacing 5 real errors. Fixed
  all 5, then kept going per instructions and found **2 more genuine errors** beyond the
  reported list by running this sandbox's own `tsc` against its stub Prisma client and
  carefully classifying every single line of output — anything mentioning a missing
  `Prisma`/`@prisma/client` member is the same pre-existing stub-client limitation; anything
  else is real. Zero `any`, zero `@ts-ignore`/`@ts-nocheck`, `strict: true` untouched,
  confirmed by grep. Frontend completely untouched (diffed byte-for-byte against the prior
  session's state — identical).
  - **`src/utils/jwt.ts`** — `expiresIn` is typed `StringValue | number` (a template-literal
    branded type from the `ms` package), not a general `string`; `process.env.JWT_EXPIRES_IN
    || "7d"` was inferred as plain `string`, which doesn't satisfy that narrow type and made
    the whole `sign()` overload resolution fail (explaining the confusing cascade of
    unrelated-looking errors Render reported — "not assignable to null", "'expiresIn' does
    not exist in type 'SignCallback'" — those were TS trying other overloads after the real
    one failed). Fixed with a precise, single-purpose cast to `SignOptions["expiresIn"]` at
    the point env vars enter the typed world — not `any`, and a genuinely malformed value
    would still fail loudly at runtime inside jsonwebtoken itself, same as before.
    **Verified by direct `tsc` run** — this file doesn't touch Prisma at all, so this
    sandbox's stub client doesn't mask the result; confirmed present in the error list
    before the fix and completely absent after.
  - **`src/services/voice.service.ts`** — Node's `Buffer` is generically typed over
    `ArrayBufferLike` (which includes `SharedArrayBuffer`), but `Blob`'s `BlobPart` type
    specifically wants a plain `ArrayBuffer`-backed view — a known Node/DOM typing friction
    point. Fixed by wrapping in `new Uint8Array(buffer)`, which goes through the array-like
    copy-constructor overload and produces a fresh `ArrayBuffer`-backed view with identical
    bytes (audio data unchanged, not corrupted). **Verified by direct `tsc` run**, same
    reasoning as jwt.ts — no Prisma involvement, confirmed gone after the fix.
  - **`src/services/memory.service.ts`** — `UpdateMemoryInput`'s real bug, not a controller
    problem: `Partial<CreateMemoryInput> & { category?: string | null; ... }` doesn't
    "override" `category` to also allow `null` the way class inheritance would — TypeScript
    *intersects* the two allowed types for the same property name
    (`string | undefined` & `string | null | undefined`), which silently drops `null` again
    since it isn't common to both sides. Fixed with `Omit<Partial<CreateMemoryInput>, "category"
    | "key" | "source" | "expiresAt"> & { category?: string | null; ... }` — omit the
    conflicting keys first, then add the nullable versions, the correct pattern for "partial
    but some fields are explicitly nullable." This is pure TypeScript intersection-type
    algebra, entirely independent of Prisma — confirmed `CreateMemoryInput` is a plain
    hand-written interface, not Prisma-generated — so this fix is provably correct by
    reasoning alone regardless of the stub-client limitation. Bonus confirmation: the
    function body (`category: input.category === null ? null : input.category`, etc.) was
    already written correctly assuming `null` was allowed — this fix aligns the type
    declaration with logic that was already right, not the other way around.
  - **`src/controllers/search.controller.ts`**, **`src/services/admin.service.ts`**
    (`writeAuditLog`'s `metadata`), **`src/services/agent.service.ts`** (`actionInput`) — the
    same underlying issue in three places: a plain TypeScript interface/`Record<string,
    unknown>` value, even though genuinely JSON-serializable at runtime (confirmed — every
    field involved is a string/plain value), doesn't structurally satisfy Prisma's
    `InputJsonValue` without an explicit `as unknown as Prisma.InputJsonValue` cast. This
    isn't a weakening cast — it's the standard, Prisma-documented pattern for this exact
    friction point, and this exact pattern was **already present and evidently
    already working** in `research.controller.ts` and elsewhere in `memory.service.ts`
    (neither was in Render's error list) — strong evidence this specific pattern is correct
    against the real generated client, not just plausible-looking. Not independently provable
    by this sandbox's `tsc` (Prisma-touching, so the stub masks it either way), but grounded
    in an already-proven-working precedent in the same codebase rather than fresh guesswork.
  - **Two additional real errors found beyond the reported 5** (both fully proven fixed by
    direct `tsc`, not Prisma-related, so this sandbox could verify them completely):
    - `src/services/admin.service.ts`'s `updateSettings` — `Partial<PlatformSettings>` only
      shallow-partials; `featureFlags` still required all four flags whenever present, but
      the zod schema (and the function's own already-correct runtime merge logic,
      `{...current.featureFlags, ...patch.featureFlags}`) already supported updating just
      one flag at a time. Retyped the parameter as
      `Partial<Omit<PlatformSettings, "featureFlags">> & { featureFlags?:
      Partial<PlatformSettings["featureFlags"]> }` to say what the code already does.
    - `src/controllers/voice.controller.ts`'s `speak` — a `let voice = parsed.data.voice`
      reassigned inside an `if (!voice)` block wasn't narrowing to non-`undefined` cleanly
      afterward. Added a defensive `voice ?? "alloy"` at the point of use — `voice` is
      already guaranteed non-undefined there at runtime by the preceding logic; this just
      makes the type checker agree unconditionally.
  - **Investigated getting a real Prisma client one more time, exhaustively, before falling
    back to reasoning-based verification**: checked whether `@prisma/engines` (an npm
    package, reachable via the registry) bundles the actual engine binaries — it doesn't;
    direct inspection confirmed it's a 136KB downloader stub whose only job is fetching the
    real binaries from `binaries.prisma.sh` (blocked) at install time, identical root cause
    to every prior session's finding. No further legitimate avenue exists in this sandbox.
  - **What's proven vs. reasoned, stated precisely**: 2 of the 5 originally-reported fixes
    (`jwt.ts`, `voice.service.ts`) plus both newly-found errors (`admin.service.ts`'s
    settings, `voice.controller.ts`'s `speak`) are **directly confirmed by a real `tsc` run**
    — present before, absent after, zero ambiguity. The remaining 3 (`memory.service.ts`,
    `search.controller.ts`, `admin.service.ts`'s audit log, `agent.service.ts`) are fixed
    with the same rigor of reasoning but **not independently compiler-provable in this
    sandbox** — they depend on Prisma's real generated types, which this environment has
    never been able to produce (see every prior session). This is not a new limitation and
    not something left undone by choice. **The true, complete confirmation is Render's own
    next build log** — since Render already got past every stage this sandbox can't reach.
- **Android APK preparation for private testing — see `MOBILE_BUILD.md` for the complete
  phone-only path**. Scope was strictly additive: no existing frontend/backend file was
  modified, no security hardening or redesign work touched. This sandbox has no JDK compiler,
  no Gradle, no Android SDK, and its network allowlist blocks both `dl.google.com` and
  `services.gradle.org` (verified directly — 403 on both) — so **no APK was compiled here**,
  confirmed rather than claimed. What was actually done:
  - Added `@capacitor/core`, `@capacitor/android`, `@capacitor/cli` to `frontend/package.json`
    (nothing existing removed or bumped). Generated the real native Android project via
    Capacitor's own tooling (`npx cap add android`) rather than hand-writing Gradle files —
    `frontend/android/` is a genuine, complete Capacitor Android project (confirmed
    `gradlew`/`gradlew.bat` present, `INTERNET` permission set, `applicationId
    in.holloconnect.app`).
  - `frontend/capacitor.config.ts`: configured `server.url` to point the WebView at a real
    hosted URL (`https://holloconnect.in` placeholder) instead of bundling a static Next.js
    export into the APK. Deliberate choice: this project's 7 dynamic routes
    (`/admin/users/[id]`, `/agents/[id]`, `/automations/[id]`, `/documents/[id]`,
    `/projects/[id]`, `/research/[id]`, `/search/[id]`) have no `generateStaticParams()`, so
    `output: 'export'` fails — matches the failure already hit before this session. Pointing
    at the live site instead sidesteps that entirely and means future frontend deploys are
    live in the app immediately, no APK rebuild needed. `npx cap sync android` confirmed the
    URL was correctly written into the native project's config.
  - `.github/workflows/build-android.yml`: a `workflow_dispatch`-triggered (manual only, never
    runs on every push) GitHub Actions workflow that builds the debug APK on GitHub's own
    runners (which have the Android SDK/Gradle/JDK this sandbox doesn't), verifies the APK
    file genuinely exists before declaring success, and uploads it as a downloadable artifact
    — the whole trigger-and-download flow works from GitHub's mobile website, no terminal
    needed. YAML syntax-validated (parses correctly, structure confirmed) but **not run
    end-to-end** — that needs a live GitHub repo + Actions runner, unavailable here.
  - `frontend/.gitignore` (new) and root `.gitignore` (new) — excludes `node_modules`,
    Android build output, `local.properties` (machine-specific SDK path), and `*.apk` itself,
    since this project now needs to be pushed to a real git repo for the CI workflow to run
    against.
  - `MOBILE_BUILD.md` (new): the complete phone-only path — why the APK alone isn't enough
    (frontend/backend/database all need real public hosting first, with exact guidance:
    Netlify for the frontend since `holloconnect.in` is already there, Render/Railway for the
    backend since it's a long-running Express process Netlify's model doesn't fit, a managed
    Postgres for the database), the exact GitHub Actions trigger steps, and a table of which
    features work with zero AI provider keys (auth, navigation, Projects, Settings, Memory
    CRUD, document upload/storage) versus which need at least one key to show real output
    (Chat, Image/Video/Voice AI, Search/Research, running an Agent or Automation) — framed
    around not fabricating AI results for features left unconfigured.
  - **Verification performed**: frontend `npx tsc --noEmit` — **0 errors**, reconfirmed after
    adding Capacitor (the new `capacitor.config.ts` is picked up by the existing
    `tsconfig.json` include pattern; confirmed no `.ts`/`.tsx` files exist anywhere under the
    generated `android/` folder to conflict with it). `package-lock.json` confirmed in sync
    with the three new dependencies (so `npm ci` in the CI workflow will succeed, not just
    `npm install`). GitHub Actions YAML confirmed to parse correctly via a real YAML parser.
  - **What this session could not verify, stated plainly rather than assumed**: an actual
    compiled `.apk` file (needs the cloud build — see above), the GitHub Actions workflow
    running end-to-end, and — as with every backend change across this whole project's
    sessions — this sandbox still has no live database or working Prisma client to test
    backend deployment behavior against directly. `MOBILE_BUILD.md`'s own "Honest limitations"
    section repeats this rather than letting it go unsaid.
- **Full security audit and hardening pass — see `SECURITY_AUDIT.md` for complete details**.
  Direct code inspection across the whole backend (and a lighter frontend pass) with fixes
  applied immediately as found, not deferred to a report. Zero destructive database changes;
  one additive-only migration for a validation-only fix (see below, unrelated to the earlier
  `reducedMotion`/`memoryEnabled` migration which is untouched). All previously-completed
  work — frontend redesign, Settings API, zero-error frontend `tsc`, streaming chat, memory,
  agents, automations, voice, admin — preserved; nothing in this pass touched UI/UX.
  - **Fixed (Critical): private files were fully unauthenticated.** `/uploads` was raw
    `express.static` — any generated image/video or uploaded document was accessible to
    anyone with the URL, forever, no auth check. Replaced with a signed, 1-hour-expiring URL
    scheme (`utils/signedFileUrl.ts`, `routes/uploads.routes.ts`) — chosen over a Bearer-
    header check specifically because `<img>`/`<video>` tags can't send custom headers, so a
    header-based fix would have broken every image/video in the app. Every response handing
    out a file URL (images, videos, video-source uploads) now signs it first.
  - **Fixed (High): path traversal in upload filename/extension handling** —
    `storage.service.ts`'s extension derivation trusted attacker-controlled input (filename/
    Content-Type) directly into a filesystem path; now strictly sanitized, plus a resolved-
    path containment check as a second layer, plus a third layer in the new uploads route.
  - **Fixed (High): no file-type enforcement on uploads** — added per-purpose multer
    mimetype allowlists (`middleware/upload.ts`: `uploadDocument`/`uploadImage`/`uploadAudio`,
    replacing one unrestricted shared instance) plus a hand-rolled magic-byte content check
    (`utils/fileSignature.ts`, no new dependency) so a relabeled file can't just claim a safe
    Content-Type to get past the allowlist.
  - **Fixed (High): zero rate limiting anywhere.** New `middleware/rateLimit.ts`: strict
    limiter on login/register, a shared limiter on every real AI-provider-calling endpoint
    (chat, search, research, image/video/voice, agent runs, automation run-now/webhook, and
    document upload/summarize/ask/translate/compare) keyed by user id when authenticated, a
    token-keyed limiter on the automation webhook specifically, and a global IP-keyed floor
    across all of `/api`. `TRUST_PROXY` env var (default off) gates whether `X-Forwarded-For`
    is trusted, so this can't be silently bypassed by IP spoofing on a deployment that isn't
    actually behind a real proxy.
  - **Fixed (High): missing security headers/CSP.** Backend: `helmet()` with a locked-down
    CSP appropriate for a JSON API (plus `crossOriginResourcePolicy: cross-origin`, confirmed
    necessary so the frontend's different origin can still load `/uploads` images/video —
    helmet's default would have broken that). Frontend: `next.config.js` now sends CSP,
    `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` — `script-src 'self'` only
    after confirming there's no inline-script/`dangerouslySetInnerHTML`/`eval` usage anywhere
    in the codebase to break.
  - **Fixed (Medium): two endpoints skipped zod validation** (`compareDocuments`,
    `assignChatToProject` — both used a bare `req.body as {...}` type assertion). Neither was
    actually an IDOR risk (both already had correct `userId`-scoped ownership checks
    downstream), but real input-validation gaps; added proper schemas.
  - **Fixed (Medium): two fields had no max-length cap** — chat message `content` (a direct
    per-request LLM-cost lever, previously unbounded) and both `password` fields (uncapped
    input costs real CPU to bcrypt-hash before its internal 72-byte truncation kicks in).
  - **Fixed (High, dependency): Next.js `14.2.5` had ~25 advisories including several
    critical** (cache poisoning, SSRF via middleware redirects, authorization bypass).
    Bumped to `14.2.35` — same 14.2.x line, patch-only, no expected breaking changes;
    resolved the critical-severity findings. Remaining high-severity advisories need
    `next@16` (a real major-version migration with confirmed breaking changes) — not
    attempted blindly without a live test environment; documented as the top follow-up item.
  - **Documented, not fixed: `xlsx` (SheetJS) has a high-severity advisory with no available
    npm-registry fix.** Narrowed (not eliminated) by the new mimetype+signature checks on
    document uploads, which now gate what can even reach the parser. Full details and
    recommended paths (SheetJS's own CDN build, or migrate to `exceljs`) in
    `SECURITY_AUDIT.md`.
  - **Documented, not changed: JWT in `localStorage`.** A real architectural tradeoff (XSS
    would expose the token) that the audit's own instructions said not to blindly change
    given the risk of breaking the app without a live environment to verify a cookie-based
    rework in. Mitigated instead by confirming the XSS surface is already minimal (no raw-
    HTML rendering path anywhere) and by the new CSP's `script-src 'self'`.
  - **Verified secure, no changes needed**: IDOR/cross-user data isolation (audited every
    controller's data-access calls — consistent, correct `userId`-scoped pattern already
    throughout), SQL/Prisma injection (no unsafe raw queries anywhere), SSRF (every outbound
    fetch targets a fixed provider or server-controlled URL; no LLM-controlled URL-fetch tool
    exists), admin privilege escalation (no client path to self-assign a role; admin routes
    consistently gated), XSS (no `dangerouslySetInnerHTML`/`eval` anywhere, react-markdown
    has no raw-HTML plugin installed), error handling (already never leaked stack
    traces/internals — pre-existing good practice, confirmed not changed), secrets (only
    `.env.example` exists anywhere, no hardcoded keys found), CORS (single configurable
    origin, no wildcard), future mobile-app compatibility (already Bearer-token auth, no
    cookie/CORS dependency a native client would hit).
  - **Small opportunistic fix found while verifying the upload-signing change**: video
    generation's `sourceImageUrl` validation required a fully-absolute URL
    (`z.string().url()`) but the real value has only ever been our own relative `/uploads/...`
    path — loosened to match the actual data shape, and made `signLocalUploadUrl()` strip any
    existing query string before re-signing so re-signing an already-signed URL can't produce
    a malformed double-signed one.
  - **Schema**: no new tables; `reducedMotion`/`memoryEnabled` migration from the previous
    session is untouched. No destructive changes, no data reset, nothing dropped.
  - **Verification honestly scoped**: frontend `npx tsc --noEmit` — **0 errors**, reconfirmed
    after every change and once more at the end. Backend `npx tsc --noEmit` — 47 pre-existing
    errors, unchanged in count/cause from before this session, **zero of them in any file
    this session touched** (confirmed by grepping the error output for every new/modified
    file's path). Both `npm audit` runs were real (against the live npm registry, reachable
    in this sandbox). What could **not** be verified here: actually running the backend
    against a live database (no Postgres/working Prisma client in this sandbox — the
    long-standing, previously-documented `binaries.prisma.sh` network restriction), a full
    `next build` (blocked by a `fonts.googleapis.com` network restriction, unrelated to any
    change made), and any actual runtime/penetration testing of the new signing, rate-
    limiting, or file-validation logic. All of that is called out explicitly, with what to
    run instead, in `SECURITY_AUDIT.md`'s "Tests NOT possible" and "Before this goes live"
    sections — **this pass does not claim the app is unhackable or production-ready**; it
    documents exactly what was fixed, what remains, and what still needs to be exercised
    against a real environment before launch.
- **Real Settings update API — Appearance, Voice, Memory, Privacy — plus the 3 pre-existing
  `tsc` fixes**: closes out the two remaining items from the previous entry's "recommended
  next pass" (the missing `PATCH`/`PUT` user-settings endpoint, and the pre-existing index-
  signature errors). First real backend feature work in this whole redesign thread — every
  prior session was frontend-only by design; this one required schema/migration/controller
  changes too, done carefully within the "preserve all existing functionality, additive-only
  schema changes" rule that's applied since session 1.
  - **The 3 pre-existing `tsc` errors, fixed**: `lib/admin.ts`'s `ListUsersFilters` and
    `AdminMemoryFilters`, and `lib/memory.ts`'s `ListMemoriesFilters`, each gained an index
    signature (`[key: string]: string | number | boolean | undefined`) so they structurally
    satisfy `buildQuery`'s `Record<string, ...>` parameter type. This doesn't loosen what
    those interfaces actually allow call sites to set — every field they already declared
    was already that value shape — it just satisfies the compiler's assignability check
    that was previously missing. Verified: full frontend `npx tsc --noEmit` now reports
    **zero errors**, down from these 3 (first time that's been true all thread).
  - **Schema** (`backend/prisma/schema.prisma`): added `reducedMotion Boolean @default(false)`
    and `memoryEnabled Boolean @default(true)` to `User`. Both `NOT NULL DEFAULT`, so purely
    additive — safe against an existing database with rows already in `users`, same
    convention as the three prior hand-written migrations. New migration:
    `backend/prisma/migrations/20260705000000_add_user_settings/migration.sql`.
  - **Backend — `PATCH /api/auth/me`** (`auth.controller.ts`'s new `updateMe`,
    `validation.ts`'s new `updateProfileSchema`): updates `name`, `reducedMotion`, and/or
    `memoryEnabled` (all optional; rejects an empty body). `GET /api/auth/me` now returns
    both new fields too (extracted the select into a shared `ME_SELECT` constant so `me` and
    `updateMe` can't drift out of sync). Voice deliberately was **not** duplicated here — it
    already had its own real, working `PATCH /api/voice/settings`
    (`voice.controller.ts`/`voice.routes.ts`, pre-existing from earlier work, validates
    against the live provider voice list) — the Settings page now just surfaces that existing
    endpoint via the existing `VoiceSettingsPanel` component instead of rebuilding it.
  - **Backend — `DELETE /api/auth/me`** (`auth.controller.ts`'s new `deleteMe`): the Privacy
    section's account-deletion action. Confirmed every user-owned relation in
    `schema.prisma` is `onDelete: Cascade` before adding this, so one `prisma.user.delete()`
    call is genuinely a complete, permanent data wipe (chats, memories, projects, generated
    images/videos, documents, automations, agents, search/research history) — not a
    soft-delete or partial cleanup that would leave orphaned rows.
  - **Backend — Memory setting is actually enforced, not just stored**: added
    `memory.service.ts`'s `isMemoryEnabled(userId)` and gated the three *automatic, passive*
    memory touchpoints behind it — Chat's per-turn recall + fact-extraction + short-term-
    summary refresh (`chat.controller.ts`), an Agent run's system-prompt memory context
    (`agent.service.ts`), and an Automation run's recall + fact-extraction
    (`automationEngine.service.ts`). Deliberately did **not** gate: the Memory page's own
    browse/search/create/delete (a user managing their own existing memories should always
    work, on or off), or the `recall_memory`/`save_memory` agent tools (an explicit
    capability the user equipped a specific agent with by choosing that tool — a different
    kind of "automatic" than passive background recall). This distinction is documented
    directly on `isMemoryEnabled`'s doc comment for whoever touches this next.
  - **Frontend — Appearance (Reduce Motion), real and app-wide-ish**: new
    `components/providers/MotionPreferenceProvider.tsx` (wrapped around the whole app in
    `app/layout.tsx`) exposes a saved-override-or-OS-setting boolean via
    `useMotionPreference()`. `components/branding/HolloConnectLogo.tsx` — the single shared
    brand-mark component already used everywhere (sidebar, chat thinking indicator, auth
    screens, loading states) — now reads this instead of framer-motion's raw
    `useReducedMotion()`. `AppShell.tsx` hydrates the override from the authenticated user's
    saved value on every authenticated page. Honest scope note: this governs
    `HolloConnectLogo`'s own animations specifically, not every `motion.div` in the app (page
    transitions, hover states, etc. are untouched) — the Settings copy says exactly that
    rather than overclaiming "reduces all motion everywhere."
  - **Frontend — Settings page** (`app/settings/page.tsx`): new **Appearance** section (real
    `Switch` toggle, optimistic update + revert-on-failure, wired to
    `updateProfile({reducedMotion})`), new **Voice** section (the existing
    `VoiceSettingsPanel` embedded directly — already fully functional, just not previously
    surfaced here), extended **Memory & Privacy** section (real `Switch` for "use memory
    automatically", same optimistic pattern, wired to `updateProfile({memoryEnabled})`), and
    a new **Privacy** section with a two-step account-deletion flow (type-your-email-to-
    confirm, matching the stakes of a genuinely irreversible action) wired to the new
    `deleteAccount()`. New `lib/settings.ts` (`updateProfile`, `deleteAccount`) and a new
    reusable `Switch` primitive added to `components/ui/primitives.tsx` (animated, controlled,
    real save-state — not decorative) since Settings was the first place a real persisted
    toggle was needed. `lib/auth.ts`'s `AuthUser` extended with optional `reducedMotion`/
    `memoryEnabled` (populated by `GET /api/auth/me`, absent from register/login's response).
  - **Important environment-limitation finding, not a new bug**: running the backend's own
    `npx tsc --noEmit` for the first time this thread (every prior session only verified the
    frontend) revealed the installed `.prisma/client` in this sandbox is Prisma's placeholder
    stub (`export declare const PrismaClient: any`, confirmed by inspecting
    `node_modules/.prisma/client/index.d.ts` directly) — `npx prisma generate` /
    `npx prisma validate` both fail here because `binaries.prisma.sh` (where Prisma's
    schema-engine/query-engine binaries are hosted) isn't in this sandbox's network
    allowlist. This means the backend has **never** had a real generated client in this
    environment, in any session — not something introduced now. Practically: `tsc` on the
    backend currently reports ~40 errors across nearly every Prisma-touching file (missing
    `User`/`Chat`/`Agent`/`Memory`/etc. exports, missing `Prisma.InputJsonValue`/`JsonNull`/
    `*WhereInput` types), none of which reference anything added this session by name — every
    one is the same root cause. Verified instead by: careful manual review of the new/changed
    backend files against already-proven-working sibling code (`updateMe`/`deleteMe` mirror
    `voice.controller.ts`'s existing `updateVoiceSettings` pattern field-for-field), plus the
    usual brace/paren/import-export balance checks. **Real verification of the backend
    requires running `npx prisma generate && npx prisma migrate deploy && npx tsc --noEmit`
    in an environment with normal network access** (any real machine or CI) — the existing
    `README.md` already instructs running `prisma migrate dev` as step 1 of setup, so this
    isn't an extra step beyond what a fresh clone already needs.
  - Frontend `node_modules` reinstalled for verification and deleted again afterward (as
    always); backend `node_modules` was also installed once this session (to run `npx tsc`
    and confirm the above), then deleted the same way — neither is part of the delivered ZIP.
- **Chat — premium AI thinking/generating indicator**: a `HolloConnectLogo variant="thinking"`
  indicator (glow, whisper of rotation, 5-point sequential accent ring — see
  `components/branding/HolloConnectLogo.tsx`'s own doc comment) already existed and was
  already wired into `MessageBubble.tsx` as the fallback shown while an assistant message's
  `content` is still empty; `hooks/useChat.ts`'s `sendMessage` already appends that empty-
  content assistant message immediately (before the first streamed token), so it was already
  rendering before the response appears for the normal Chat flow. This pass: (a) verified
  that end-to-end, (b) closed the one real gap — the **AI Search mode inside Chat**
  (`webSearchEnabled` in `ChatWindow.tsx`) used a plain gray text line ("Searching the
  web…") instead, since that flow doesn't stream and never appends a placeholder message —
  and (c) polished the indicator itself to feel more premium. No backend/API/Prisma/auth/
  routing changes; streaming itself (SSE token-by-token append in `useChat.ts`) is
  byte-for-byte unchanged.
  - **New `ThinkingIndicator` component**, extracted from the inline fallback and exported
    from `components/chat/MessageBubble.tsx` (`export function ThinkingIndicator`) so both
    the normal streaming bubble and the AI Search loading bubble share one implementation
    instead of two visual treatments. Adds a "Thinking…" (or a custom label — AI Search
    passes "Searching the web") text that fades in only after ~900ms via a `setTimeout`,
    using the existing `shimmer` background-position keyframe (already in
    `tailwind.config.ts` for skeletons — reused here on `bg-clip-text`, not a new keyframe)
    for a subtle moving highlight across the label. The delay is deliberate: most replies
    start streaming within a few hundred ms, and a label that flashes in and is immediately
    replaced by real content reads as jittery, not premium — it only appears when there's an
    actual wait worth acknowledging.
  - **Smooth crossfade into content**: `MessageBubble`'s bubble body now wraps the thinking
    indicator / rendered `Markdown` in `AnimatePresence mode="wait"`, so the swap from
    "thinking" to "first content" is a 200–250ms fade instead of an instant, jarring
    replacement. This is purely the crossfade — the underlying logic (render `Markdown` once
    `content` is non-empty) is unchanged, so token-by-token streaming updates still just
    re-render the same `content` motion.div in place; nothing about streaming performance
    changes.
  - **AI Search's Chat-mode loading state** (`components/chat/ChatWindow.tsx`) now renders a
    proper transient assistant bubble — same avatar, same `glass` bubble shell as a real
    message — containing `<ThinkingIndicator label="Searching the web" />`, replacing the old
    plain text line. This bubble isn't added to `searchMessages` state; it's purely a
    `isBusy && webSearchEnabled` conditional render, so it disappears the instant the real
    answer is appended, same lifecycle as before.
  - The reference video mentioned in the request wasn't attached to the conversation, so this
    was built from the existing `HolloConnectLogo` "thinking" variant's own established
    animation language (glow, rotation, sequential accent ring) plus the delayed-label +
    crossfade polish described above, rather than matching an unseen reference frame-by-frame.
  - **Verification performed this pass**: brace/paren/bracket balance and import-vs-export
    checks on the 2 touched files, confirmed `MessageBubble`'s only consumer is `ChatWindow`
    (no other call site needed updating for the new named export), then a full
    `npm install` + `npx tsc --noEmit` across the whole frontend. Result: zero new errors;
    the same 3 pre-existing `lib/admin.ts`/`lib/memory.ts` index-signature errors noted in
    every prior entry are still there, still untouched. `node_modules` reinstalled for
    verification and deleted again afterward — not part of the delivered ZIP.
- **Frontend UI Redesign — Chat welcome/composer experience (spec section 4, the last
  remaining item)**: closes out the one gap flagged at the end of the previous entry. Zero
  backend/API/Prisma/auth/routing/business-logic changes, same as every redesign pass before
  it. Scope was specifically `components/chat/WelcomeScreen.tsx` plus the small prop-plumbing
  needed to reach it — no other chat behavior (streaming, markdown, attachments, model
  selector, etc., already solid from earlier work) was touched.
  - **Dynamic greeting**: replaced the static "What can I help with today?" with a
    time-of-day greeting ("Good morning" / "Good afternoon" / "Good evening" / "Still up?"
    for the small hours) computed from `new Date().getHours()` client-side, plus the user's
    first name when `AuthUser.name` is set. `user` is now threaded through
    `app/chat/page.tsx` → `ChatWindow` (`components/chat/ChatWindow.tsx`, new optional `user`
    prop) → `WelcomeScreen` (new optional `user` prop) — all optional/backward-compatible, so
    nothing breaks if a future caller doesn't pass it.
  - **Smart starter prompts, not four static cards**: the old fixed 4-card grid is now a
    12-prompt pool (loosely grouped by time of day — morning/afternoon/evening/anytime, real
    starter prompts each, not fabricated) from which 4 are chosen with a `useMemo`-seeded
    Fisher-Yates shuffle once per mount, weighted toward the current time-of-day group. Same
    interaction as before (click → fills composer via `onSelectPrompt`/`handleSend`) — just
    no longer identical every visit.
  - **Recent activity, for real**: reuses the existing `hooks/useChatList.ts` (already built
    for the sidebar/search-modal work) to show up to 3 real recent conversations as
    "Continue where you left off" pills beneath the suggestions — only rendered once loaded
    and only if there's real history, never a placeholder. Clicking one navigates to
    `/chat?id=...`, same as the sidebar's own recent-chats list.
  - **Decoration kept minimal** per the spec's explicit note not to over-decorate this screen:
    the existing `HolloConnectLogo` "floating" variant is kept (just slightly smaller, 56px
    vs 64px, to make room for the recent-chats row without the page feeling taller/busier) —
    no new particle/animation layer was added on top of it.
  - **Verification performed this pass**: brace/paren/bracket balance and import-vs-export
    checks on the 3 touched files, a custom unused-import scan, then a full
    `npm install` + `npx tsc --noEmit` across the whole frontend. Result: zero new errors;
    the same 3 pre-existing `lib/admin.ts`/`lib/memory.ts` index-signature errors noted in
    every prior entry are still there, still untouched. `node_modules` reinstalled for
    verification and deleted again afterward — not part of the delivered ZIP.
  - **This closes out the full original redesign spec.** Every section 1–23 item has now had
    at least one real pass, with any spec ask the backend genuinely can't support flagged
    explicitly (not faked) in this log and in "Immediate next module" below.
- **Frontend UI Redesign — Phases B, C, D (Image AI, Video AI, Library, Voice AI, Document
  AI, AI Search, Deep Research, AI Agents, Automations, Projects, Memory, Settings)**:
  continuation session working from the prior "Phase 2, partial" state below — that entry's
  scope (sidebar/nav, chat-history architecture, auth split-screen) is unchanged and not
  revisited. Zero backend/API/Prisma/auth/routing/business-logic changes this pass either;
  every "sample"/"template"/"inspiration" element added below is either (a) a static prompt
  string that fills the composer on click and generates for real through the existing
  endpoint, or (b) a real read of the user's own data (images/videos/documents/memories) —
  nothing fabricated is presented as generation history, execution history, or saved data.
  Where the spec asked for a capability the backend doesn't have (reference-image upload for
  Image AI, reference-*video* upload for Video AI, a "Compare Documents" action, persisted
  Appearance/Memory-enable/Voice settings), it was **not** faked — see the per-module notes
  below for what was deliberately left out and why.
  - **Image AI** (`app/images/page.tsx`, `components/images/ImagePromptForm.tsx`): composer's
    prompt is now controlled from the page (`prompt`/`onPromptChange` props added to the
    form, backward-compatible — falls back to internal state if unset) so inspiration cards
    can fill it. New `lib/inspiration.ts` + `components/studio/InspirationGrid.tsx`: 9 style
    categories (Portrait, Product, Cinematic, Anime, Illustration, Architecture, Logo
    Concepts, Fantasy, Photography) as abstract gradient tiles with an example prompt each —
    deliberately not photographs, to avoid both copyright risk (hotlinking/reproducing
    third-party images) and the false impression they're generated output. Clicking one fills
    the composer; it does not auto-generate. "Your Creations" (real gallery, existing
    `ImageCard`) is now visually separated from "Inspiration", which stays visible (smaller)
    even once the user has real creations, per spec section 7. Old giant empty-state box
    removed. **Not added**: reference-image upload — `backend/src/controllers/image.controller.ts`
    only accepts `{ prompt, size }` (DALL·E 3, no image input), so no UI implies otherwise.
  - **Video AI** (`app/videos/page.tsx`, `components/videos/VideoPromptForm.tsx`): same
    controlled-prompt + inspiration pattern (6 motion templates: Cinematic Pan, Product Spin,
    Abstract Motion, Macro Close-up, Urban Motion, Fantasy Scene). Backend *does* support
    image-to-video (`POST /api/videos` accepts `sourceImageUrl` after
    `uploadVideoSource`), and that was already wired from the prior session — this pass added
    real drag-and-drop onto the composer (`onDrop`/`onDragOver`/`onDragLeave` handlers, a
    `dragActive` visual state) on top of the existing click-to-upload. **Not added**:
    reference-*video* upload or a duration/aspect-ratio selector — `videogen.service.ts` has
    no such parameters, so per spec section 6 no UI was built implying they work.
  - **Unified Library** (`app/library/page.tsx`, new route + new sidebar entry in
    `AppShell.tsx`'s `PRIMARY_ITEMS`): aggregates real Images, Videos, and Documents
    (`listImages`/`listVideos`/`listDocuments`, all pre-existing endpoints) into one
    recency-sorted feed with All/Images/Videos/Documents filter tabs. Reuses the existing
    `ImageCard`/`VideoCard`; added a small new `DocumentLibraryCard` for the third type.
    Empty state links to the three creation tools rather than showing fake content.
  - **Voice AI** (`app/voice/page.tsx`, new `components/voice/VoiceOrb.tsx`): replaced the
    small icon-button dictation control with a large central animated orb (idle / listening /
    transcribing / speaking states, concentric pulse rings, CSS/framer-motion only — no audio
    waveform analysis was added since that would need Web Audio API frequency-data wiring not
    present anywhere in the codebase, flagged below as a real gap rather than faked with a
    generic animation). Existing `useAudioRecorder`/`transcribeAudio`/`useVoicePlayback`
    logic is unchanged, just re-wired to the orb instead of the old `MicButton` (which is
    untouched and still used as-is in `ChatInput.tsx`). Added a "Try it out" row of 4 example
    phrases (Daily briefing, Reading assistant, Meeting notes, Language practice) that call
    the real `speak()` TTS function when clicked — not pre-recorded fake preview clips, since
    none exist as assets. **Not added**: language/accent category filtering — `VoiceSettingsPanel`
    already lists whatever voices `lib/voice.ts` returns; no per-language grouping exists in
    that data to filter by.
  - **Document AI** (`app/documents/page.tsx`): added a 3-card "what you can do" row
    (Summarize, Ask Questions, Translate) shown only in the empty state — matched exactly to
    the three real endpoints in `lib/documents.ts` (`summarizeDocument`, `askDocument`,
    `translateDocument`). Deliberately did **not** include "Extract" or "Compare Documents"
    from the original spec wording since neither has a backend endpoint. Upload/list/delete
    (`DocumentUploader`, `DocumentListItem`) were already solid from prior work (drag-and-drop
    already existed) and are unchanged.
  - **AI Search** (`app/search/page.tsx`) and **Deep Research** (`app/research/page.tsx`):
    both got a "Try asking" / "Suggested topics" row of 4 chips, shown only when the user has
    no history yet. Clicking one runs a real search/research call immediately (not just fills
    the box) via the existing `runSearch`/`runResearch` functions — same pattern as a
    "trending searches" chip in a real product. No other structural changes; both pages'
    core flow (search bar → result page, topic → report page) was already working.
  - **AI Agents** (`app/agents/page.tsx`, `components/agents/CreateAgentForm.tsx`): form now
    accepts an optional `template` prop (`AgentTemplate`) and repopulates name/description/
    instructions/tools via a `useEffect` keyed on that prop, so template cards above the form
    can prefill it without a bigger state-lifting refactor. 5 templates — Research Agent,
    Document Analyst, Content Agent, Automation Manager, Custom (blank) — built using **only**
    tool names the backend actually registers (`web_search`, `list_documents`, `document_qa`,
    `list_automations`, `run_automation`, `recall_memory`, `save_memory`, confirmed against
    `agentTools.service.ts`). The original spec wording included a "Coding Agent" — not
    included, since there's no code-execution tool anywhere in the agent tool registry and
    adding that template would imply a capability that doesn't exist.
  - **Automations** (`app/automations/page.tsx`, `components/automations/CreateAutomationForm.tsx`):
    same template-prefill pattern. 5 templates — Daily Briefing, Research Monitoring,
    Scheduled Report, Content Workflow, Custom — using real `AutomationType` values
    (`SCHEDULED`/`ONE_TIME`) and valid cron expressions for the scheduled ones.
  - **Projects** (`app/projects/page.tsx`): `createProject(name)` is the entire backend
    surface (no description/template/color fields exist), so "templates" here are 4 chips
    (Product Launch, Research Notes, Client Work, Personal Journal) that just create a
    real project with that name on click — kept intentionally small rather than implying
    a richer template system the backend can't back up.
  - **Memory** (`app/memory/page.tsx`): added a one-line explanation of what gets remembered
    directly above the create form (spec section 14's "clear explanation" requirement) — the
    page's filtering, pinning, and pagination were already solid from earlier work and
    untouched.
  - **Settings** (`app/settings/page.tsx`): reorganized the previously-unlabeled stack of 3
    cards into explicit sections (Account, AI Models, Memory & Data, Session) with small
    uppercase section labels, per spec section 15. Added a real "Memory & Data" section that
    fetches the user's actual memory count (`listMemories({ pageSize: 1 })`, reads `total`)
    and links to `/memory`. **Deliberately did not add**: Appearance, Personalization, Voice,
    or Data-export/API-key sections — `auth.routes.ts` only exposes `register`/`login`/`me`,
    there is no `PATCH`/`PUT` user-settings endpoint anywhere in the backend, so any toggle
    in those sections would have nothing to persist to and would silently do nothing on
    reload. Flagged in "Immediate next module" below as backend work needed before those
    sections can be built for real.
  - **Verification performed this pass**: same methodology as the previous entry — brace/
    paren/bracket balance and import-vs-export cross-check on every new/edited file, a custom
    unused-import scan, then `npm install` + `npx tsc --noEmit` across the whole frontend
    twice (once after Image/Video/Library, once after everything else). Both runs: zero new
    errors; the same 3 pre-existing `lib/admin.ts`/`lib/memory.ts` index-signature errors
    noted in the previous entry are still there, still untouched by this session.
    `node_modules` reinstalled for verification and deleted again afterward.
- **Frontend UI Redesign — Phase 2, partial (sidebar/nav architecture, chat-history
  architecture, auth split-screen)**: continuation session working from the uploaded
  Phase-1 state. Zero backend/API/Prisma/auth/routing/business-logic changes — same
  discipline as Phase 1. Scope covered vs. the full redesign spec's own Phase A
  (global design system, sidebar/nav, login/signup, chat + chat-history architecture):
  sidebar/nav and chat-history architecture are done; login/signup got the cinematic
  visual panel; the broader chat-experience polish (composer, prompt suggestions, etc.
  beyond what already existed) was **not** touched this pass. Phases B–D (Image AI,
  Video AI, Library, Voice AI, Document AI, Agents, Automations, Projects, Memory,
  Settings redesigns) are **not started**.
  - **Sidebar/nav simplification** (`components/layout/AppShell.tsx`, rewritten): the
    old flat 13-item `NAV_ITEMS` list is gone. New structure: `PRIMARY_ITEMS` (Home,
    Projects, Automations) always visible, `MORE_ITEMS` (AI Search, Deep Research,
    Image AI, Video AI, Voice AI, Document AI, AI Agents, Memory, Settings) tucked
    behind a collapsible "More" section that auto-expands if the active route is inside
    it. No module was removed — every route from before still exists and is reachable,
    just not all surfaced at once. Added: a New Chat button and a Search Chats button
    at the top of the sidebar (bg-accent-gradient New Chat button, ⌘K hint on Search),
    a desktop-only collapse-to-icon-rail toggle (persisted in `localStorage`, native
    `title` attributes as tooltips when collapsed — no new tooltip dependency), and a
    global `Cmd/Ctrl+K` shortcut that opens chat search from anywhere in the app.
    Exports a new `useSidebar()` hook (React context) so nested pages — currently just
    the Chat page — can open the search modal, report which chat is active for
    highlighting, and trigger a sidebar refresh, without prop-drilling through every
    route.
  - **Removed the permanent secondary chat-history column** (redesign spec section 3):
    `components/chat/ConversationSidebar.tsx` deleted; its logic (fetch, session-local
    pin/rename overrides — no backend rename/pin endpoint exists for Chat, same
    documented limitation as before, just centralized instead of duplicated) moved into
    a new shared hook `hooks/useChatList.ts`. Two new consumers of that hook:
    `components/layout/SidebarChatList.tsx` (compact recent/pinned list embedded
    directly in the main sidebar, top 6 items, "See all conversations…" opens search)
    and `components/layout/ChatSearchModal.tsx` (full `Cmd/Ctrl+K` command-palette
    overlay: search box, date-grouped results, pin/rename/delete, keyboard `Esc` to
    close). `ChatWindow.tsx` no longer renders a second column at all — the message
    area now gets the sidebar's former width back. Its header keeps small Search/New
    Chat icon buttons wired to the same context instead of local column-toggle state.
  - **Auth split-screen redesign** (spec section 1): new
    `components/auth/AuthCinematicPanel.tsx` — a CSS/SVG-only "living AI core" visual
    (slowly rotating ring of glowing nodes connected by light-lines around a pulsing
    core, over the existing `bg-hollo-gradient`/`bg-hollo-mesh`). Deliberately no video,
    no WebGL, no canvas render loop, so it stays cheap on integrated graphics per the
    performance rule; fully respects `prefers-reduced-motion` via
    `useReducedMotion()`, falling back to a static (non-rotating, non-pulsing) version
    of the same visual rather than hiding it. `app/(auth)/layout.tsx` now splits into
    this panel (desktop/tablet, `lg:` and up only — dropped entirely on mobile rather
    than shrunk, per spec) and the existing form panel, which is otherwise unchanged
    (`AuthLogoHero`, `GlassCard` forms in `login/page.tsx` and `register/page.tsx` were
    not touched — they still work exactly as before, just inside the new layout).
    Added a `node-pulse` keyframe/animation to `tailwind.config.ts` for the orbiting
    nodes.
  - **Verification performed this pass** (no build tooling existed in the uploaded ZIP,
    `node_modules` excluded as instructed): brace/paren/bracket balance and
    import-vs-export cross-check on every new/edited file; then `npm install` +
    `npx tsc --noEmit` across the whole frontend as a real compiler check (not just the
    manual checks). Result: the two type errors that existed in the new
    `AppShell.tsx` (a too-narrow `Icon` prop type on the new shared `NavLink` — fixed by
    typing it as `LucideIcon` instead of a hand-rolled interface) are fixed. Three
    remaining `tsc` errors are pre-existing and outside this session's changes:
    `lib/admin.ts:138`, `lib/admin.ts:244`, `lib/memory.ts:77` — all the same shape
    (`ListUsersFilters`/`AdminMemoryFilters`/`ListMemoriesFilters` passed to a helper
    typed as `Record<string, string|number|boolean|undefined>`, missing an index
    signature). None of those three files were touched this session; not fixed here to
    stay in scope, flagged for whoever picks up Phase B onward.
  - **Not done this pass, explicitly**: Image AI, Video AI, unified Library/Creations,
    Voice AI, Document AI, AI Search, Deep Research, AI Agents, Automations, Projects,
    Memory, and Settings redesigns (spec sections 5–15) are all still in their Phase-1
    state (global theme applied, no per-module redesign). The chat *composer/message*
    experience itself (spec section 4 — welcome state, prompt suggestions, etc. beyond
    what Phase 1 already styled) was not revisited. `node_modules` was reinstalled for
    verification and deleted again afterward — not part of the delivered ZIP.
- **Frontend UI Redesign — Phase 1 (global theme)**: pure presentation pass, zero backend/
  API/Prisma/auth/routing/business-logic changes, per explicit instruction. Added
  `framer-motion` and `lucide-react` as new frontend dependencies. Redesigned only the
  global/shared surface so every page inherits it automatically without being touched
  individually: `tailwind.config.ts` (richer color system, gradients, keyframes),
  `globals.css` (typography, refined glass surface, skeleton shimmer, gradient-text
  utility), `app/layout.tsx` (Inter via `next/font/google`), `components/ui/primitives.tsx`
  (Button/Input/GlassCard — same exported names and prop shapes as before, only internal
  styling + Framer Motion micro-interactions added; verified no page anywhere passes a
  `ref` to these, which would have been the one thing that could break under the motion-
  wrapping change), `components/ui/StatCard.tsx` (added an *optional* `icon` prop — every
  existing call site without one still works unchanged), `components/layout/AppShell.tsx`
  (icons via lucide-react, animated active-nav indicator via `layoutId`, and a genuinely new
  mobile drawer — the sidebar was `hidden md:flex` with **no mobile navigation fallback at
  all** before this pass, a real responsiveness gap directly in scope since "Responsive
  design" was an explicit Phase 1 goal), and three pages that are themselves shared surface
  rather than feature pages: Dashboard, Login, Register (same data-fetching/auth logic,
  skeleton loading added to Dashboard's stat cards while `summary` is still loading).
  Verified: brace/paren balance on every touched file, and confirmed `StatCard` (this
  pass's component) isn't confused with the separate, untouched `AdminStatCard` used
  throughout the Admin Panel. Stopping after this pass per instruction — Phase 2 (per-module
  page redesigns) is pending explicit approval.
- **Admin Panel Part 3 pass**: closed the remaining backend gaps from Part 2 — new schema
  (`Agent.enabled`, `Setting` model, migration `20260704100000_add_admin_panel_part3`), new
  admin endpoints (platform-wide memories/agents/conversations/documents, OCR via a documents
  filter rather than a new model, real role management, real settings persistence), and
  rewrote all 6 previously-shell frontend pages plus Settings and Users (role selector) to use
  them. Closed 4 of the Dashboard's honest "—" gaps with genuinely computed metrics (OCR
  count, 30-day agent activity, memory stats, `os.loadavg()`-based CPU) rather than inventing
  numbers. Left Product Scan Analytics untouched — filling it for real means building the
  Smart Product Scan module itself, explicitly out of scope. Caught a real bug during
  verification: a stray fullwidth Unicode `？` in `lib/admin.ts` (invalid TypeScript) found by
  scanning for non-ASCII punctuation, not by chance. See the "Module 22" section above for
  full detail.
- **Admin Panel Part 2 pass**: built the full frontend (`/admin/*`, 12 pages + `AdminShell`,
  `useRequireAdmin`, `lib/admin.ts`) against Part 1's existing backend, per explicit
  frontend-only scope — zero backend files touched. Added `recharts` as a new frontend
  dependency (AI Usage charts). 6 of 12 pages (Memory, AI Agents, Conversations, Documents,
  OCR Jobs — plus Product Scan Analytics, backend-less by your own explicit instruction) are
  real component shells rather than fully functional, because they'd need admin-scoped
  cross-user endpoints Part 1 never built (every existing content API is deliberately
  user-scoped) — each states plainly what's missing rather than faking data or quietly
  showing the admin's own personal records mislabeled as platform-wide. See the "Module 22"
  section above for the full real-vs-shell breakdown, page by page. Every new file
  cross-checked import-by-import against actual exports and passed a brace/paren balance
  sweep (19 files) before packaging.
- **Admin Panel Part 1 pass**: built the backend foundation only, per explicit scope in the
  prompt. Reused existing infrastructure rather than rebuilding it — `requireAdmin` middleware
  and `role` on the JWT payload already existed (from the original auth scaffold) but were
  never wired into any route until now. New: `User.isActive`, `AuditLog`, `ErrorLog` (schema +
  hand-written migration), `admin.service.ts`, `errorLog.service.ts`, `admin.controller.ts`,
  `admin.routes.ts`. Minimal, necessary touches to 3 existing files: `auth.controller.ts`
  (login now rejects disabled accounts), `middleware/errorHandler.ts` (writes real 5xx errors
  to `ErrorLog`, fire-and-forget), `automationScheduler.service.ts` (added a
  `getSchedulerStatus()` getter for the health endpoint). See the "Module 22 — Admin Panel:
  Part 1 of 3" section above for full detail, including two real safety checks (can't disable/
  delete your own account, can't delete the last admin) and one honestly-documented limitation
  (disabling doesn't revoke already-issued JWTs — this app has no token revocation mechanism
  at all, a bigger change than this pass's scope). Did NOT build any frontend pages and did
  NOT start Part 2, per explicit scope for this pass. Every new/edited file was cross-checked
  import-by-import against actual exports and passed a brace/paren/bracket balance sweep before
  packaging.
- **OCR pass**: refactored 4 controllers (chat, search, research, document) off duplicated
  inline `user?.defaultModel ?? "claude-sonnet"` logic onto `resolveUserModel()`. No behavior
  change, pure deduplication — verified each call site still resolves the same way.
- **AI Agents pass**: this session was asked to continue "the AI Agents module" and to reuse
  existing Memory infrastructure. On inspection, neither matched the repo's actual state as of
  the last handoff: this file's own "Immediate next module" note (below, now superseded) said
  Workflow Builder was next, and Memory (#15) had never been started — there was no Memory
  model, service, or routes to reuse. Rather than silently reordering the roadmap or inventing
  a fake "Memory module" to point to, AI Agents was built as requested (explicit user
  instruction to work on it now takes priority over this file's prior ordering), and its memory
  need was met with a small agent-scoped store built for this module (see #14 above and the
  architecture note on `agent.service.ts`) rather than a real shared Memory module, since that
  doesn't exist yet. Workflow Builder (#13) is unchanged and still not started.
- **Memory Part 1 pass**: built the backend foundation only, per explicit scope in the prompt
  (Prisma model/migration, service, controller, routes, validation, CRUD + search + tag/category
  helpers + the retrieval scoring service). Deliberately did NOT touch Chat, AI Agents, or the
  frontend, and did NOT start Workflow Builder, per the same prompt's explicit exclusions. See
  the "Module 15 — Memory: Part 1 of 3" section above for the full breakdown. No other module's
  files were modified. Migration SQL was hand-written (see that section) since there's no live
  DB/network access in this environment to run `prisma migrate dev` — verify it applies cleanly
  before relying on it.
- **Memory Part 2 pass**: wired the Part 1 service into Chat, AI Agents, and Automation (see the
  rewritten Module 15 section above for exact behavior). Removed AI Agents' temporary
  `Agent.memory`-based tool implementation entirely — `recall_memory`/`save_memory` now call
  `memory.service.ts` exclusively; `Agent.memory` itself stays in the schema (unused, marked
  deprecated in a comment) rather than forcing a breaking column-drop migration for no
  functional benefit. Two small, additive extensions were needed in `memory.service.ts` to
  support per-chat/per-agent/per-automation scoping (`source` filter on list/search/retrieve) —
  backward compatible, no existing caller behavior changed. No schema migration needed this
  pass (comment-only schema.prisma changes). Did NOT build the frontend Memory page (Part 3)
  and did NOT start Workflow Builder, per explicit scope for this pass. Caught and fixed two
  real bugs during verification before packaging: an orphaned JSDoc comment left over from an
  earlier insertion (syntax error), and an off-by-one in the short-term-summary trigger
  (`history` already includes the just-sent message, so `+1` was double-counting).
- **Memory Part 3 pass**: built the frontend Memory browser page (`/memory`) — search, filter
  (type/category/tag/pinned-only), manual create, inline edit, pin/unpin, delete, real
  pagination against the backend's `{total, page, pageSize}`. Filter categories/tags are
  fetched from the backend rather than hardcoded, so they reflect what actually exists. This
  completes Memory (#15) end to end. Did NOT start Knowledge Base, Workflow Builder, Admin
  Panel, Testing, or Deployment, per explicit scope for this pass.

## Module 22 — Admin Panel: complete (Parts 1-3)

### Part 3 — closing the remaining backend gaps (this pass)

Every page that was an honest UI-shell in Part 2 is now fully functional against a real
endpoint, except Product Scan Analytics (explained below). Nothing here is faked — where a
metric still isn't tracked, it says so rather than inventing a number.

**New schema** (migration `20260704100000_add_admin_panel_part3`, hand-written per the
established convention — no live DB in this environment):
- `Agent.enabled` (`Boolean @default(true)`) — real enable/disable, enforced in
  `agent.controller.ts`'s `startAgentRun` (returns 403 if disabled), not just a UI flag.
- `Setting` model — plain key-value table (`key`, `value: Json`, `updatedAt`). Platform
  settings are stored as one JSON blob under key `"platform"` (see `admin.service.ts`'s
  `getSettings`/`updateSettings`), so adding a new setting field later is a code change, not
  a migration.

**New admin endpoints** (`admin.routes.ts`, all behind `requireAuth + requireAdmin`):
- `GET/PATCH/DELETE /api/admin/memories` — platform-wide memory CRUD. Added
  `adminListMemories`/`adminUpdateMemory`/`adminDeleteMemory` to `memory.service.ts` (not
  `admin.service.ts`) to keep that file the single owner of the `memories` table, per the
  existing "one writer" convention. No userId scoping; includes the owning user's email.
- `GET /api/admin/agents` + `PATCH /api/admin/agents/:id/status` — platform-wide agent list
  (owner, model, tool list, run count) and the new `enabled` toggle.
- `GET /api/admin/conversations` — platform-wide chat list, **metadata only** (title, model,
  message count, owner, timestamps) — deliberately does NOT expose message content. Reading
  another user's actual conversation text is a real privacy line held on purpose; a future
  full-transcript admin view should be its own explicit, audited action, not bundled in here.
- `GET/DELETE /api/admin/documents` — platform-wide document list + delete (reuses
  `storage.service.ts`'s `deleteFile` so the underlying upload is actually removed, not just
  the DB row).
- OCR Jobs has no separate route — it's `GET /api/admin/documents?onlyOcr=true`, since OCR
  still isn't a distinct record type (an OCR'd image is just a `Document` row with
  `mimeType` starting `image/`; see `documentExtract.service.ts`). Adding a real `OcrJob`
  model was considered and deliberately skipped — the mimetype filter already answers "which
  documents went through OCR" without a schema change or data migration.
- `PATCH /api/admin/users/:id/role` — real role management (USER↔ADMIN), using the
  `AuditAction.USER_ROLE_CHANGED` enum value added in Part 1 anticipating this. Same
  last-admin safety check pattern as delete: can't demote the last remaining admin, can't
  change your own role.
- `GET/PUT /api/admin/settings` — real persistence via the new `Setting` model.

**Dashboard gaps closed** (`getDashboardStats`/`getPlatformHealth` in `admin.service.ts`):
- **Total OCR Requests**: `Document.count()` filtered to `mimeType startsWith "image/"`.
- **Active AI Agents**: defined as "ran at least once in the last 30 days" (distinct
  `agentId` from `AgentRun` in that window) — a genuine usage signal, since `Agent.status`
  (IDLE/RUNNING) is a concurrency lock, not a meaningful "active" flag on its own.
- **Memory Statistics**: `getMemoryStats()` in `memory.service.ts` — total count + breakdown
  by type, platform-wide.
- **CPU Usage**: `os.loadavg()[0] / os.cpus().length * 100`, Node's standard load-average
  approximation. Noted in code that `os.loadavg()` always returns `[0,0,0]` on Windows — a
  non-issue since this app's deploy target is Linux containers, but worth knowing if that
  ever changes.
- **Total Product Scans** is the one dashboard card still showing "—", for the same reason
  as the page below.

**Product Scan Analytics — deliberately still a shell.** Filling this gap "for real" would
mean creating a `ProductScan` model and the scan-recording logic behind it — which is the
Smart Product Scan module itself, explicitly listed as off-limits for this pass. Building
schema/data for a module you've been told not to start isn't a backend gap to close, it's
scope creep with extra steps. Left completely untouched from Part 2.

**Frontend**: rewrote all 6 previously-shell pages (Memory, AI Agents, Conversations,
Documents, OCR Jobs) to call the new endpoints — search/filter/edit/pin/delete on Memory,
enable/disable + config/tools view on Agents, metadata table on Conversations,
search/download/delete on Documents, filtered reuse of Documents on OCR Jobs. Settings now
persists for real (`getSettings`/`updateSettings` against the DB) with an honest inline note
that `maxUploadMb` and the feature flags are stored but not yet *enforced* anywhere else in
the app (upload middleware still uses a fixed 20MB limit; no route checks the flags yet) —
storing a setting and acting on it are two different pieces of work, and only the first was
in scope here. Users page gained a real role selector. Dashboard's 4 gap cards now show real
numbers (see above).

**Verification**: every new/changed backend file passed a brace/paren/bracket balance sweep;
every controller/route import was cross-checked against actual exports (20 admin route
imports, 16 `admin.service.ts` calls, 3 `memory.service.ts` admin-function calls — all
matched). Caught and fixed a real bug before packaging: a stray fullwidth Unicode `？`
(U+FF1F) instead of an ASCII `?` in `lib/admin.ts`'s `listAllAgents` signature — invalid
TypeScript that would have failed to compile — found by scanning for non-ASCII punctuation
across the file, not by chance. All 9 touched frontend files re-balance-checked after the fix.

### Part 2 — frontend dashboard


Built all 12 requested pages under `/admin` (`AdminShell.tsx` nav, `useRequireAdmin.ts`
auth-gate redirecting non-admins to `/dashboard`). Frontend-only, per explicit instruction —
zero backend files touched this pass. Honesty split, by page:

**Fully real, backed by Part 1's actual endpoints:**
- **Dashboard** (`/admin`) — every stat card either shows real data from
  `GET /api/admin/stats|health|ai-usage`, or shows "—" with an inline sublabel explaining
  what's missing (Memory Statistics, Total OCR Requests, Total Product Scans, CPU Usage,
  "active" agent count) rather than a fabricated number. A banner at the bottom says so too.
- **Users** (`/admin/users`, `/admin/users/:id`) — search, filter (role/status), pagination,
  enable/disable, delete, per-user usage counts. All real, hitting the real endpoints. Role
  management (changing USER↔ADMIN) is explicitly noted as unavailable — Part 1 never built a
  role-change endpoint (though the `AuditAction.USER_ROLE_CHANGED` enum value was added
  anticipating one).
- **AI Usage** (`/admin/ai-usage`) — real bar charts (recharts, newly added dependency) of
  chats/messages by model from `GET /api/admin/ai-usage`, plus a working client-side CSV
  export (genuinely downloads a file, no backend needed for that part). Daily/monthly trend
  charts and token usage are explicitly noted as unavailable — no timestamped usage buckets
  or token-count fields exist in the schema.
- **Audit Logs** (`/admin/audit-logs`) — real, paginated, from `GET /api/admin/audit-logs`.
- **Error Logs** (`/admin/error-logs`) — real, paginated, expandable stack traces, from
  `GET /api/admin/errors`.
- **Settings** (`/admin/settings`) — a fully real, working settings *form* (general/AI/
  security/auth/storage/environment-reference/feature-flags, all requested sections present)
  but explicitly, visibly NOT persisted — there is no settings table or endpoint anywhere in
  the backend. A yellow banner says so; "Save" only confirms the form works, nothing is
  written to a database. Building fake persistence would be worse than being upfront about it.

**Honest UI-shell pages** (real components — search boxes, filter pills, stat cards, tables —
genuinely wired to call something, but showing a clear explanation instead of data), because
the specific cross-user listing they need doesn't exist in any endpoint built so far, and this
pass was frontend-only:
- **Memory** (`/admin/memory`) — `GET /api/memory` is scoped to the requesting user's own
  memories by design (module 15); there's no `GET /api/admin/memories`.
- **AI Agents** (`/admin/agents`) — same gap for `GET /api/agents` (module 14); also, `Agent`
  has no enable/disable status field at all, so that part of the spec needs a schema change,
  not just a new endpoint.
- **Conversations** (`/admin/conversations`) — same gap for `GET /api/chat` (module 3), plus
  a genuine privacy question (should an admin be able to read message content?) worth
  deciding deliberately rather than wiring up by default.
- **Documents** (`/admin/documents`) — same gap for `GET /api/documents` (modules 10-11).
- **OCR Jobs** (`/admin/ocr-jobs`) — OCR isn't even a distinct record type; it's a branch
  inside Document AI's extraction pipeline (an OCR'd image is just a `Document` row with no
  flag marking it as such). Surfacing OCR specifically needs a schema decision first.
- **Product Scan Analytics** (`/admin/product-scans`) — per your own explicit instruction
  ("Backend only exists later. Prepare reusable UI now."), built as a real component shell
  (stat cards, disabled search/filter inputs, section placeholders) with zero fabricated data.

None of the six shell pages invent numbers or pretend the admin's own personal data is
platform-wide — each states plainly what backend work it needs and why.

**Other frontend changes:** added `recharts` to `frontend/package.json` (needed for AI Usage
charts — nothing else in the app charts yet). Added a small conditional "→ Admin Panel" link
to the regular `AppShell.tsx` sidebar, visible only when `user.role === "ADMIN"` — without it
there'd be no discoverable way into `/admin` short of typing the URL.

### Part 1 — backend foundation


Scope of this pass was explicitly backend-only, per instruction. What's implemented:

- **Schema**: `User.isActive` (default `true`) — enable/disable is enforced at login
  (`auth.controller.ts` rejects with 403 if `!user.isActive`), not just a cosmetic flag.
  `AuditLog` (actor, action enum, free-text `targetType`/`targetId` so future admin actions
  beyond user management don't need a schema change, optional `metadata` Json) and `ErrorLog`
  (message, stack, path, method, statusCode, best-effort `userId` — intentionally not a
  foreign key so a later user deletion can't cascade-delete historical error records).
  Migration hand-written at
  `backend/prisma/migrations/20260703090000_add_admin_panel_foundation/migration.sql`, same
  convention as the Memory module's migration (no live DB in this environment to run
  `prisma migrate dev`) — **run `npx prisma generate` and `npx prisma migrate deploy` before
  starting the backend.**
- **Admin auth/authorization**: reused existing infrastructure rather than rebuilding it —
  `requireAdmin` middleware already existed in `middleware/auth.ts` (written when auth was
  first scaffolded) but had never been wired into any route until now. JWT payload already
  carried `role`, so no token changes were needed. `admin.routes.ts` applies
  `router.use(requireAuth, requireAdmin)` once at the top, same pattern every other module's
  routes use for `requireAuth` alone.
- **User management APIs** (`admin.service.ts` + `admin.controller.ts`):
  `GET /api/admin/users` (paginated, filterable by `query` [email/name, case-insensitive],
  `role`, `isActive`), `GET /api/admin/users/:id` (full detail incl. counts of everything the
  user owns — chats, documents, images, videos, automations, agents, memories, etc., a
  support/moderation-at-a-glance view), `PATCH /api/admin/users/:id/status` (enable/disable,
  writes an audit log entry), `DELETE /api/admin/users/:id` (cascades via existing
  `onDelete: Cascade` relations, writes an audit log entry first). Two real safety checks, not
  just happy-path CRUD: an admin can't disable or delete their own account, and can't delete
  the last remaining admin (would brick the panel with zero admins able to fix it).
- **Dashboard statistics**: `GET /api/admin/stats` — total/active/disabled/new-this-week
  users, total chats/messages/automations/agents/documents, platform-wide (distinct from the
  per-user Dashboard module #2).
- **Platform health**: `GET /api/admin/health` — real signals, not a hardcoded "all green":
  live DB connectivity check (`SELECT 1`), automation scheduler heartbeat (added
  `getSchedulerStatus()` to `automationScheduler.service.ts` — running state + last tick
  time), process uptime/Node version/heap memory.
- **AI usage statistics**: `GET /api/admin/ai-usage` — chats and messages grouped by model,
  platform-wide, reusing the existing `Chat.model`/`Message.model` fields (no new tracking
  needed).
- **Error logs**: `GET /api/admin/errors` (paginated) backed by a real capture mechanism, not
  a stub — `middleware/errorHandler.ts` now writes an `ErrorLog` row (fire-and-forget, never
  blocks or risks the actual error response) for every 5xx it handles. 4xx (`ApiError` with
  status < 500 — bad input, not-found, wrong password, etc.) is deliberately NOT logged as an
  "error" — that's normal request handling, not a bug worth surfacing to admins.
- **Audit logs**: `GET /api/admin/audit-logs` (paginated, includes the acting admin's
  email/name via a join) — currently populated by user enable/disable/delete; the schema is
  generic enough that future admin actions append to the same table rather than needing a
  new one.

**Explicitly NOT done in this pass** (per instruction): no frontend admin pages, Part 2/3 not
started. Existing modules were touched only where genuinely required for these APIs to
function — `auth.controller.ts` (isActive check), `middleware/errorHandler.ts` (error
capture), `automationScheduler.service.ts` (health status getter) — no unrelated module logic
was changed.

**Known limitation, documented rather than silently accepted**: disabling a user blocks their
*next* login attempt, but this app has no session/token revocation mechanism (JWTs are
stateless everywhere in this codebase already — no logout/blacklist endpoint exists). A
disabled user's already-issued JWT remains valid until it naturally expires (`JWT_EXPIRES_IN`,
default 7d). Adding real-time revocation (a token blacklist or short-lived tokens + refresh)
would be a bigger auth architecture change than "Part 1 backend foundation" scope — flagged
here rather than either silently ignoring it or overbuilding beyond what was asked.



## Module 25 — Testing: Part 1 of 2 (static verification)

**Important constraint discovered and worked around**: this environment has no network
access — `npm install` fails immediately with a 403 from the npm registry (verified by
actually attempting it, not assumed). That means a real `tsc --noEmit` or `next build`
against actually-installed dependencies (Express types, Prisma Client's generated types,
React/Next types, etc.) cannot be run here. What follows is the most rigorous static
verification achievable without that — real automated scans, not guesses — plus one
critical bug found and fixed. Anyone deploying this repo should still run
`npm install && npx tsc --noEmit` (backend) and `npm install && npm run build` (frontend)
themselves as the definitive check before relying on this pass alone.

**What was actually verified, by script, across the whole codebase (not just recently
touched files):**
- **Backend import/export graph** (56 files): every `import { X } from "./y"` resolved
  against `y`'s actual exports. First pass found one flagged item
  (`streamCompletion`) that turned out to be a false positive in the check script itself
  (didn't account for `export async function*` generator syntax) — fixed the script,
  re-ran, **0 real errors**.
- **Frontend import/export graph** (95 files, including `@/` alias resolution): first pass
  flagged 368 "missing exports" — investigated and confirmed 100% false positives from a
  path-normalization bug in the check script (inconsistent leading `./` between the file-walk
  index and the alias resolver, so real files were being looked up under the wrong key).
  Fixed the script, re-ran, **0 real errors**. Documenting this prominently because it's a
  reminder that a scary-looking automated result still needs a human to check whether the
  tool or the code is wrong — in this case it was the tool, twice.
- **Route registration**: all 15 backend route files are mounted in `index.ts`, no
  duplicates, no orphans.
- **Prisma schema structural validation** (no `prisma validate` available without network):
  custom script checked brace balance, 18 unique models, 12 enums, no duplicate model/enum/
  `@@map` names, every field type in every model resolves to a real model/enum/scalar, every
  model has a primary key. All clean.
- **Dead code / unused imports**: scanned all 149 backend+frontend source files for imported
  names that appear nowhere else in the file. **0 unused imports found.**
- **Duplicate exports**: scanned all 151 files for the same name exported twice from one
  file (a real compile error). **0 found.**
- **tsconfig path alias**: confirmed `"@/*": ["./*"]` in `frontend/tsconfig.json` matches how
  every `@/...` import in the codebase is actually used.

**Critical issue found and fixed — a genuine deployment blocker, not a style nit:**

The migration history started at `20260702120000_add_memory_module`, whose first statement
is `ALTER TABLE "memories" ADD CONSTRAINT ... FOREIGN KEY ("userId") REFERENCES "users"("id")`.
No migration ever created `users` — or any of the other 13 models that existed before the
Memory module (`projects`, `chats`, `messages`, `documents`, `video_generations`,
`generated_images`, `search_queries`, `research_reports`, `automations`, `automation_runs`,
`agents`, `agent_runs`, `agent_steps`). Every module from Auth through AI Agents was built via
direct `schema.prisma` edits without ever running `prisma migrate dev`, so no migration
captured that baseline.

Concretely: running `npx prisma migrate deploy` against a genuinely fresh database — exactly
what the README's own quick-start instructs — would fail immediately with
`relation "users" does not exist"`. This wasn't a hypothetical; it was confirmed by tracing
the exact foreign key statement that would fail first.

**Fix**: added `backend/prisma/migrations/20260701000000_init/migration.sql`, a hand-written
baseline migration (timestamped before the three existing ones, since there's no live DB/
network access here to generate it via `prisma migrate dev`) creating all 14 original models,
their 10 enums, and every foreign key/unique constraint between them. Verified by script,
not just by eye:
- Every table the later 3 migrations reference via foreign key now has something creating it.
- No table or enum is created in both the baseline and a later migration (would be a real
  migration-apply error).
- Every column in the baseline was cross-checked field-by-field against the current
  `schema.prisma` for all 14 models. Two models (`SearchQuery`, `ResearchReport`) initially
  showed as mismatched in the check script — investigated and found the script's per-model
  regex was truncating at a `}` character inside an inline comment (e.g. `// [{ title, url,
  snippet }]`), not a real schema issue; manually cross-checked both models field-by-field
  instead and confirmed the migration is correct.
- Deliberately excludes `users.isActive` and `agents.enabled`, which are added by the two
  Admin Panel migrations that run after this one — confirmed those migrations still add them
  correctly on top of this baseline, not duplicating a column.

**Explicitly NOT done in this pass** (Part 2): no automated test suite — no Jest/Vitest unit
tests, no supertest API integration tests, no Playwright/Cypress e2e tests. "Testing" here
means verifying what exists is internally consistent and would plausibly compile/deploy, not
writing new tests. Also did not add any new features, per explicit instruction.

## Immediate next module

Testing (#25) Part 2 of 2 — an actual automated test suite — is the natural next step.
Admin Panel (#22) is now complete end to end (Parts 1-3) — the only remaining gap is Product
Scan Analytics, which needs the Smart Product Scan module itself, not more Admin Panel work.
Memory (#15) is also complete end to end (Parts 1-3). **Workflow Builder** (#13) is the oldest
not-started module in numeric order. **Knowledge Base** (#16) is next after that. Not proceeding
automatically — stopping here per explicit scope for this pass.

### Security — status: audited and hardened, not yet production-certified

Full findings, severities, fixes, and residual risks are in **`SECURITY_AUDIT.md`** — this is
just the pointer + current bottom line. All Critical and High findings identified in this
pass are fixed (unauthenticated private file access, path traversal in uploads, no file-type
enforcement, no rate limiting anywhere, missing security headers/CSP, a critical-severity
Next.js dependency chain). Two items are deliberately left as documented residual risk rather
than fixed blind: the `xlsx` dependency (high-severity, no npm-registry fix available) and
JWT-in-localStorage (a real architectural tradeoff, not something to change without a live
environment to verify a rework in). **Do not treat this as a production-readiness
certification** — `SECURITY_AUDIT.md`'s "Before this goes live" section lists what still
needs to happen first (running everything against a real environment chief among them, since
this sandbox never had a working database or Prisma client to test runtime behavior against).

### Frontend redesign — status: complete, remaining items are backend-shaped

Every section of the original redesign spec (1–23) has had a real implementation pass,
including the Chat welcome/composer experience (section 4). The Settings page's Appearance,
Voice, Memory, and Privacy sections are now real and persisted (`PATCH`/`DELETE /api/auth/me`,
see the maintenance log entry above) — that closes out what used to be item 1 here. The three
pre-existing `tsc` index-signature errors are also fixed (same entry). What's left is
deliberately **not** frontend work — each of these needs a backend capability added first, or
it would just be a UI that implies something the product can't actually do:

1. **Voice AI waveform visualization** (spec section 9) — `VoiceOrb` is a state indicator
   (idle/listening/transcribing/speaking), not a live amplitude waveform. Needs Web Audio API
   `AnalyserNode` wiring into `hooks/useAudioRecorder.ts`, which doesn't currently expose live
   audio data.
2. **Reference-image upload for Image AI** and **reference-video upload for Video AI** — the
   current image backend is DALL·E 3 prompt+size only; video accepts a source *image*, not a
   source *video*. Backend/provider change needed before either is a frontend task.
3. Smaller per-module gaps (agent "Coding Agent" tool with no code-execution tool in the
   registry, document "Compare Documents" with no backend action, project templates beyond a
   bare name) are each noted inline in the maintenance log entries above, at the point they
   were deliberately left out.
4. **Appearance's "Reduce motion" is intentionally scoped to `HolloConnectLogo`**, not every
   animated element in the app (see the maintenance log entry above for why) — broadening it
   to page transitions, hover micro-interactions, etc. would mean threading
   `useMotionPreference()` through many more `motion.*` call sites individually. Worth doing
   as its own focused pass if a fuller "reduce motion everywhere" guarantee becomes a priority.

Also worth doing before the next deploy, not urgent: run
`npx prisma generate && npx prisma migrate deploy` in a real environment (this sandbox can't
reach `binaries.prisma.sh` — see the maintenance log entry above) to pick up the new
`reducedMotion`/`memoryEnabled` columns and confirm `npx tsc --noEmit` is clean on the backend
too, the same way the frontend's been confirmed clean all thread.
