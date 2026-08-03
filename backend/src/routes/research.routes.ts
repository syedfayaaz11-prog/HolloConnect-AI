import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createResearch,
  deleteResearch,
  exportResearchPdf,
  getResearch,
  listResearch,
} from "../controllers/research.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listResearch));
router.post("/", aiLimiter, asyncHandler(createResearch));
router.get("/:id", asyncHandler(getResearch));
router.delete("/:id", asyncHandler(deleteResearch));
router.get("/:id/pdf", asyncHandler(exportResearchPdf));

export default router;
