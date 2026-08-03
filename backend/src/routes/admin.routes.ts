import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
  deleteAnyDocument,
  deleteAnyMemory,
  deleteUser,
  getAiUsageStats,
  getAuditLogs,
  getDashboardStats,
  getErrorLogs,
  getPlatformHealth,
  getSettings,
  getUserDetails,
  listAllAgents,
  listAllConversations,
  listAllDocuments,
  listAllMemories,
  listUsers,
  setAgentEnabled,
  setUserActive,
  updateAnyMemory,
  updateSettings,
  updateUserRole,
} from "../controllers/admin.controller";

const router = Router();

// Every admin route requires a valid session AND the ADMIN role — requireAdmin (already
// defined in middleware/auth.ts alongside requireAuth) was written when auth was first
// built but never wired into any route until the Admin Panel module.
router.use(requireAuth, requireAdmin);

router.get("/users", asyncHandler(listUsers));
router.get("/users/:id", asyncHandler(getUserDetails));
router.patch("/users/:id/status", asyncHandler(setUserActive));
router.patch("/users/:id/role", asyncHandler(updateUserRole));
router.delete("/users/:id", asyncHandler(deleteUser));

router.get("/stats", asyncHandler(getDashboardStats));
router.get("/health", asyncHandler(getPlatformHealth));
router.get("/ai-usage", asyncHandler(getAiUsageStats));
router.get("/errors", asyncHandler(getErrorLogs));
router.get("/audit-logs", asyncHandler(getAuditLogs));

// Part 3 — platform-wide listings the Part 2 frontend needed.
router.get("/memories", asyncHandler(listAllMemories));
router.patch("/memories/:id", asyncHandler(updateAnyMemory));
router.delete("/memories/:id", asyncHandler(deleteAnyMemory));

router.get("/agents", asyncHandler(listAllAgents));
router.patch("/agents/:id/status", asyncHandler(setAgentEnabled));

router.get("/conversations", asyncHandler(listAllConversations));

router.get("/documents", asyncHandler(listAllDocuments));
router.delete("/documents/:id", asyncHandler(deleteAnyDocument));

// OCR Jobs reuses the documents listing with ?onlyOcr=true — see admin.service.ts's
// listAllDocuments and the OCR note on getDashboardStats. No separate route/table.

router.get("/settings", asyncHandler(getSettings));
router.put("/settings", asyncHandler(updateSettings));

export default router;
