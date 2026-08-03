# HolloConnect AI — Security Audit

Audit performed directly against the existing codebase, prior to public launch. Every
finding below was confirmed by reading the actual implementation (not assumed from
architecture alone) before being fixed. This document is written to be read on its own —
severities, fixes, what was and wasn't verified, and what's still required before this goes
live.

**Bottom line up front:** the Critical and High findings below are fixed. Two Medium/lower
items (a dependency vulnerability with no available fix, and one architectural tradeoff) are
documented as accepted residual risk rather than fixed, for reasons explained inline. **No
claim is made that this application is unhackable, and this document alone is not a
certification of production-readiness** — see "Before this goes live" at the end.

---

## Severity definitions used below

- **Critical** — directly exploitable, no auth required, exposes private data or lets an
  attacker act as another user.
- **High** — exploitable with some precondition (a valid account, a crafted request) or
  causes significant cost/availability damage.
- **Medium** — real weakness, but limited blast radius or requires an unlikely precondition.
- **Low** — defense-in-depth / hardening; not independently exploitable on its own.

---

## Findings and fixes

### 1. [CRITICAL — FIXED] `/uploads` served every private file to anyone with the URL

**Before:** `app.use("/uploads", express.static(UPLOADS_DIR))` — every generated image,
video-source image, and uploaded document was reachable by anyone who had, guessed, or
obtained the URL through any channel (browser history, a proxy/CDN log, a shared screenshot,
a leaked referrer header), forever, with **zero authentication or ownership check**. Filenames
are `crypto.randomUUID()` (unguessable by brute force), but "unguessable" is not the same as
"protected" — a single leaked link meant permanent, unrevokable access.

**Fix:** replaced raw static serving with a signed, expiring-URL scheme
(`backend/src/utils/signedFileUrl.ts`, `backend/src/routes/uploads.routes.ts`):
- Every response that hands a file's URL to the frontend (`GET/POST` on images, videos,
  video-source upload) now signs it with an HMAC + 1-hour expiry
  (`signLocalUploadUrl()`) before sending it.
