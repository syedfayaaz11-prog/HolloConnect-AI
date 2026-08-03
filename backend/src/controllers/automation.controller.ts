import { Response, Request } from "express";
import crypto from "crypto";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { createAutomationSchema, updateAutomationSchema } from "../utils/validation";
import { computeNextRun, executeAutomation } from "../services/automationEngine.service";
import { resolveUserModel } from "../utils/resolveUserModel";

export async function createAutomation(req: AuthedRequest, res: Response) {
  const parsed = createAutomationSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);
  const data = parsed.data;

  let nextRunAt: Date | null = null;
  let webhookToken: string | null = null;

  if (data.type === "SCHEDULED") {
    try {
      nextRunAt = computeNextRun(data.cronExpression!);
    } catch {
      throw new ApiError(400, "Invalid cron expression");
    }
  } else if (data.type === "ONE_TIME") {
    nextRunAt = data.runAt!;
  } else {
    webhookToken = crypto.randomBytes(24).toString("hex");
  }

  const model = await resolveUserModel(req.user!.userId, data.model);

  const automation = await prisma.automation.create({
    data: {
      userId: req.user!.userId,
      name: data.name,
      description: data.description,
      prompt: data.prompt,
      model,
      type: data.type,
      cronExpression: data.cronExpression,
      runAt: data.runAt,
      nextRunAt,
      webhookToken,
    },
  });

  res.status(201).json({ automation });
}

export async function listAutomations(req: AuthedRequest, res: Response) {
  const automations = await prisma.automation.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ automations });
}

export async function getAutomation(req: AuthedRequest, res: Response) {
  const automation = await prisma.automation.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!automation) throw new ApiError(404, "Automation not found");
  res.json({ automation });
}

export async function updateAutomation(req: AuthedRequest, res: Response) {
  const parsed = updateAutomationSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const automation = await prisma.automation.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!automation) throw new ApiError(404, "Automation not found");

  const data = parsed.data;
  let nextRunAt = automation.nextRunAt;

  if (data.cronExpression && automation.type === "SCHEDULED") {
    try {
      nextRunAt = computeNextRun(data.cronExpression);
    } catch {
      throw new ApiError(400, "Invalid cron expression");
    }
  }
  if (data.runAt && automation.type === "ONE_TIME") {
    nextRunAt = data.runAt;
  }

  const updated = await prisma.automation.update({
    where: { id: automation.id },
    data: {
      name: data.name,
      description: data.description,
      prompt: data.prompt,
      model: data.model,
      cronExpression: data.cronExpression,
      runAt: data.runAt,
      status: data.status,
      nextRunAt,
    },
  });

  res.json({ automation: updated });
}

export async function deleteAutomation(req: AuthedRequest, res: Response) {
  const automation = await prisma.automation.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!automation) throw new ApiError(404, "Automation not found");
  await prisma.automation.delete({ where: { id: automation.id } });
  res.status(204).end();
}

export async function listAutomationRuns(req: AuthedRequest, res: Response) {
  const automation = await prisma.automation.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!automation) throw new ApiError(404, "Automation not found");

  const runs = await prisma.automationRun.findMany({
    where: { automationId: automation.id },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  res.json({ runs });
}

/** Manually runs an automation immediately, regardless of its schedule. */
export async function runAutomationNow(req: AuthedRequest, res: Response) {
  const automation = await prisma.automation.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!automation) throw new ApiError(404, "Automation not found");

  await executeAutomation(automation);

  const latestRun = await prisma.automationRun.findFirst({
    where: { automationId: automation.id },
    orderBy: { startedAt: "desc" },
  });
  res.json({ run: latestRun });
}

/**
 * Public webhook endpoint — deliberately NOT behind requireAuth, since external services
 * (the whole point of a trigger-based automation) can't hold a user's JWT. Authenticated
 * instead by the unguessable token embedded in the URL, generated at creation time.
 */
export async function triggerAutomationWebhook(req: Request, res: Response) {
  const automation = await prisma.automation.findFirst({
    where: { webhookToken: req.params.token, type: "TRIGGER" },
  });
  if (!automation) throw new ApiError(404, "Automation not found");
  if (automation.status !== "ACTIVE") throw new ApiError(409, "Automation is paused");

  await executeAutomation(automation);
  res.json({ status: "triggered" });
}
