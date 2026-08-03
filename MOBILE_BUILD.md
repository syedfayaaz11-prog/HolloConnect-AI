# HolloConnect AI — Mobile (Android) Build Guide

Written for exactly your situation: laptop is down, testers are in other states, you want a
real installable APK without an official launch. Everything in this doc can be done from a
phone browser. No terminal, no laptop.

**The APK is the *last* step, not the first.** The APK is just a thin native window pointing
at your real website — it has no idea about your backend or database on its own. Nothing your
friends do in the app will work until the frontend and backend are actually online and
reachable over the public internet (not your laptop, not your Wi-Fi).

---

## The four things that must exist before the APK is useful

```
Android APK  →  https://holloconnect.in (frontend, hosted)
                        ↓
                 https://api.holloconnect.in (backend, hosted)
                        ↓
                 PostgreSQL (hosted)
```

| # | What | Where | Can be done from phone? |
|---|------|-------|--------------------------|
| 1 | PostgreSQL database | A managed Postgres host (Render, Railway, or Neon all have free tiers) | Yes — web dashboard |
| 2 | Backend API (Express) | A Node host that runs a long-lived process (Render or Railway — **not** Netlify, see below) | Yes — connect your GitHub repo, click deploy |
| 3 | Frontend (Next.js) | Netlify, already connected to `holloconnect.in` | Yes — set one env var, redeploy |
| 4 | The APK itself | Built by GitHub Actions (this repo already has the workflow) | Yes — one button in GitHub's mobile site |

**Why not Netlify for the backend too:** Netlify hosts static sites and short-lived serverless
functions. This backend is a normal long-running Express server (persistent DB connections,
streamed chat responses) — it needs a host that keeps a process running, which Netlify's
model isn't built for. Netlify is the right, and already-correct, choice for the *frontend*.

---

## Step-by-step (all from your phone browser)