- The `/uploads` route itself now rejects any request without a valid, unexpired signature
  (`403`), and independently re-validates the path shape and containment inside the uploads
  directory before touching the filesystem (belt-and-suspenders against the traversal bug in
  finding #2).
- **Why signed URLs and not a `Authorization: Bearer` check on `/uploads`:** the frontend
  renders these as plain `<img src>` / `<video src>` — browsers don't attach custom headers
  to those requests, so a header-based check would have broken every image/video in the app.
  Signed query-string tokens are the standard solution for exactly this (the same pattern
  S3/GCS presigned URLs use) and required no frontend changes.
- `GET /api/documents/:id` and the upload-completion response no longer include `fileUrl` at
  all (confirmed via search that no frontend component reads it) — removed the exposure
  entirely there rather than adding signing plumbing for a field nothing uses.

**Residual risk (Low):** a signed link is valid for anyone who has it for up to 1 hour. This
is an accepted, standard tradeoff of the signed-URL pattern (necessary for `<img>`/`<video>`
tags to work at all) — not tied to re-verifying the requester's identity on every fetch. If a
tighter guarantee is ever needed for a specific file class, shortening that file class's TTL
or moving to authenticated blob storage (S3 + CloudFront signed cookies, etc.) are the next
steps.

### 2. [HIGH — FIXED] Path traversal in upload filename/extension handling

**Before:** `storage.service.ts`'s `saveBuffer()` built the stored filename as
`` `${crypto.randomUUID()}.${extension}` `` where `extension` came from either
`file.originalname.split(".").pop()` (document uploads) or `file.mimetype.split("/")[1]`
(video-source uploads) — **both attacker-controlled** (a multipart field's filename and
Content-Type are whatever the client sends). A filename with no `.` at all makes
`.split(".").pop()` return the *entire string*; a crafted value containing `../../` would
then make `path.join(dir, filename)` resolve outside the uploads directory — a path-traversal
file write.

**Fix:** `saveBuffer()` now sanitizes `extension` through a strict allowlist
(`[^a-z0-9]` stripped, 10-char max, `"bin"` fallback) regardless of what any caller passes,
and independently confirms the final resolved path is still inside the uploads root before
writing (`fullPath.startsWith(UPLOADS_ROOT + path.sep)`). `deleteFile()` got the equivalent
containment check. The new `/uploads` serving route (finding #1) adds a third, independent
layer (a strict filename regex) on the read side.

### 3. [HIGH — FIXED] No file-type enforcement on uploads

**Before:** `multer()` had no `fileFilter` — the three upload endpoints (documents, video
source images, voice audio) accepted **any file type**, trusting only client-supplied
Content-Type for downstream logic to sort out (or not).

**Fix:** `middleware/upload.ts` now exports three purpose-specific multer instances
(`uploadDocument`, `uploadImage`, `uploadAudio`), each with an explicit mimetype allowlist
matching what the app's own processing code actually understands, plus per-type size limits
(20MB documents, 8MB images, 15MB audio, down from one shared 20MB ceiling for everything).
A new `wrapMulter()` helper converts multer's fileFilter/size-limit errors into a proper `400`
instead of falling through to the generic `500` handler.

**Also added (Medium, closes the gap fileFilter alone leaves):** `fileFilter` only checks the
*claimed* Content-Type header, which a client fully controls. `utils/fileSignature.ts` adds a
second, independent check of the actual file bytes (magic numbers) against the claimed type
for document uploads and video-source images — so a file renamed/relabeled to pass the
mimetype check without actually being that type is now rejected. Plain-text formats (txt/csv)
have no reliable signature and are explicitly exempted from this second check (documented in
code) — that's the "where practical" boundary called out in the original request.

### 4. [HIGH — FIXED] No rate limiting anywhere

**Before:** zero rate limiting on the entire API — login/register (brute-force /
credential-stuffing), every AI-provider-calling endpoint (chat, search, research, image/video
generation, voice, agent runs, automation triggers — the actual cost-abuse surface), and the
unauthenticated automation webhook were all uncapped.

**Fix:** `middleware/rateLimit.ts` (via `express-rate-limit`), three tiers:
- `authLimiter` (20 / 15 min, IP-keyed) on `/api/auth/register` and `/api/auth/login`.
- `aiLimiter` (60 / 10 min, keyed by user id when authenticated, IP otherwise) on every
  endpoint that triggers a real metered provider call: chat send, search, research,
  image/video generation, voice transcribe/speak, agent run, automation run-now, and document
  upload/summarize/ask/translate/compare (upload can trigger OCR/Vision calls).
- `webhookLimiter` (30 / 10 min, keyed by the webhook token itself rather than IP, since a
  legitimate third-party automation service may call from a shared/rotating IP) on the
  automation webhook trigger.
- `globalApiLimiter` (400 / 5 min) as a floor across all of `/api`.
- `TRUST_PROXY` env var (default off) gates whether `X-Forwarded-For` is trusted for the real
  client IP — added explicitly opt-in so this doesn't silently let clients spoof their IP and
  dodge limits on a deployment that isn't actually behind a trusted proxy.

**Residual risk (Low):** rate limit state is in-memory (express-rate-limit's default store),
so it resets on process restart and doesn't share state across multiple backend instances. For
a single-instance deployment (this project's current architecture) that's fine; a
horizontally-scaled deployment should switch to a shared store (Redis) — noted under
"Before this goes live."

### 5. [HIGH — FIXED] Missing security headers / no CSP

**Before:** no `helmet`, no CSP, no `X-Content-Type-Options`, no `X-Frame-Options` on either
the backend API or the frontend.

**Fix:**
- Backend: `helmet()` added with `default-src 'none'` (this server is a JSON API plus the
  signed file route, not an HTML app) and `crossOriginResourcePolicy: cross-origin` (required
  so the frontend, on a different origin, can still load images/video from `/uploads` —
  helmet's default `same-origin` policy would otherwise have broken every image/video in the
  redesigned UI; confirmed this is needed, not just added speculatively).
- Frontend: `next.config.js` now sends `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy`, and a real CSP (`script-src 'self'` — verified
  first that there's no inline-script or `dangerouslySetInnerHTML`/`eval` usage anywhere in
  the codebase; `style-src` allows `'unsafe-inline'`, required by Tailwind's runtime and the
  UI libraries in use; `img-src`/`media-src`/`connect-src` scoped to the configured backend
  API origin, read from `NEXT_PUBLIC_API_URL` at build time so this doesn't silently break in
  any deployment other than localhost).

### 6. [MEDIUM — FIXED] Two endpoints skipped input validation entirely

**Before:** `compareDocuments` and `assignChatToProject` read `req.body` via a bare TypeScript
type assertion (`as { documentIdA: string; ... }`) instead of a zod schema — TypeScript's `as`
is a compile-time-only claim; at runtime, a missing or wrong-shaped field just becomes
`undefined` or whatever the client actually sent. Both endpoints did have manual truthiness
checks and (critically) already had correct ownership scoping downstream (`userId` in the
`WHERE` clause) — so this was not an IDOR risk, but it was a real gap in "complete input
validation" and could produce confusing 500s instead of clean 400s on malformed input.

**Fix:** added `compareDocumentsSchema` and `assignChatToProjectSchema` (proper UUID
validation) and wired both endpoints through `.safeParse()` like every other endpoint in the
codebase already does.

### 7. [MEDIUM — FIXED] Two fields with no cost/DoS-relevant length cap

**Before:** `validation.ts` is otherwise thorough (nearly every field already has a `.max()`),
but `createMessageSchema.content` (chat message) and both `password` fields had none. An
uncapped chat message is a direct cost/DoS lever (one request, arbitrarily large LLM context);
an uncapped password is a minor CPU-cost lever (bcrypt only reads the first 72 bytes, but a
multi-MB string still costs real CPU to hash up to that point).

**Fix:** `content` capped at 24,000 characters (generous for legitimate long-paste use, bounds
worst-case cost per request); both `password` fields capped at 128.

### 8. [Verified secure — no changes needed] IDOR / cross-user data access

Audited every controller's data-access calls (`findFirst`/`findUnique`/`update`/`delete`)
across chat, projects, memory, documents, images, videos, agents, automations, and search/
research history. Every read/write that isn't creating a brand-new record scopes its query by
`userId` (typically `findFirst({ where: { id, userId } })` before any mutation) — the
consistent, correct pattern already in place throughout. Admin routes are gated by
`requireAdmin` at the router level (`router.use(requireAuth, requireAdmin)`, applied once for
the whole admin router, not per-route — can't be forgotten on a new route). Admin
self-demotion, self-deletion, and last-admin-standing are all explicitly guarded in
`admin.service.ts` with audit logging. No fixes were needed here — this was the most
thoroughly-built part of the existing backend.

### 9. [Verified secure — no changes needed] SQL/Prisma injection

Every database call goes through Prisma's query builder (parameterized by construction). The
only raw SQL in the codebase is `` prisma.$queryRaw`SELECT 1` `` (a DB health check, tagged
template with no interpolation) — safe. No `$queryRawUnsafe` / `$executeRawUnsafe` anywhere.

### 10. [Verified secure — no changes needed] SSRF

Audited every outbound `fetch()` in the backend's services. All of them target either a fixed
provider hostname (OpenAI, Anthropic, Google, ElevenLabs, Replicate, Tavily) or a URL built
from server-side env config (`OPENAI_COMPATIBLE_BASE_URL`, `PUBLIC_BACKEND_URL`) — never a
raw, attacker-supplied URL. The one server-to-external-service fetch involving a "user" URL
(the video provider fetching an uploaded source image) is our own `/uploads` path with a
server-controlled host prefix, not an arbitrary destination. Checked the agent tools
registry specifically for a "fetch this URL" / browse-style tool that an LLM could be
prompt-injected into misusing — none exists; `web_search` goes through Tavily's own external
search, not a raw fetch of LLM-chosen URLs. Model selection is validated against a fixed
provider map before being used in any URL template (an unrecognized model throws before it
ever reaches a fetch call). No fixes needed.

### 11. [Verified secure — no changes needed] Admin authorization / privilege escalation

`registerSchema` only accepts `email`/`password`/`name` — there's no path for a client to set
their own `role` at signup (checked both the schema and that the controller destructures
only those fields into `prisma.user.create`, not a wholesale spread of the request body).
`requireAdmin` checks the server-issued, signed JWT's `role` claim, not anything client-
supplied per-request. Every admin route requires both `requireAuth` and `requireAdmin`.

### 12. [Verified secure — no changes needed] XSS

- No `dangerouslySetInnerHTML` anywhere in the frontend (repo-wide search, zero matches).
- No `eval`, `new Function`, or direct `.innerHTML =` DOM manipulation anywhere.
- Markdown rendering (`react-markdown` v9) has no `rehype-raw` plugin installed, so raw HTML
  in a message (from a user or an AI response) is rendered as literal escaped text, not
  executed — confirmed by checking the actual plugin list in `Markdown.tsx`
  (`remark-gfm`, `rehype-highlight` only). react-markdown v9's default URL transform also
  strips `javascript:`/`data:` link schemes automatically; not overridden anywhere.
- No fixes needed. (Noted as a good existing practice, not something this audit added.)

### 13. [Accepted architectural risk — documented, not changed] JWT stored in `localStorage`

The frontend stores the auth token in `localStorage` (`lib/auth.ts`). This means a successful
XSS anywhere in the app would let an attacker's script read the token directly — there is no
way to fully eliminate that with `localStorage`. The alternative (httpOnly cookies) would
need CSRF protection, `SameSite`/`credentials` reconfiguration across every API call, and CORS
changes — a genuine authentication-architecture change, which the audit's own instructions
said not to make blindly given the risk of breaking the app without a live environment to
verify it in.

**What actually mitigates this instead:** the XSS surface itself is small and was checked
directly (#12) — no raw-HTML rendering path exists for user or AI-generated content to exploit
in the first place. The new CSP (#5) additionally blocks any inline `<script>` injection
vector and any exfiltration `connect-src` outside the app's own API origin. This is a
compensating-controls approach, not a fix to the underlying tradeoff — recorded here rather
than silently left unmentioned.

### 14. [Accepted dependency risk — documented, no fix available] `xlsx` (SheetJS)

`npm audit` (backend): **1 high-severity finding, no fix available** —
[GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) (prototype
pollution) and
[GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) (ReDoS) in
`xlsx@0.18.5`, used by `documentExtract.service.ts` to parse uploaded `.xlsx`/`.xls` files.
The npm registry has no newer published version that fixes this (SheetJS moved fixed releases
to their own CDN outside npm) — this sandbox has no network access to fetch a non-npm-registry
package to verify a swap, and replacing the library (e.g. with `exceljs`) is a real code
change to `documentExtract.service.ts` that needs live testing this environment can't provide,
so it was not attempted blindly.

**Narrowing factor already in place:** exploiting this requires a malicious `.xlsx`/`.xls`
file to actually reach `xlsx`'s parser — which now requires passing both the mimetype
allowlist *and* the magic-byte signature check (finding #3) first, versus previously accepting
any file at all. That reduces, but doesn't eliminate, the exposure.

**Recommendation:** either fetch a patched SheetJS build directly from
`https://cdn.sheetjs.com` (per their own advisory guidance) or migrate to `exceljs`, with real
test coverage on `.xlsx`/`.xls` parsing before shipping either change.

### 15. [Fixed opportunistically, found while verifying #1] `sourceImageUrl` validation didn't match its real data shape

While tracing the video-source-image signing change, found that `generateVideoSchema`
required `sourceImageUrl: z.string().url()` (an absolute URL), but the actual value the
frontend has ever sent is our own relative `/uploads/...` path returned by
`POST /api/videos/upload-source` — a relative path fails `.url()`'s validation. Whether this
was already silently failing before this session couldn't be determined without a live run
(no server available in this sandbox), but leaving it as `.url()` while also making that same
path carry a signature (`?exp=...&sig=...`) risked a new double-signing bug if it ever did
pass validation. Fixed by validating it as our own upload-path shape
(`.startsWith("/uploads/")`, length-capped) instead of requiring a fully-absolute URL, and
made `signLocalUploadUrl()` strip any existing query string before re-signing (so re-signing
an already-signed URL replaces rather than doubles the signature, regardless of cause).

### 16. [Fixed] Next.js dependency — critical/high CVEs

`npm audit` (frontend), before any fix: **critical** severity, ~25 distinct advisories against
`next@14.2.5` (cache poisoning, SSRF via middleware redirects, several DoS vectors,
authorization bypass in middleware, and more). Bumped to `next@14.2.35` — same major.minor
line (14.2.x), a patch-only version increase with no expected breaking API changes. Re-ran
`npm audit` after: the bulk of the advisory list is gone; severity dropped from critical to
high. **Remaining advisories require `next@16.2.10`** — a major-version jump (14 → 16) that
Next.js's own migration guide confirms includes breaking changes (async request APIs, React
19 requirement). That was **not** attempted — it's real migration work needing dedicated
testing this sandbox can't provide (confirmed even a plain production build fails here
already, for an unrelated reason: this sandbox's network allowlist blocks
`fonts.googleapis.com`, which `next build` needs to fetch during the font-optimization step —
so a full build couldn't be verified either way in this environment). Documented as the
top remaining item under "Before this goes live."

### 17. [Reviewed, no action taken] `multer@1.4.5-lts.2` deprecation notice

`npm install` prints a deprecation warning pointing at multer 2.x for "a number of
vulnerabilities, patched in 2.x." However, `npm audit` (which checks the actual GitHub
Advisory Database, not just deprecation text) reports **zero** advisories against the
installed `1.4.5-lts.2` — the "lts" branch appears to already carry the relevant backports.
A major-version bump to multer 2.x has its own breaking API changes and wasn't justified
given `npm audit` shows nothing currently actionable here. The `fileFilter`/size-limit/
signature-checking work in findings #2–3 also directly narrows the practical exploitability of
the kind of malformed-multipart-request issues multer 1.x has historically had.

---

## Also checked, no vulnerability found, no code change

- **CORS**: single configurable origin via `CORS_ORIGIN` env var, no `credentials: true` (not
  needed — auth is Bearer-token, not cookie-based). Reviewed for over-permissiveness
  (wildcard `*`, reflecting arbitrary origins) — not present.
- **Password hashing**: bcrypt, cost factor 12 (`bcrypt.hash(password, 12)`) — reasonable.
- **JWT**: signed with `HS256` via a required `JWT_SECRET` (the app already fails to start at
  all if unset — `utils/jwt.ts` throws at import time, before any route or listener runs).
  Payload contains only `userId`/`role`, no PII. Default expiry 7 days
  (`JWT_EXPIRES_IN`), operator-configurable.
- **Error handling**: `errorHandler.ts` already never sends stack traces, DB internals, or
  file paths to the client (only `ApiError` instances' own message and status are exposed;
  anything else becomes a generic "Internal server error" — logged server-side only). No
  change needed; this was already correct.
- **`.env` / secrets**: confirmed only `.env.example` (placeholder values) exists anywhere in
  either the backend or frontend — no real `.env` file, no hardcoded API keys/secrets in any
  source file (checked for common key prefixes like `sk-`, `AIzaSy`, and generic
  `key = "..."`/`secret = "..."` patterns across the whole frontend and backend).
- **Future Android/iOS compatibility**: the API is already Bearer-token-authenticated (no
  cookies, no CORS dependency for a native client — CORS is a browser-only mechanism and
  doesn't apply to native HTTP clients at all). A future mobile app can call this API exactly
  as the web frontend does. Nothing about the fixes in this audit changes that.

---

## Tests actually performed (this environment)

- **Manual code review** of every controller, route, and middleware file in the backend
  (all touched files, plus a full pass over every controller for the IDOR audit).
- **Static balance/structure checks** (brace/paren/bracket matching, import-vs-export
  cross-referencing) on every new or edited file, backend and frontend.
- **`npx tsc --noEmit` — frontend: 0 errors**, run after every change in this session and
  again at the end. This is a real, full TypeScript compile check, not a review.
- **`npx tsc --noEmit` — backend: 47 pre-existing errors, same as before this session; zero
  of them are in any file this session added or touched** (verified by grepping the error
  output for every new/modified file's path — none appear). All 47 stem from one root cause
  unrelated to this audit's changes: this sandbox has never had a real generated Prisma
  client (`node_modules/.prisma/client/index.d.ts` is confirmed to be Prisma's placeholder
  stub — `export declare const PrismaClient: any` — because `npx prisma generate` needs to
  download an engine binary from `binaries.prisma.sh`, which isn't reachable from this
  sandbox's network allowlist). A handful of other pre-existing, unrelated type errors
  (`jwt.ts`'s jsonwebtoken overload mismatch, `voice.service.ts`'s Buffer/BlobPart mismatch)
  were also already present before this session and are untouched by it.
- **`npm audit`** — both frontend and backend, against the real npm registry (network-
  reachable in this sandbox). Findings and fixes above.
- **`node -e` load-check of `next.config.js`** — confirmed the new `headers()` config
  actually loads and resolves to the exact expected header set (shown in this session's
  transcript), since a full `next build` isn't possible here (see below).

## Tests NOT possible in this environment (and why)

- **Running the backend server and firing real requests at it** (login, upload a file, hit
  the rate limiter, fetch a signed vs. unsigned upload URL, verify the 403 on tampered/
  expired signatures) — no live PostgreSQL database and no working Prisma client are
  available in this sandbox (see above). This is the single biggest gap: **every fix in this
  document is verified by careful reading and static checks, not by observing it run.**
- **`npx prisma generate` / `npx prisma migrate deploy` / `npx prisma validate`** — all
  require downloading an engine binary from `binaries.prisma.sh`, not reachable here.
- **A full frontend production build (`npm run build`)** — fails in this sandbox specifically
  because `next build`'s font-optimization step needs `fonts.googleapis.com`, not in the
  network allowlist. (Unrelated to this audit's changes — `next/font` self-hosts at build
  time by design, this is purely an outbound-fetch-during-build restriction of the sandbox.)
  `tsc --noEmit` was used instead as the strongest type-check available here.
- **A real penetration test** (attempting to actually forge a signature, brute-force the rate
  limiter, or upload a genuinely malicious polyglot file) — no running instance to test
  against. Everything above is code-level reasoning about what the implemented checks do,
  not an observed attack-and-defend result.
- **Confirming the multer/xlsx dependency findings against a running app** — confirmed via
  `npm audit`'s advisory data only, not by attempting to actually exploit either in this app.

---

## Before this goes live

In priority order:

1. **Run this in a real environment first.** Every fix here needs to be exercised against a
   running backend + real Postgres database before launch — this sandbox could only verify
   code correctness, not runtime behavior. At minimum: register/login (and confirm the rate
   limiter engages after repeated bad attempts), upload a document/image and confirm it
   renders (signed URL works) and that a tampered/expired URL correctly 403s, and hit an
   AI-cost endpoint enough times to confirm `aiLimiter` engages.
2. **Set real secrets.** `JWT_SECRET` and the new `FILE_SIGNING_SECRET` must be long, random,
   and different from each other and from anything used in development. Rotate immediately if
   either has ever been committed, logged, or shared anywhere — this audit did not find either
   secret exposed anywhere in the repo, but that's a different guarantee from "never leaked
   outside it."
3. **Set `TRUST_PROXY=true` only if genuinely deployed behind a reverse proxy/load balancer**
   that sets `X-Forwarded-For` itself — confirm this matches actual deployment topology before
   flipping it, or rate limiting becomes trivially bypassable.
4. **Run `npx prisma generate && npx prisma migrate deploy`** in that real environment, then
   re-run `npx tsc --noEmit` on the backend and confirm it's clean — this audit could not
   perform that final confirmation itself (see "Tests NOT possible" above).
5. **Decide on the `xlsx` dependency** (finding #14) before accepting untrusted `.xlsx`/`.xls`
   uploads in production — either accept the documented residual risk, restrict that specific
   upload type, or migrate the library with real test coverage.
6. **Plan the Next.js major-version migration** (finding #16) — not urgent (the critical
   issues are already patched), but the remaining high-severity advisories need `next@16`,
   which is real migration work.
7. **If scaling beyond one backend instance**, move rate-limit state to a shared store
   (Redis) — the current in-memory store is per-process.

This document should be treated as a snapshot of what was checked and fixed in this session,
not a permanent guarantee — re-audit after any significant change to auth, file handling, or
AI provider integration.
