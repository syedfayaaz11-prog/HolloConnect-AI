import { Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { friendlyProviderError } from "../utils/friendlyError";
import { searchQuerySchema } from "../utils/validation";
import { runSearch } from "../services/search.service";
import { resolveUserModel } from "../utils/resolveUserModel";

export async function createSearch(req: AuthedRequest, res: Response) {
  const parsed = searchQuerySchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const userId = req.user!.userId;
  const model = await resolveUserModel(userId, parsed.data.model);

  let result;
  try {
    result = await runSearch(parsed.data.query, model);
  } catch (err) {
    // Surface a clear, actionable error rather than a generic 500 — most failures here
    // are missing/invalid provider API keys, which the user (or dev) can fix directly.
    throw new ApiError(502, friendlyProviderError(err, "search.controller"));
  }

  const record = await prisma.searchQuery.create({
    data: {
      userId,
      query: parsed.data.query,
      answer: result.answer,
      // Prisma's InputJsonValue doesn't structurally match a custom TypeScript interface
      // array even when it's fully JSON-serializable (every field here is a string) — this
      // is the standard, documented cast for storing a typed object/array in a Json column,
      // not a weakening of type safety. The actual shape is still enforced by
      // SearchAnswer/WebSearchResult everywhere else this data is produced or read.
      sources: result.sources as unknown as Prisma.InputJsonValue,
      followUps: result.followUps as unknown as Prisma.InputJsonValue,
      model,
    },
  });

  res.status(201).json({ search: record });
}

export async function listSearchHistory(req: AuthedRequest, res: Response) {
  const searches = await prisma.searchQuery.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, query: true, model: true, createdAt: true },
  });
  res.json({ searches });
}

export async function getSearch(req: AuthedRequest, res: Response) {
  const search = await prisma.searchQuery.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!search) throw new ApiError(404, "Search not found");
  res.json({ search });
}

export async function deleteSearch(req: AuthedRequest, res: Response) {
  const search = await prisma.searchQuery.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!search) throw new ApiError(404, "Search not found");
  await prisma.searchQuery.delete({ where: { id: search.id } });
  res.status(204).end();
}
