import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createAutomation,
  deleteAutomation,
  getAutomation,
  listAutomationRuns,
  listAutomations,
  runAutomationNow,
  updateAutomation,
} from "../controllers/automation.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listAutomations));
router.post("/", asyncHandler(createAutomation));
router.get("/:id", asyncHandler(getAutomation));
router.patch("/:id", asyncHandler(updateAutomation));
router.delete("/:id", asyncHandler(deleteAutomation));
router.get("/:id/runs", asyncHandler(listAutomationRuns));
router.post("/:id/run-now", aiLimiter, asyncHandler(runAutomationNow));

export default router;
