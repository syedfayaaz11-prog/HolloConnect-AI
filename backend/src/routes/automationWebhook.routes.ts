import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { webhookLimiter } from "../middleware/rateLimit";
import { triggerAutomationWebhook } from "../controllers/automation.controller";

const router = Router();

// Deliberately unauthenticated — see triggerAutomationWebhook's doc comment. Mounted at
// /api/automations/webhook/:token, distinct from the authed CRUD router.
router.post("/:token", webhookLimiter, asyncHandler(triggerAutomationWebhook));

export default router;
