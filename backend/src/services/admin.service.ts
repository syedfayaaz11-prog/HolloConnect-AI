import { AuditAction, Prisma, Role } from "@prisma/client";
import os from "os";
import { prisma } from "../config/db";
import { getSchedulerStatus } from "./automationScheduler.service";
import { deleteFile } from "./storage.service";
import { getMemoryStats } from "./memory.service";

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  defaultModel: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export interface ListUsersFilters {
  query?: string; // matches email or name, case-insensitive
  role?: "USER" | "ADMIN";
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listUsers(filters: ListUsersFilters = {}) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 25, 100);

  const where: Prisma.UserWhereInput = {
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    ...(filters.query
      ? {
          OR: [
            { email: { contains: filters.query, mode: "insensitive" } },
            { name: { contains: filters.query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, pageSize };
}

/** Full detail view for one user, including counts of everything they own — a quick
    "how much has this account actually used the platform" glance for support/moderation. */
export async function getUserDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...SAFE_USER_SELECT,
      _count: {
        select: {
          chats: true,
          projects: true,
          documents: true,
          generatedImages: true,
          videoGenerations: true,
          automations: true,
          agents: true,
          memories: true,
          searchQueries: true,
          researchReports: true,
        },
      },
    },
  });
  return user;
}

/**
 * Enables/disables a user (blocks future logins — see auth.controller.ts) and records the
 * action in the audit log. Refuses to let an admin disable their own account (a real safety
 * check — locking yourself out with no other admin around to undo it is a genuine footgun).
 */
export async function setUserActive(
  actorId: string,
  targetUserId: string,
  isActive: boolean
): Promise<{ id: string; email: string; isActive: boolean } | null> {
  if (actorId === targetUserId && !isActive) {
    throw new Error("You can't disable your own account.");
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) return null;

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive },
    select: { id: true, email: true, isActive: true },
  });

  await writeAuditLog(actorId, isActive ? "USER_ENABLED" : "USER_DISABLED", "User", targetUserId);
  return updated;
}

/**
 * Deletes a user (cascades to their chats/documents/etc. via existing onDelete: Cascade
 * relations — see schema.prisma). Refuses to delete yourself, and refuses to delete the
 * last remaining admin account so the platform can never end up with zero admins.
 */
export async function deleteUser(actorId: string, targetUserId: string): Promise<boolean> {
  if (actorId === targetUserId) {
    throw new Error("You can't delete your own account.");
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) return false;

  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new Error("Can't delete the last remaining admin account.");
    }
  }

  // Write the audit log before deleting — targetId must still reference a real prior
  // action even though the User row itself won't exist after this completes.
  await writeAuditLog(actorId, "USER_DELETED", "User", targetUserId, { email: user.email });
  await prisma.user.delete({ where: { id: targetUserId } });
  return true;
}

async function writeAuditLog(
  actorId: string,
  action: AuditAction,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      // Same InputJsonValue structural-typing gap as search.controller.ts's sources/
      // followUps — Record<string, unknown> is genuinely JSON-safe but doesn't structurally
      // satisfy Prisma's InputJsonValue without an explicit cast. Kept as a ternary (rather
      // than `metadata ?? Prisma.JsonNull`) so the cast only applies to the actual-value
      // branch — Prisma.JsonNull already satisfies NullableJsonNullValueInput on its own.
      metadata: metadata ? (metadata as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

export async function listAuditLogs(page = 1, pageSize = 25) {
  const size = Math.min(pageSize, 100);
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * size,
      take: size,
      include: { actor: { select: { id: true, email: true, name: true } } },
    }),
    prisma.auditLog.count(),
  ]);
  return { logs, total, page, pageSize: size };
}

