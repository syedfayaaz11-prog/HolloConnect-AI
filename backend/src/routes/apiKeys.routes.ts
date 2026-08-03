import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import { createApiKey, deleteApiKey, listApiKeys, testApiKey, updateApiKey } from "../controllers/apiKeys.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listApiKeys));
router.post("/", asyncHandler(createApiKey));
router.patch("/:id", asyncHandler(updateApiKey));
router.delete("/:id", asyncHandler(deleteApiKey));
// Shares the AI-call rate limiter — this makes a real outbound request to the provider,
// same cost-abuse shape as an actual completion call, even though it's not one.
router.post("/:id/test", aiLimiter, asyncHandler(testApiKey));

export default router;
