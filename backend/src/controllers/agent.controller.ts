import { Response } from "express";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { createAgentSchema, runAgentSchema, updateAgentSchema } from "../utils/validation";
import { resolveUserModel } from "../utils/resolveUserModel";
import { runAgent } from "../services/agent.service";
import { AGENT_TOOLS } from "../services/agentTools.service";

export async function listAgentTools(_req: AuthedRequest, res: Response) {
  const tools = Object.values(AGENT_TOOLS).map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
  res.json({ tools });
}

export async function createAgent(req: AuthedRequest, res: Response) {
  const parsed = createAgentSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);
  const data = parsed.data;

  const model = await resolveUserModel(req.user!.userId, data.model);

  const agent = await prisma.agent.create({
    data: {
      userId: req.user!.userId,
      name: data.name,
      description: data.description,
      instructions: data.instructions,
      model,
      tools: data.tools ?? [],
      maxSteps: data.maxSteps ?? 6,
    },
  });

  res.status(201).json({ agent });
}

export async function listAgents(req: AuthedRequest, res: Response) {
  const agents = await prisma.agent.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ agents });
}

async function requireOwnedAgent(id: string, userId: string) {
  const agent = await prisma.agent.findFirst({ where: { id, userId } });
  if (!agent) throw new ApiError(404, "Agent not found");
  return agent;
}

export async function getAgent(req: AuthedRequest, res: Response) {
  const agent = await requireOwnedAgent(req.params.id, req.user!.userId);
  res.json({ agent });
}

export async function updateAgent(req: AuthedRequest, res: Response) {
  const parsed = updateAgentSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const agent = await requireOwnedAgent(req.params.id, req.user!.userId);
  if (agent.status === "RUNNING") {
    throw new ApiError(409, "Agent is currently running — wait for the run to finish before editing it");
  }

  const data = parsed.data;
  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: {
      name: data.name,
      description: data.description,
      instructions: data.instructions,
      model: data.model,
      tools: data.tools,
      maxSteps: data.maxSteps,
    },
  });

  res.json({ agent: updated });
}

export async function deleteAgent(req: AuthedRequest, res: Response) {
  const agent = await requireOwnedAgent(req.params.id, req.user!.userId);
  await prisma.agent.delete({ where: { id: agent.id } });
  res.status(204).end();
}

/**
 * Runs an agent task synchronously (same tradeoff as Deep Research — see
 * agent.service.ts) and returns the completed run with its full step trace.
 */
export async function startAgentRun(req: AuthedRequest, res: Response) {
  const parsed = runAgentSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const agent = await requireOwnedAgent(req.params.id, req.user!.userId);
  if (!agent.enabled) {
    throw new ApiError(403, "This agent has been disabled.");
  }
  if (agent.status === "RUNNING") {
    throw new ApiError(409, "This agent is already running a task");
  }

  const run = await runAgent(agent, parsed.data.task);
  res.status(201).json({ run });
}

export async function listAgentRuns(req: AuthedRequest, res: Response) {
  const agent = await requireOwnedAgent(req.params.id, req.user!.userId);
  const runs = await prisma.agentRun.findMany({
    where: { agentId: agent.id },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  res.json({ runs });
}

export async function getAgentRun(req: AuthedRequest, res: Response) {
  const agent = await requireOwnedAgent(req.params.id, req.user!.userId);
  const run = await prisma.agentRun.findFirst({
    where: { id: req.params.runId, agentId: agent.id },
    include: { steps: { orderBy: { index: "asc" } } },
  });
  if (!run) throw new ApiError(404, "Run not found");
  res.json({ run });
}
