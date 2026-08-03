import { Response } from "express";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";

/**
 * GET /api/dashboard/summary
 * Returns aggregate usage stats + recent activity for the dashboard home screen.
 * Cheap enough to compute on read for now; if usage grows, move to a materialized
 * view or a nightly rollup table rather than changing this endpoint's contract.
 */
export async function getSummary(req: AuthedRequest, res: Response) {
  const userId = req.user!.userId;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalChats, totalMessages, messagesThisWeek, recentChats, modelUsage] =
    await Promise.all([
      prisma.chat.count({ where: { userId } }),
      prisma.message.count({ where: { chat: { userId } } }),
      prisma.message.count({
        where: { chat: { userId }, createdAt: { gte: oneWeekAgo } },
      }),
      prisma.chat.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, model: true, updatedAt: true },
      }),
      prisma.chat.groupBy({
        by: ["model"],
        where: { userId },
        _count: { model: true },
      }),
    ]);

  res.json({
    totalChats,
    totalMessages,
    messagesThisWeek,
    recentChats,
    modelUsage: modelUsage.map((m) => ({ model: m.model, count: m._count.model })),
  });
}
