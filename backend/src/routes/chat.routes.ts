import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import { deleteChat, getChat, listChats, sendMessage, updateChat } from "../controllers/chat.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listChats));
router.get("/:id", asyncHandler(getChat));
router.patch("/:id", asyncHandler(updateChat));
router.delete("/:id", asyncHandler(deleteChat));
router.post("/message", aiLimiter, asyncHandler(sendMessage));

export default router;
