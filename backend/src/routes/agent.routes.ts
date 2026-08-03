import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createAgent,
  deleteAgent,
  getAgent,
  getAgentRun,
  listAgentRuns,
  listAgents,
  listAgentTools,
  startAgentRun,
  updateAgent,
} from "../controllers/agent.controller";

const router = Router();

router.use(requireAuth);

router.get("/tools", asyncHandler(listAgentTools));
router.get("/", asyncHandler(listAgents));
router.post("/", asyncHandler(createAgent));
router.get("/:id", asyncHandler(getAgent));
router.patch("/:id", asyncHandler(updateAgent));
router.delete("/:id", asyncHandler(deleteAgent));
router.get("/:id/runs", asyncHandler(listAgentRuns));
router.get("/:id/runs/:runId", asyncHandler(getAgentRun));
router.post("/:id/run", aiLimiter, asyncHandler(startAgentRun));

export default router;