/** Aggregate counts for the admin dashboard's overview cards. */
export async function getDashboardStats() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    newUsersThisWeek,
    totalChats,
    totalMessages,
    totalAutomations,
    totalAgents,
    totalDocuments,
    totalOcrRequests,
    activeAgentIds,
    memoryStats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    prisma.chat.count(),
    prisma.message.count(),
    prisma.automation.count(),
    prisma.agent.count(),
    prisma.document.count(),
    // OCR isn't a separate record type (see PROJECT_PROGRESS.md) — it's any Document whose
    // upload was an image, dispatched through ocr.service.ts by documentExtract.service.ts.
    prisma.document.count({ where: { mimeType: { startsWith: "image/" } } }),
    // "Active" isn't a status Agent tracks directly (its `status` field is a concurrency
    // lock, IDLE/RUNNING) — defined here as "ran at least once in the last 30 days", a
    // genuine usage signal rather than an arbitrary flag.
    prisma.agentRun.findMany({
      where: { startedAt: { gte: thirtyDaysAgo } },
      select: { agentId: true },
      distinct: ["agentId"],
    }),
    getMemoryStats(),
  ]);

  return {
    totalUsers,
    activeUsers,
    disabledUsers: totalUsers - activeUsers,
    newUsersThisWeek,
    totalChats,
    totalMessages,
    totalAutomations,
    totalAgents,
    totalDocuments,
    totalOcrRequests,
    activeAgents: activeAgentIds.length,
    memoryStats,
  };
}

/** Platform health: real signals (DB connectivity, scheduler heartbeat, process uptime/
    memory, CPU load), not fake/hardcoded "all green" status. */
export async function getPlatformHealth() {
  let databaseOk = true;
  let databaseError: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    databaseOk = false;
    databaseError = (err as Error).message;
  }

  const scheduler = getSchedulerStatus();
  const memory = process.memoryUsage();

  // Real CPU signal via Node's os module: 1-minute load average normalized by core count,
  // the standard way to approximate "CPU usage %" without an external monitoring agent.
  // Not available/meaningful on Windows (os.loadavg() always returns [0,0,0] there), which
  // is fine — this app's deploy targets are Linux containers.
  const loadAvg1Min = os.loadavg()[0];
  const cpuCount = os.cpus().length;
  const cpuUsagePercent = cpuCount > 0 ? Math.min(100, Math.round((loadAvg1Min / cpuCount) * 100)) : null;

  return {
    status: databaseOk ? "healthy" : "degraded",
    database: { ok: databaseOk, error: databaseError },
    automationScheduler: scheduler,
    process: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      memoryUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      memoryTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      cpuUsagePercent,
      cpuCount,
    },
    checkedAt: new Date().toISOString(),
  };
}

/** AI usage aggregated by model — across chats and messages, platform-wide (admin view,
    not scoped to one user like Dashboard #2's per-user stats). */
export async function getAiUsageStats() {
  const [chatsByModel, messagesByModel] = await Promise.all([
    prisma.chat.groupBy({ by: ["model"], _count: { model: true } }),
    prisma.message.groupBy({ by: ["model"], _count: { model: true } }),
  ]);

  return {
    chatsByModel: chatsByModel.map((c) => ({ model: c.model, count: c._count.model })),
    messagesByModel: messagesByModel
      .filter((m) => m.model !== null)
      .map((m) => ({ model: m.model as string, count: m._count.model })),
  };
}

// ---------------------------------------------------------------------------
// Admin Panel Part 3 — the remaining platform-wide listings Part 2's frontend needed but
// Part 1's backend didn't build. Each existing per-user API (chat/agents/documents) stays
// exactly as-is and user-scoped; these are separate, admin-only, read-mostly views.

export interface AdminListFilters {
  query?: string;
  page?: number;
  pageSize?: number;
}

function paginate(filters: AdminListFilters) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 25, 100);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export async function listAllAgents(filters: AdminListFilters = {}) {
  const { page, pageSize, skip } = paginate(filters);
  const where: Prisma.AgentWhereInput = filters.query
    ? { name: { contains: filters.query, mode: "insensitive" } }
    : {};

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        user: { select: { id: true, email: true } },
        _count: { select: { runs: true } },
      },
    }),
    prisma.agent.count({ where }),
  ]);

  return { agents, total, page, pageSize };
}

export async function setAgentEnabled(id: string, enabled: boolean) {
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) return null;
  return prisma.agent.update({ where: { id }, data: { enabled } });
}

/**
 * Metadata-only conversation listing — deliberately does NOT include message content.
 * Reading another user's actual conversation text is a real privacy line worth holding by
 * default; if a future support workflow genuinely needs full transcript access, that should
 * be its own explicit, audited action, not bundled into a general admin list endpoint.
 */
