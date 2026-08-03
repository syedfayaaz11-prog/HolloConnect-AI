import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import { createSearch, deleteSearch, getSearch, listSearchHistory } from "../controllers/search.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listSearchHistory));
router.post("/", aiLimiter, asyncHandler(createSearch));
router.get("/:id", asyncHandler(getSearch));
router.delete("/:id", asyncHandler(deleteSearch));

export default router;