### 1. Get the code onto GitHub
If it isn't already: create a new **private** GitHub repository, and upload this project's
contents to it. The easiest mobile-friendly way to do this without a terminal is
**GitHub Codespaces** (open github.com in Chrome on your phone → create a new repo → "Add
file" → "Upload files" won't handle the whole folder tree well on mobile, so instead: create
the empty repo, then open a Codespace on it — that gives you a full VS Code + terminal in the
browser, where you can drag in the project zip, run `unzip`, `git add -A`, `git commit`,
`git push`. This works fine on a phone; it's just typing occasional commands with the
on-screen keyboard.

### 2. Database (Render or Railway)
Create a free/starter Postgres instance. Copy the connection string it gives you
(`postgresql://...`) — you'll need it in step 3.

### 3. Backend (Render or Railway)
- Connect your GitHub repo, point the service at the `backend/` folder.
- Build command: `npm install && npx prisma generate && npx prisma migrate deploy`
- Start command: `npm run build && npm start` (or `npx tsx src/index.ts` if you'd rather skip
  the build step for now — either works)
- Set these environment variables (values from `backend/.env.example` — **never** commit real
  values, only set them in the host's dashboard):
  - `DATABASE_URL` — from step 2
  - `JWT_SECRET` — a long random string (generate one anywhere, e.g. your phone's password
    manager's "generate password" feature works fine for this)
  - `FILE_SIGNING_SECRET` — a second, different long random string
  - `CORS_ORIGIN` — `https://holloconnect.in`
  - `TRUST_PROXY` — `true` (Render/Railway both put you behind their own proxy)
  - Any AI provider keys you actually want working — see the table below. **You can leave all
    of these blank for pure UI/UX testing.**
- Once deployed, note the public URL it gives you (something like
  `https://holloconnect-api.onrender.com`).
- Point `api.holloconnect.in` at that URL: in Netlify's DNS settings for `holloconnect.in`,
  add a CNAME record — `api` → the host it gave you. (If your DNS is managed somewhere other
  than Netlify, do it there instead — wherever you can currently edit `holloconnect.in`'s DNS
  records.)

### 4. Frontend (Netlify)
- In your existing Netlify site for `holloconnect.in`, set the environment variable
  `NEXT_PUBLIC_API_URL` to `https://api.holloconnect.in`.
- **This must be set before/at build time** — Next.js bakes `NEXT_PUBLIC_*` variables into the
  built JavaScript, it doesn't read them at runtime. Trigger a redeploy after setting it (a
  "clear cache and redeploy" in Netlify's dashboard).

### 5. Build the APK
This repo already has everything ready — the Capacitor project (`frontend/android/`) and a
GitHub Actions workflow (`.github/workflows/build-android.yml`) that builds it in the cloud,
since compiling Android apps needs the Android SDK/Gradle/a JDK, none of which are available
in the environment this project was prepared in.

Before running it, confirm `frontend/capacitor.config.ts`'s `HOSTED_FRONTEND_URL` says
`https://holloconnect.in` (it already does by default — only change it if you're testing
against a different URL first, e.g. a Netlify preview link).

To build:
1. On github.com (mobile browser is fine), open your repo.
2. Tap the **Actions** tab.
3. Tap **Build Android APK** in the left list.
4. Tap **Run workflow** → **Run workflow** (green button).
5. Wait a few minutes — refresh the page to watch it progress.
6. Once it shows a green check, open the completed run and scroll to **Artifacts** →
   download **holloconnect-ai-debug-apk**. That download is a `.zip` containing one file:
   `app-debug.apk`.

### 6. Install on Android
- Unzip the download (your phone's Files app can do this, or Google Files).
- Tap `app-debug.apk`. Android will ask to allow installs from that source (Chrome/Files) the
  first time — allow it, then install.
- Send the same APK file to your friends (Google Drive, WhatsApp, email — any file-sharing
  method). They'll get the same "allow this source" prompt the first time.

This is a **debug** build, which is exactly right for private testing — it's unsigned for the
Play Store but installs and runs completely normally via direct APK install ("sideloading").

---

## What can be tested without any AI provider keys

Leaving every AI key blank in the backend's environment variables still gets you a fully
navigable, fully authenticated app:

| Works with zero AI keys | Needs at least one AI key to see real results |
|---|---|
| Sign up / log in / JWT sessions | Sending a chat message and getting a reply (needs `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`) |
| Full navigation, sidebar, all page layouts | AI Search / Deep Research (needs `TAVILY_API_KEY` + a chat model key) |
| Projects — create, list, organize | Image AI generation (needs `OPENAI_API_KEY`, for DALL·E 3) |
| Settings — Appearance, Voice UI, Memory toggle, Privacy/delete account | Video AI generation (needs `REPLICATE_API_TOKEN`) |
| Memory — create/view/search/pin/delete facts manually | Voice transcription/speak (needs `OPENAI_API_KEY` or `ELEVENLABS_API_KEY`) |
| Document upload + file storage (upload works; the file is stored and listed) | Document summarize/ask/translate, and OCR for image-based documents (needs a chat model key, or `GOOGLE_VISION_API_KEY` for OCR) |
| Admin panel navigation (if your account is an admin) | — |
| Automations/Agents — create, list, configure (the *run* action needs a key) | Actually running an automation or agent |
| The chat thinking-indicator animation, all UI states, responsive layout, dark theme | — |

For friends giving feedback on **design, navigation, and overall feel**, none of this needs a
paid key. If you want them to see one real "wow" feature working, a single `OPENAI_API_KEY`
(cheap per-request, no subscription) unlocks Chat, Image AI, Voice, and Document AI all at
once — the most coverage for one key.

Where a feature has no key configured, the request fails and the app shows its existing error
state (a real, already-built part of the UI) rather than fake results — nothing in this setup
fabricates AI output.

---

## What was actually changed to get here

- **Added, did not modify:** `frontend/capacitor.config.ts`, `frontend/capacitor-www/`
  (placeholder splash page), `frontend/android/` (the full native Android project, generated
  by Capacitor's own tooling — not hand-written), `.github/workflows/build-android.yml`,
  `frontend/.gitignore`, root `.gitignore`, this file.
- **Not touched:** every existing frontend/backend file, all completed redesign work, all
  security hardening from the previous pass. `frontend/package.json` gained three new
  dependencies (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`) — nothing existing
  was removed or version-bumped.
- **Why `server.url` instead of a static export bundled into the APK:** this project's
  dynamic routes (`/admin/users/[id]`, `/agents/[id]`, `/automations/[id]`, `/documents/[id]`,
  `/projects/[id]`, `/research/[id]`, `/search/[id]`) have no `generateStaticParams()`, so
  `output: 'export'` fails — confirmed this matches the error already hit before. Pointing the
  WebView at the real hosted site instead sidesteps that entirely, and means every future
  frontend deploy is live in the app immediately with no APK rebuild.

## Honest limitations of this environment

- **No APK was compiled here.** This sandbox has no JDK compiler, no Gradle, no Android SDK,
  and its network allowlist blocks both `dl.google.com` (Android SDK) and
  `services.gradle.org` (Gradle) — verified directly (403 on both) rather than assumed. The
  GitHub Actions workflow above is the real path to an actual `.apk` file.
- **The workflow YAML has been syntax-validated** (parses correctly as YAML, structure
  confirmed) but has **not been run end-to-end** — that requires a live GitHub repo and
  Actions runner, which don't exist in this sandbox. It's built from standard, widely-used
  actions (`actions/checkout`, `actions/setup-java`, `android-actions/setup-android`,
  `actions/upload-artifact`) in the conventional way Capacitor's own documentation describes,
  but the first real run is the true test.
- **Nothing here deploys your backend, database, or frontend for you** — I have no ability to
  create accounts, provision infrastructure, or configure DNS from this sandbox. Steps 2–4
  above are real actions only you can take (from your phone, per the instructions in each).
