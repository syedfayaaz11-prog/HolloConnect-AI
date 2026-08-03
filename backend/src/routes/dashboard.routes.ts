import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { getSummary } from "../controllers/dashboard.controller";

const router = Router();

router.use(requireAuth);
router.get("/summary", asyncHandler(getSummary));

export default router;
