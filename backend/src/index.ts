import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes";
import chatRoutes from "./routes/chat.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import projectRoutes from "./routes/project.routes";
import searchRoutes from "./routes/search.routes";
import researchRoutes from "./routes/research.routes";
import imageRoutes from "./routes/image.routes";
import videoRoutes from "./routes/video.routes";
import voiceRoutes from "./routes/voice.routes";
import documentRoutes from "./routes/document.routes";
import automationRoutes from "./routes/automation.routes";
import automationWebhookRoutes from "./routes/automationWebhook.routes";
import agentRoutes from "./routes/agent.routes";
import memoryRoutes from "./routes/memory.routes";
import adminRoutes from "./routes/admin.routes";
import billingRoutes from "./routes/billing.routes";
import apiKeysRoutes from "./routes/apiKeys.routes";
import uploadsRoutes from "./routes/uploads.routes";
import { errorHandler } from "./middleware/errorHandler";
import { globalApiLimiter } from "./middleware/rateLimit";
import { startAutomationScheduler } from "./services/automationScheduler.service";

const app = express();

// Only trust X-Forwarded-For (used by rate limiting and req.ip generally) when this app is
// actually deployed behind a reverse proxy/load balancer that sets it — blindly trusting it
// otherwise lets a client spoof their own IP and dodge rate limits entirely. Opt in
// explicitly via TRUST_PROXY=true in .env once you know your deployment topology.
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// Security headers — CSP is locked down for what is purely a JSON API plus a
// signed-URL file-serving route, not an HTML-serving app (that's the separate Next.js
// frontend). connectSrc/imgSrc etc. only matter for the rare HTML response this server ever
// sends (e.g. an error page a browser navigated to directly); the frontend has its own CSP
// (see frontend/next.config.js).
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // uploads route is fetched cross-origin by the frontend's own domain
  })
);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));

// Baseline rate limit across the whole API, on top of the tighter per-route limiters
// (auth, AI-cost endpoints, the automation webhook) applied inside each router.
app.use("/api", globalApiLimiter);

// Locally stored generated media/documents — requires a valid, time-limited signature (see
// utils/signedFileUrl.ts) instead of being served to anyone who has or guesses the URL.
app.use("/uploads", uploadsRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/research", researchRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/automations", automationRoutes);
app.use("/api/automations/webhook", automationWebhookRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/memory", memoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/api-keys", apiKeysRoutes);

// Any /api/* route that didn't match one of the routers above — without this, Express's
// default 404 is plain text ("Cannot GET /api/whatever"), which every frontend API client
// then fails to res.json()-parse, surfacing a raw "Unexpected token..." parsing error to the
// user instead of a clean message.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found." });
});

// Must be registered last.
app.use(errorHandler);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`HolloConnect API listening on :${PORT}`);
  // Left as you had it (commented out) — not touched. Automations/scheduled jobs won't run
  // until this is uncommented; see the summary for why I didn't re-enable it myself.
  // startAutomationScheduler();
});
