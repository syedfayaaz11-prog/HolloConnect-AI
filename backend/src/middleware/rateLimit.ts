import rateLimit from "express-rate-limit";
import { Request } from "express";
import { AuthedRequest } from "./auth";

// Keys by authenticated user id when available (so one user can't dodge their own limit by
// rotating IPs, and one shared office/NAT IP doesn't get everyone throttled together), and
// falls back to IP for unauthenticated routes (login, register, the automation webhook).
function keyByUserOrIp(req: Request): string {
  const userId = (req as AuthedRequest).user?.userId;
  return userId ?? (req.ip as string);
}

/**
 * Login and register — the classic brute-force/credential-stuffing target. Deliberately
 * tight; a real user mistyping a password a handful of times in 15 minutes is normal, dozens
 * of attempts is not.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

/**
 * Every endpoint that triggers a real, metered AI-provider call (chat, search, research,
 * image/video/voice generation, agent runs, and the automation trigger/webhook) shares this
 * limiter — the actual cost-abuse surface named in the audit. Generous enough for normal use
 * (a busy chat session, iterating on an image prompt) while bounding how much one identity
 * can spend in a window if a token/session were ever compromised or scripted against.
 */
export const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: "You're sending requests too quickly. Please slow down and try again shortly." },
});

/** Applied to every /api route as a floor, before any router's own requireAuth has run —
    so in practice this is IP-keyed (keyByUserOrIp's user branch never has a populated
    req.user this early), which is fine for a broad baseline. The more precise, per-user
    limiters (authLimiter, aiLimiter, webhookLimiter above) run inside each router, after
    requireAuth, where user-based keying actually applies. */
export const globalApiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 400,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
});

/**
 * The automation webhook trigger is unauthenticated by design (the URL's own 192-bit token
 * is the auth) and may legitimately be called by a third-party automation service from a
 * shared/rotating IP — so this keys by the token itself (which automation is being
 * triggered) rather than by IP, bounding how often any one automation can be fired
 * regardless of where the request comes from.
 */
export const webhookLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.params.token ?? (req.ip as string),
  message: { error: "This automation is being triggered too frequently. Please slow down." },
});
