import { Response } from "express";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { friendlyProviderError } from "../utils/friendlyError";
import { researchTopicSchema } from "../utils/validation";
import { runDeepResearch } from "../services/research.service";
import { streamResearchPdf } from "../utils/pdf";
import { resolveUserModel } from "../utils/resolveUserModel";
import { Prisma } from "@prisma/client";

/**
 * Runs the full research pipeline synchronously and stores the result.
 * Synchronous is acceptable for an MVP given typical 15-40s completion time; if this
 * becomes a UX problem, move to: create PENDING record immediately, run the pipeline
 * in a background job (Automation module's queue), update status as it progresses,
 * and have the frontend poll/subscribe instead of awaiting one long request.
 */
export async function createResearch(req: AuthedRequest, res: Response) {
  const parsed = researchTopicSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const userId = req.user!.userId;
  const model = await resolveUserModel(userId, parsed.data.model);

  const pending = await prisma.researchReport.create({
    data: { userId, topic: parsed.data.topic, model, status: "RUNNING" },
  });

  try {
    const result = await runDeepResearch(parsed.data.topic, model);
    const updated = await prisma.researchReport.update({
      where: { id: pending.id },
      data: {
        status: "COMPLETE",
        sections: result.sections as unknown as Prisma.InputJsonValue,
        sources: result.sources as unknown as Prisma.InputJsonValue,
        timeline: result.timeline as unknown as Prisma.InputJsonValue,
        followUps: result.followUps as unknown as Prisma.InputJsonValue,
      },
    });
    res.status(201).json({ report: updated });
  } catch (err) {
    const friendly = friendlyProviderError(err, "research.controller");
    await prisma.researchReport.update({
      where: { id: pending.id },
      data: { status: "FAILED", error: friendly },
    });
    throw new ApiError(502, friendly);
  }
}

export async function listResearch(req: AuthedRequest, res: Response) {
  const reports = await prisma.researchReport.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, topic: true, status: true, model: true, createdAt: true },
  });
  res.json({ reports });
}

export async function getResearch(req: AuthedRequest, res: Response) {
  const report = await prisma.researchReport.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!report) throw new ApiError(404, "Research report not found");
  res.json({ report });
}

export async function deleteResearch(req: AuthedRequest, res: Response) {
  const report = await prisma.researchReport.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!report) throw new ApiError(404, "Research report not found");
  await prisma.researchReport.delete({ where: { id: report.id } });
  res.status(204).end();
}

export async function exportResearchPdf(req: AuthedRequest, res: Response) {
  const report = await prisma.researchReport.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!report) throw new ApiError(404, "Research report not found");
  if (report.status !== "COMPLETE") {
    throw new ApiError(400, "Report is not complete yet");
  }

  streamResearchPdf(res, {
    topic: report.topic,
    sections: (report.sections as { heading: string; content: string }[]) ?? [],
    sources: (report.sources as { title: string; url: string }[]) ?? [],
    createdAt: report.createdAt,
  });
}
