import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { getMyBilling, upgradePlan } from "../controllers/billing.controller";

const router = Router();

router.use(requireAuth);

router.get("/me", asyncHandler(getMyBilling));
router.post("/upgrade", asyncHandler(upgradePlan));

export default router;
