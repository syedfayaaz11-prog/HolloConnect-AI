import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createMemory,
  deleteMemory,
  getMemory,
  listMemories,
  listMemoryCategories,
  listMemoryTags,
  retrieveMemories,
  searchMemories,
  updateMemory,
} from "../controllers/memory.controller";

const router = Router();

router.use(requireAuth);

// Static/collection routes first — must come before "/:id" or Express would
// treat "search"/"categories"/etc. as an :id param.
router.get("/search", asyncHandler(searchMemories));
router.get("/categories", asyncHandler(listMemoryCategories));
router.get("/tags", asyncHandler(listMemoryTags));
router.post("/retrieve", asyncHandler(retrieveMemories));

router.get("/", asyncHandler(listMemories));
router.post("/", asyncHandler(createMemory));
router.get("/:id", asyncHandler(getMemory));
router.patch("/:id", asyncHandler(updateMemory));
router.delete("/:id", asyncHandler(deleteMemory));

export default router;
