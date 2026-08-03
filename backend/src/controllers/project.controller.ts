import { Response } from "express";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { assignChatToProjectSchema, createProjectSchema } from "../utils/validation";

export async function listProjects(req: AuthedRequest, res: Response) {
  const projects = await prisma.project.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chats: true } } },
  });
  res.json({ projects });
}

export async function createProject(req: AuthedRequest, res: Response) {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const project = await prisma.project.create({
    data: { name: parsed.data.name, userId: req.user!.userId },
  });
  res.status(201).json({ project });
}

export async function getProject(req: AuthedRequest, res: Response) {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    include: { chats: { orderBy: { updatedAt: "desc" } } },
  });
  if (!project) throw new ApiError(404, "Project not found");
  res.json({ project });
}

export async function renameProject(req: AuthedRequest, res: Response) {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!project) throw new ApiError(404, "Project not found");

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { name: parsed.data.name },
  });
  res.json({ project: updated });
}

export async function deleteProject(req: AuthedRequest, res: Response) {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!project) throw new ApiError(404, "Project not found");

  // Chats in the project are kept, just detached (schema uses onDelete: SetNull).
  await prisma.project.delete({ where: { id: project.id } });
  res.status(204).end();
}

/** Move an existing chat into (or out of, with projectId: null) a project. */
export async function assignChatToProject(req: AuthedRequest, res: Response) {
  const parsed = assignChatToProjectSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);
  const { chatId, projectId } = parsed.data;

  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId: req.user!.userId } });
  if (!chat) throw new ApiError(404, "Chat not found");

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.userId },
    });
    if (!project) throw new ApiError(404, "Project not found");
  }

  const updated = await prisma.chat.update({ where: { id: chatId }, data: { projectId } });
  res.json({ chat: updated });
}
