# HolloConnect AI — Starter Codebase

This is a **real, working starter** for HolloConnect AI, built module-by-module as recommended
in the original spec. No AI builder (including this one) can generate a ChatGPT-scale platform
in a single pass — this repo gives you a correct foundation to extend module by module in
Claude Code or your own dev environment.

## What's implemented (working, not mocked)

- **Auth module**: register, login, JWT issuance/verification, password hashing (bcrypt),
  protected routes, `/me` endpoint.
- **Dashboard module**: usage stats, recent chats, per-model usage.
- **Chat module**: streaming AI responses (SSE), multi-model provider switching
  (OpenAI, Anthropic, Gemini, plus DeepSeek/Llama/Qwen/Mistral via a generic
  OpenAI-compatible endpoint), persistent chat + message storage via Prisma/Postgres,
  markdown + code-highlighted rendering, model selector, stop generation.
- **Projects module**: create/rename/delete projects, assign chats to projects.
- **AI Search module**: live web search (Tavily) + AI-synthesized cited answer, source list,
  follow-up questions, persisted search history.
- **Deep Research module**: multi-step research pipeline (sub-question planning → multi-query
  web search → synthesized multi-section report), timeline view, source list, follow-up
  questions, PDF export, persisted report history.
- **Image AI module**: text-to-image generation (OpenAI DALL-E 3), persisted gallery,
  download/delete. Local disk storage abstraction, swappable for S3/Cloudinary.
- **Video AI module**: text-to-video and image-to-video (Replicate), async job status
  tracking with automatic polling, video gallery with playback/download/delete.
- **Voice AI module**: speech-to-text (Whisper) and text-to-speech (OpenAI + optional
  ElevenLabs), voice settings, and turn-based voice conversation mode integrated directly
  into Chat (mic input, auto-spoken replies).
- **Document AI module**: upload PDF/DOCX/PPTX/XLSX/CSV/TXT, automatic text extraction,
  AI summarization, document Q&A, translation, document comparison.
- **OCR**: extends Document AI's same upload/extraction pipeline to images (PNG/JPEG/WEBP/
  GIF/BMP) via OpenAI Vision or Google Cloud Vision — same upload endpoint, no separate flow.
- **Automation module**: scheduled (cron), one-time, and webhook-triggered AI tasks. A
  restart-safe polling scheduler (no external queue needed) executes due automations, records
  full run history/logs, supports manual "run now," and exposes a token-secured public
  webhook URL per trigger automation.
- **Database schema**: Prisma models for User (voice preferences), Chat, Message, Project,
  SearchQuery, ResearchReport, GeneratedImage, VideoGeneration, Document, ApiKey — designed
  so later modules (Agents, Billing) can attach without breaking changes.

## What's intentionally NOT implemented yet

Everything else in the original spec (Deep Research, Image/Video AI, Voice AI, Automation,
Team Workspaces, Agent Marketplace, Admin Panel, Stripe billing, mobile app) is **out of scope
for this pass**. Build these as separate modules against this same backend/schema, one at a
time. Trying to scaffold all of them at once produces shallow, broken code — this repo
deliberately avoids that.

## Stack

- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL
- Auth: JWT (access token), bcrypt password hashing
- AI: Provider-abstracted service (`backend/src/services/ai.service.ts`) — swap/add models by
  adding a case, no other code changes needed

## Getting started

### 1. Database
```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, and provider keys you plan to use
npx prisma migrate dev --name init
npm install
npm run dev             # starts API on :4000
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev              # starts app on :3000
```

### 3. Try it
Visit `localhost:3000/register`, create an account, you'll land in `/chat` with a working
streaming AI conversation, model switcher, and persisted history.

## Suggested build order for the next modules

1. **Document AI** — reuses the Message/File pattern already in the schema; add a `documents`
   table + upload endpoint + extraction service.
2. **Projects** — schema already has a `Project` model with a relation stub; wire up the
   frontend sidebar.
3. **Billing (Stripe)** — add `Subscription` model, webhook handler, usage metering middleware
   around the chat route.
4. **Image AI** — separate service module calling an image-gen provider, own history table.
5. **Admin panel** — separate Next.js route group behind a `role: ADMIN` guard.
6. **Mobile (React Native)** — reuses 100% of this backend; no backend changes needed.

Each module should get its own PR-sized pass rather than being scaffolded all at once.