export async function listAllConversations(filters: AdminListFilters = {}) {
  const { page, pageSize, skip } = paginate(filters);
  const where: Prisma.ChatWhereInput = filters.query
    ? { title: { contains: filters.query, mode: "insensitive" } }
    : {};

  const [chats, total] = await Promise.all([
    prisma.chat.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        model: true,
        pinned: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, email: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.chat.count({ where }),
  ]);

  return { chats, total, page, pageSize };
}

export interface AdminListDocumentsFilters extends AdminListFilters {
  onlyOcr?: boolean; // filters to image uploads — see the OCR note on getDashboardStats
}

export async function listAllDocuments(filters: AdminListDocumentsFilters = {}) {
  const { page, pageSize, skip } = paginate(filters);
  const where: Prisma.DocumentWhereInput = {
    ...(filters.query ? { filename: { contains: filters.query, mode: "insensitive" } } : {}),
    ...(filters.onlyOcr ? { mimeType: { startsWith: "image/" } } : {}),
  };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        filename: true,
        fileUrl: true,
        mimeType: true,
        status: true,
        error: true,
        createdAt: true,
        user: { select: { id: true, email: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);

  return { documents, total, page, pageSize };
}

export async function adminDeleteDocument(id: string): Promise<boolean> {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return false;
  await deleteFile(document.fileUrl);
  await prisma.document.delete({ where: { id } });
  return true;
}

export async function updateUserRole(actorId: string, targetUserId: string, role: Role) {
  if (actorId === targetUserId) {
    throw new Error("You can't change your own role.");
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) return null;

  if (user.role === "ADMIN" && role === "USER") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new Error("Can't demote the last remaining admin account.");
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { role },
    select: { id: true, email: true, role: true },
  });

  await writeAuditLog(actorId, "USER_ROLE_CHANGED", "User", targetUserId, {
    previousRole: user.role,
    newRole: role,
  });
  return updated;
}

// ---------------------------------------------------------------------------
// Settings — real DB persistence (Setting model), replacing Part 2's local-only form.
// Stored as one JSON blob under a fixed key so adding a new setting field later is a
// code change (extend DEFAULT_SETTINGS + the frontend form), not a migration.

const SETTINGS_KEY = "platform";

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultModel: string;
  allowSignups: boolean;
  requireEmailVerification: boolean;
  maxUploadMb: number;
  sessionLengthDays: number;
  featureFlags: {
    deepResearch: boolean;
    agents: boolean;
    automation: boolean;
    voiceMode: boolean;
  };
  // Subscription pricing (INR/month) — the Pricing page reads these via /api/billing/plans
  // rather than hardcoding them, so an admin can change prices without a redeploy.
  proPriceInr: number;
  ultraPriceInr: number;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: "HolloConnect AI",
  supportEmail: "",
  defaultModel: "claude-sonnet-4",
  allowSignups: true,
  requireEmailVerification: false,
  maxUploadMb: 20,
  sessionLengthDays: 7,
  featureFlags: { deepResearch: true, agents: true, automation: true, voiceMode: true },
  proPriceInr: 999,
  ultraPriceInr: 2499,
};

export async function getSettings(): Promise<PlatformSettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row) return DEFAULT_SETTINGS;
  // Merge over defaults so adding a new field to PlatformSettings later doesn't break
  // reading rows saved before that field existed.
  return { ...DEFAULT_SETTINGS, ...(row.value as Partial<PlatformSettings>) };
}

// Partial<PlatformSettings> alone only makes the top-level fields optional — featureFlags
// would still require all four flags whenever present. The actual runtime behavior below
// (spreading patch.featureFlags over current.featureFlags) already supports updating just
// one flag at a time, matching updateSettingsSchema's own nested-optional shape — this type
// just needed to say so explicitly, since TypeScript's Partial<T> doesn't do that recursively.
export async function updateSettings(
  patch: Partial<Omit<PlatformSettings, "featureFlags">> & {
    featureFlags?: Partial<PlatformSettings["featureFlags"]>;
  }
): Promise<PlatformSettings> {
  const current = await getSettings();
  const next: PlatformSettings = {
    ...current,
    ...patch,
    featureFlags: { ...current.featureFlags, ...patch.featureFlags },
  };

  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: next as unknown as Prisma.InputJsonValue },
    update: { value: next as unknown as Prisma.InputJsonValue },
  });

  return next;
}
