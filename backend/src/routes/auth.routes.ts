import { Router } from "express";
import { deleteMe, googleAuth, login, me, register, updateMe } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/register", authLimiter, asyncHandler(register));
router.post("/login", authLimiter, asyncHandler(login));
router.post("/google", authLimiter, asyncHandler(googleAuth));
router.get("/me", requireAuth, asyncHandler(me));
router.patch("/me", requireAuth, asyncHandler(updateMe));
router.delete("/me", requireAuth, asyncHandler(deleteMe));

export default router;
