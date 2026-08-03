import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
  assignChatToProject,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  renameProject,
} from "../controllers/project.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listProjects));
router.post("/", asyncHandler(createProject));
router.get("/:id", asyncHandler(getProject));
router.patch("/:id", asyncHandler(renameProject));
router.delete("/:id", asyncHandler(deleteProject));
router.post("/assign-chat", asyncHandler(assignChatToProject));

export default router;
