import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import {
  adminListDocumentsQuerySchema,
  adminListMemoriesQuerySchema,
  adminListQuerySchema,
  listUsersQuerySchema,
  paginationQuerySchema,
  setAgentEnabledSchema,
  setUserActiveSchema,
  updateMemorySchema,
  updateSettingsSchema,
  updateUserRoleSchema,
} from "../utils/validation";
import * as adminService from "../services/admin.service";
import * as memoryService from "../services/memory.service";
import { listErrorLogs } from "../services/errorLog.service";

export async function listUsers(req: AuthedRequest, res: Response) {
  const parsed = listUsersQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const result = await adminService.listUsers(parsed.data);
  res.json(result);
}

export async function getUserDetails(req: AuthedRequest, res: Response) {
  const user = await adminService.getUserDetails(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  res.json({ user });
}

export async function setUserActive(req: AuthedRequest, res: Response) {
  const parsed = setUserActiveSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  try {
    const user = await adminService.setUserActive(req.user!.userId, req.params.id, parsed.data.isActive);
    if (!user) throw new ApiError(404, "User not found");
    res.json({ user });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, (err as Error).message);
  }
}

export async function updateUserRole(req: AuthedRequest, res: Response) {
  const parsed = updateUserRoleSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  try {
    const user = await adminService.updateUserRole(req.user!.userId, req.params.id, parsed.data.role);
    if (!user) throw new ApiError(404, "User not found");
    res.json({ user });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, (err as Error).message);
  }
}

export async function deleteUser(req: AuthedRequest, res: Response) {
  try {
    const deleted = await adminService.deleteUser(req.user!.userId, req.params.id);
    if (!deleted) throw new ApiError(404, "User not found");
    res.status(204).end();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, (err as Error).message);
  }
}

export async function getDashboardStats(_req: AuthedRequest, res: Response) {
  const stats = await adminService.getDashboardStats();
  res.json(stats);
}

export async function getPlatformHealth(_req: AuthedRequest, res: Response) {
  const health = await adminService.getPlatformHealth();
  res.json(health);
}

export async function getAiUsageStats(_req: AuthedRequest, res: Response) {
  const usage = await adminService.getAiUsageStats();
  res.json(usage);
}

export async function getErrorLogs(req: AuthedRequest, res: Response) {
  const parsed = paginationQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const result = await listErrorLogs(parsed.data.page ?? 1, parsed.data.pageSize ?? 25);
  res.json(result);
}

export async function getAuditLogs(req: AuthedRequest, res: Response) {
  const parsed = paginationQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const result = await adminService.listAuditLogs(parsed.data.page ?? 1, parsed.data.pageSize ?? 25);
  res.json(result);
}

// ---------------------------------------------------------------------------
// Admin Panel Part 3

export async function listAllMemories(req: AuthedRequest, res: Response) {
  const parsed = adminListMemoriesQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const result = await memoryService.adminListMemories(parsed.data);
  res.json(result);
}

export async function updateAnyMemory(req: AuthedRequest, res: Response) {
  const parsed = updateMemorySchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const memory = await memoryService.adminUpdateMemory(req.params.id, parsed.data);
  if (!memory) throw new ApiError(404, "Memory not found");
  res.json({ memory });
}

export async function deleteAnyMemory(req: AuthedRequest, res: Response) {
  const deleted = await memoryService.adminDeleteMemory(req.params.id);
  if (!deleted) throw new ApiError(404, "Memory not found");
  res.status(204).end();
}

export async function listAllAgents(req: AuthedRequest, res: Response) {
  const parsed = adminListQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const result = await adminService.listAllAgents(parsed.data);
  res.json(result);
}

export async function setAgentEnabled(req: AuthedRequest, res: Response) {
  const parsed = setAgentEnabledSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const agent = await adminService.setAgentEnabled(req.params.id, parsed.data.enabled);
  if (!agent) throw new ApiError(404, "Agent not found");
  res.json({ agent });
}

export async function listAllConversations(req: AuthedRequest, res: Response) {
  const parsed = adminListQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const result = await adminService.listAllConversations(parsed.data);
  res.json(result);
}

export async function listAllDocuments(req: AuthedRequest, res: Response) {
  const parsed = adminListDocumentsQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const result = await adminService.listAllDocuments(parsed.data);
  res.json(result);
}

export async function deleteAnyDocument(req: AuthedRequest, res: Response) {
  const deleted = await adminService.adminDeleteDocument(req.params.id);
  if (!deleted) throw new ApiError(404, "Document not found");
  res.status(204).end();
}

export async function getSettings(_req: AuthedRequest, res: Response) {
  const settings = await adminService.getSettings();
  res.json({ settings });
}

export async function updateSettings(req: AuthedRequest, res: Response) {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const settings = await adminService.updateSettings(parsed.data);
  res.json({ settings });
}
