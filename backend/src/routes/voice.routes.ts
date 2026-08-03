import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import { wrapMulter, uploadAudio } from "../middleware/upload";
import { getVoiceSettings, speak, transcribe, updateVoiceSettings } from "../controllers/voice.controller";

const router = Router();

router.use(requireAuth);

router.post("/transcribe", aiLimiter, wrapMulter(uploadAudio.single("audio")), asyncHandler(transcribe));
router.post("/speak", aiLimiter, asyncHandler(speak));
router.get("/settings", asyncHandler(getVoiceSettings));
router.patch("/settings", asyncHandler(updateVoiceSettings));

export default router;
