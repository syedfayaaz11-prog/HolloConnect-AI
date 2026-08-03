import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import {
  createMemorySchema,
  updateMemorySchema,
  listMemoriesQuerySchema,
  searchMemoriesQuerySchema,
  retrieveMemoriesSchema,
} from "../utils/validation";
import * as memoryService from "../services/memory.service";

export async function createMemory(req: AuthedRequest, res: Response) {
  const parsed = createMemorySchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const memory = await memoryService.createMemory(req.user!.userId, parsed.data);
  res.status(201).json({ memory });
}

export async function listMemories(req: AuthedRequest, res: Response) {
  const parsed = listMemoriesQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const result = await memoryService.listMemories(req.user!.userId, parsed.data);
  res.json(result);
}

export async function searchMemories(req: AuthedRequest, res: Response) {
  const parsed = searchMemoriesQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const { q, ...filters } = parsed.data;
  const result = await memoryService.searchMemories(req.user!.userId, q, filters);
  res.json(result);
}

export async function listMemoryCategories(req: AuthedRequest, res: Response) {
  const categories = await memoryService.listCategories(req.user!.userId);
  res.json({ categories });
}

export async function listMemoryTags(req: AuthedRequest, res: Response) {
  const tags = await memoryService.listTags(req.user!.userId);
  res.json({ tags });
}

export async function retrieveMemories(req: AuthedRequest, res: Response) {
  const parsed = retrieveMemoriesSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const { query, ...options } = parsed.data;
  const results = await memoryService.retrieveRelevantMemories(req.user!.userId, query, options);
  res.json({
    results: results.map((r) => ({ memory: r.memory, score: r.score })),
  });
}

export async function getMemory(req: AuthedRequest, res: Response) {
  const memory = await memoryService.getMemoryById(req.user!.userId, req.params.id);
  if (!memory) throw new ApiError(404, "Memory not found");
  res.json({ memory });
}

export async function updateMemory(req: AuthedRequest, res: Response) {
  const parsed = updateMemorySchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const memory = await memoryService.updateMemory(req.user!.userId, req.params.id, parsed.data);
  if (!memory) throw new ApiError(404, "Memory not found");
  res.json({ memory });
}

export async function deleteMemory(req: AuthedRequest, res: Response) {
  const deleted = await memoryService.deleteMemory(req.user!.userId, req.params.id);
  if (!deleted) throw new ApiError(404, "Memory not found");
  res.status(204).end();
}
