/**
 * Shared Memory service (module 15).
 *
 * One `Memory` model covers every memory "kind" the product needs — long-term,
 * short-term, user preferences, facts, and summaries — discriminated by
 * `type`. This file is the only place that talks to the `memories` table;
 * callers (Chat, AI Agents, Automation, the controller) go through these
 * functions rather than querying Prisma directly, same convention as
 * `automationEngine.service.ts` / `agentTools.service.ts`.
 *
 * Wired into Chat (`chat.controller.ts`), AI Agents (`agentTools.service.ts`'s
 * recall_memory/save_memory tools + `agent.service.ts`'s system prompt), and
 * Automation (`automationEngine.service.ts`) as of Part 2 — see
 * PROJECT_PROGRESS.md for the full breakdown of what each integration does.
 */

import { Memory, MemoryType, Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { getCompletion } from "./ai.service";

export interface CreateMemoryInput {
  type: MemoryType;
  category?: string;
  key?: string;
  content: string;
  tags?: string[];
  importance?: number;
  source?: string;
  metadata?: Record<string, unknown>;
  pinned?: boolean;
  expiresAt?: Date;
}

// Partial<CreateMemoryInput> alone can't just be intersected with `{ category?: string |
// null }` to "add" null support — TypeScript intersects the two allowed types for the same
// property (`string | undefined` & `string | null | undefined`), which silently drops
// `null` again since it isn't common to both sides. Omitting the conflicting keys from the
// Partial first, then adding the nullable versions, is what actually makes them nullable.
export type UpdateMemoryInput = Omit<
  Partial<CreateMemoryInput>,
  "category" | "key" | "source" | "expiresAt"
> & {
  category?: string | null;
  key?: string | null;
  source?: string | null;
  expiresAt?: Date | null;
};

export interface ListMemoriesFilters {
  type?: MemoryType;
  category?: string;
  tag?: string;
  pinned?: boolean;
  source?: string;
  includeExpired?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListMemoriesResult {
  memories: Memory[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 25;

/**
 * Gates only the *automatic, passive* memory usage — recall context injected into Chat/Agent/
 * Automation prompts, and automatic fact-extraction/summary-refresh after them — per the
 * Settings page's "Memory" toggle. Deliberately NOT used by listMemories/searchMemories/
 * createMemory/etc. (the Memory page's own browse/search/CRUD) or by the recall_memory/
 * save_memory agent tools (an explicit capability the user equipped that specific agent
 * with) — disabling automatic memory shouldn't hide a user's existing memories from them or
 * take away a tool they deliberately gave an agent.
 */
export async function isMemoryEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { memoryEnabled: true } });
  return user?.memoryEnabled ?? true;
}

// Short-term memories created without an explicit expiry default to a 24h TTL —
// they're meant to be transient by definition; callers can always pass their own.
const DEFAULT_SHORT_TERM_TTL_MS = 24 * 60 * 60 * 1000;

/** Builds the base "not expired" clause shared by list/search/retrieve. */
function notExpiredClause(includeExpired?: boolean): Prisma.MemoryWhereInput {
  if (includeExpired) return {};
  return {
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
}

function tagsContain(tag: string): Prisma.MemoryWhereInput {
  // tags is stored as a JSON string[]; `array_contains` works for Postgres JSONB via Prisma.
  return { tags: { array_contains: [tag] } };
}

export async function createMemory(userId: string, input: CreateMemoryInput): Promise<Memory> {
  const expiresAt =
    input.expiresAt ?? (input.type === "SHORT_TERM" ? new Date(Date.now() + DEFAULT_SHORT_TERM_TTL_MS) : undefined);

  return prisma.memory.create({
    data: {
      userId,
      type: input.type,
      category: input.category,
      key: input.key,
      content: input.content,
      tags: (input.tags ?? []) as Prisma.InputJsonValue,
      importance: input.importance ?? 5,
      source: input.source,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      pinned: input.pinned ?? false,
      expiresAt: expiresAt ?? null,
    },
  });
}

export async function listMemories(userId: string, filters: ListMemoriesFilters): Promise<ListMemoriesResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  const where: Prisma.MemoryWhereInput = {
    userId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.pinned !== undefined ? { pinned: filters.pinned } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.tag ? tagsContain(filters.tag) : {}),
    ...notExpiredClause(filters.includeExpired),
  };

  const [memories, total] = await Promise.all([
    prisma.memory.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.memory.count({ where }),
  ]);

  return { memories, total, page, pageSize };
}

export async function getMemoryById(userId: string, id: string): Promise<Memory | null> {
  return prisma.memory.findFirst({ where: { id, userId } });
}

export async function updateMemory(userId: string, id: string, input: UpdateMemoryInput): Promise<Memory | null> {
  const existing = await prisma.memory.findFirst({ where: { id, userId } });
  if (!existing) return null;

  return prisma.memory.update({
    where: { id },
    data: {
      type: input.type,
      category: input.category === null ? null : input.category,
      key: input.key === null ? null : input.key,
      content: input.content,
      tags: input.tags !== undefined ? (input.tags as Prisma.InputJsonValue) : undefined,
      importance: input.importance,
      source: input.source === null ? null : input.source,
      metadata: input.metadata !== undefined ? (input.metadata as Prisma.InputJsonValue) : undefined,
      pinned: input.pinned,
      expiresAt: input.expiresAt === null ? null : input.expiresAt,
    },
  });
}

export async function deleteMemory(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.memory.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.memory.delete({ where: { id } });
  return true;
}

/**
 * Simple, dependency-free text search across content/category/key/tags
 * (case-insensitive `contains`, no external search engine). Good enough at
 * this scale and consistent with `recall_past_chats` (module 14), which uses
 * the same plain-substring approach.
 */
export async function searchMemories(
  userId: string,
  query: string,
  filters: Omit<ListMemoriesFilters, "page" | "pageSize"> & { page?: number; pageSize?: number }
): Promise<ListMemoriesResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  // NOTE: notExpiredClause() and the text-match clause below both use "OR" —
  // they're combined via "AND" (rather than spread into the same object,
  // which would let the second OR silently clobber the first) so both
  // conditions are actually enforced together.
  const where: Prisma.MemoryWhereInput = {
    userId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.pinned !== undefined ? { pinned: filters.pinned } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.tag ? tagsContain(filters.tag) : {}),
    AND: [
      notExpiredClause(filters.includeExpired),
      {
        OR: [
          { content: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { key: { contains: query, mode: "insensitive" } },
        ],
      },
    ],
  };

  const [memories, total] = await Promise.all([
    prisma.memory.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { importance: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.memory.count({ where }),
  ]);

  return { memories, total, page, pageSize };
}

export async function listCategories(userId: string): Promise<string[]> {
  const rows = await prisma.memory.findMany({
    where: { userId, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  return rows.map((r) => r.category as string).sort();
}

export async function listTags(userId: string): Promise<string[]> {
  const rows = await prisma.memory.findMany({
    where: { userId },
    select: { tags: true },
  });
  const set = new Set<string>();
  for (const row of rows) {
    const tags = (row.tags as string[]) ?? [];
    for (const tag of tags) set.add(tag);
  }
  return Array.from(set).sort();
}

export interface RetrieveOptions {
  type?: MemoryType;
  category?: string;
  /** When set, candidates are this source's memories PLUS the user's unscoped (global)
      memories — e.g. a chat should see its own short-term summary AND the user's general
      preferences, not just one or the other. */
  source?: string;
  limit?: number;
}

export interface ScoredMemory {
  memory: Memory;
  score: number;
}

const RECENCY_HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Memory retrieval service.
 *
 * Given free-text `query`, returns the most relevant, non-expired memories
 * for a user ranked by a lightweight heuristic score combining:
 *   - keyword overlap between the query and content/category/key/tags
 *   - the memory's own `importance` (0-10)
 *   - recency of `lastAccessedAt`/`updatedAt` (exponential decay)
 *   - a flat bonus for `pinned` memories, which are always included first
 *
 * This is intentionally a plain in-process scorer (no vector DB/embeddings) —
 * consistent with the no-extra-infra approach used elsewhere in this repo
 * (automation scheduler, agent tool search). Swap in an embedding-based
 * ranker later behind this same function signature if search quality demands
 * it; callers (once wired up) shouldn't need to change.
 *
 * Used by Chat, AI Agents, and Automation to build "what should the AI already know"
 * context ahead of a real request, plus exposed directly via POST /api/memory/retrieve.
 */
export async function retrieveRelevantMemories(
  userId: string,
  query: string,
  options: RetrieveOptions = {}
): Promise<ScoredMemory[]> {
  const limit = options.limit ?? 10;

  const candidates = await prisma.memory.findMany({
    where: {
      userId,
      ...(options.type ? { type: options.type } : {}),
      ...(options.category ? { category: options.category } : {}),
      ...(options.source ? { OR: [{ source: options.source }, { source: null }] } : {}),
      ...notExpiredClause(false),
    },
    // Cap the candidate pool so scoring stays O(small) even for heavy users;
    // recent/important memories are the ones worth ranking anyway.
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 500,
  });

  const queryTokens = tokenize(query);
  const now = Date.now();

  const scored: ScoredMemory[] = candidates.map((memory) => {
    const haystack = [memory.content, memory.category ?? "", memory.key ?? "", ...(((memory.tags as string[]) ?? []))]
      .join(" ")
      .toLowerCase();
    const memoryTokens = tokenize(haystack);

    const overlap = queryTokens.filter((t) => memoryTokens.includes(t)).length;
    const keywordScore = queryTokens.length > 0 ? overlap / queryTokens.length : 0;

    const importanceScore = memory.importance / 10;

    const lastTouched = memory.lastAccessedAt ?? memory.updatedAt;
    const ageMs = Math.max(0, now - lastTouched.getTime());
    const recencyScore = Math.exp(-ageMs / RECENCY_HALF_LIFE_MS);

    const pinnedBonus = memory.pinned ? 1 : 0;

    const score = pinnedBonus * 10 + keywordScore * 5 + importanceScore * 2 + recencyScore * 1;

    return { memory, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  // Bump lastAccessedAt for surfaced memories so future recency scoring reflects
  // that they were actually used. Fire-and-forget; retrieval shouldn't block on it.
  const ids = top.map((s) => s.memory.id);
  if (ids.length > 0) {
    prisma.memory
      .updateMany({ where: { id: { in: ids } }, data: { lastAccessedAt: new Date() } })
      .catch((err) => console.error("Failed to bump memory lastAccessedAt:", err));
  }

  return top;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

/**
 * Formats scored memories into a prompt-ready context block — the one place Chat, Agents,
 * and Automation all render "what the AI already knows" identically. Accepts either raw
 * Memory rows or ScoredMemory results from retrieveRelevantMemories.
 */
export function buildMemoryContextBlock(memories: (Memory | ScoredMemory)[]): string | null {
  if (memories.length === 0) return null;
  const rows = memories.map((m) => ("memory" in m ? m.memory : m));
  const lines = rows.map((m) => `- (${m.type.toLowerCase()}${m.key ? `: ${m.key}` : ""}) ${m.content}`);
  return `What you remember about this user from past interactions:\n${lines.join("\n")}`;
}

const FACT_EXTRACTION_SYSTEM_PROMPT = `You extract durable facts and preferences worth
remembering long-term from a single conversation exchange. Only extract things that would
still be true/useful weeks from now (identity details, stated preferences, ongoing projects,
constraints) — NOT small talk, one-off requests, or anything already obvious/generic.

Respond with ONLY a JSON array (no markdown fences, no commentary), each item shaped:
{"type": "FACT" | "PREFERENCE" | "LONG_TERM", "content": "...", "importance": 1-10}
Return an empty array [] if there's nothing durable worth remembering. Extract at most 3 items.`;

/**
 * Extracts durable facts/preferences from one user+assistant exchange and stores them.
 * Called by Chat (fire-and-forget, after the response finishes streaming — see
 * chat.controller.ts) so it never adds latency to the user-facing reply. Deliberately runs
 * on every turn rather than batched, but kept cheap: a small, tightly-bounded completion,
 * and callers should skip trivially short exchanges before calling this (see chat.controller.ts).
 */
export async function extractAndStoreFacts(
  userId: string,
  source: string,
  exchange: string,
  model: string
): Promise<Memory[]> {
  const raw = await getCompletion(model, [
    { role: "system", content: FACT_EXTRACTION_SYSTEM_PROMPT },
    { role: "user", content: exchange },
  ]);

  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let items: { type: string; content: string; importance?: number }[];
  try {
    items = JSON.parse(cleaned);
    if (!Array.isArray(items)) return [];
  } catch {
    return []; // model didn't return valid JSON — skip silently, this is best-effort
  }

  const validTypes = new Set(["FACT", "PREFERENCE", "LONG_TERM"]);
  const created: Memory[] = [];
  for (const item of items.slice(0, 3)) {
    if (!item.content || !validTypes.has(item.type)) continue;
    const memory = await createMemory(userId, {
      type: item.type as MemoryType,
      content: item.content,
      source,
      tags: ["auto-extracted"],
      importance: item.importance ?? 6,
    });
    created.push(memory);
  }
  return created;
}

const SHORT_TERM_SUMMARY_PROMPT = `Summarize this conversation concisely (3-5 sentences),
capturing the key topics, decisions, and context worth remembering for the rest of this
conversation. Plain text, no markdown headers.`;

/**
 * Refreshes (creates or updates) the rolling short-term summary memory for one chat.
 * There is at most one SHORT_TERM memory per `source` — later calls update the same row
 * rather than accumulating duplicates, and its TTL is renewed each time so it stays alive
 * for the life of an active conversation (see DEFAULT_SHORT_TERM_TTL_MS).
 */
export async function refreshShortTermSummary(
  userId: string,
  source: string,
  transcript: string,
  model: string
): Promise<Memory> {
  const summary = await getCompletion(model, [
    { role: "system", content: SHORT_TERM_SUMMARY_PROMPT },
    { role: "user", content: transcript.slice(0, 15_000) },
  ]);

  const existing = await prisma.memory.findFirst({ where: { userId, type: "SHORT_TERM", source } });
  const expiresAt = new Date(Date.now() + DEFAULT_SHORT_TERM_TTL_MS);

  if (existing) {
    return prisma.memory.update({ where: { id: existing.id }, data: { content: summary, expiresAt } });
  }
  return createMemory(userId, { type: "SHORT_TERM", content: summary, source, expiresAt });
}

/**
 * Deletes expired memories for a user (or globally if no userId given).
 * Not wired into any scheduler yet — plain utility so callers (e.g. a future
 * cron pass, same pattern as automationScheduler.service.ts) can use it
 * without duplicating the expiry query.
 */
export async function purgeExpiredMemories(userId?: string): Promise<number> {
  const result = await prisma.memory.deleteMany({
    where: {
      ...(userId ? { userId } : {}),
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

// ---------------------------------------------------------------------------
// Admin Panel Part 3 — platform-wide memory access. Same table, same helper
// functions (tagsContain/notExpiredClause), just without the userId scoping
// every regular caller (Chat, Agents, Automation, the /api/memory routes) uses
// by design. These are the ONLY functions in the codebase allowed to query
// `memories` across all users — kept here, not duplicated into admin.service.ts,
// so this file remains the single owner of the memories table.

export interface AdminListMemoriesFilters extends ListMemoriesFilters {
  query?: string; // free-text search across content, on top of the structured filters
}

export interface AdminMemoryRow extends Memory {
  user: { id: string; email: string };
}

export async function adminListMemories(
  filters: AdminListMemoriesFilters
): Promise<{ memories: AdminMemoryRow[]; total: number; page: number; pageSize: number }> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  const where: Prisma.MemoryWhereInput = {
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.pinned !== undefined ? { pinned: filters.pinned } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.tag ? tagsContain(filters.tag) : {}),
    ...(filters.query ? { content: { contains: filters.query, mode: "insensitive" } } : {}),
    ...notExpiredClause(filters.includeExpired),
  };

  const [memories, total] = await Promise.all([
    prisma.memory.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { id: true, email: true } } },
    }),
    prisma.memory.count({ where }),
  ]);

  return { memories, total, page, pageSize };
}

export async function adminUpdateMemory(id: string, input: UpdateMemoryInput): Promise<Memory | null> {
  const existing = await prisma.memory.findUnique({ where: { id } });
  if (!existing) return null;

  return prisma.memory.update({
    where: { id },
    data: {
      content: input.content,
      type: input.type,
      category: input.category,
      key: input.key,
      tags: input.tags,
      importance: input.importance,
      source: input.source,
      pinned: input.pinned,
    },
  });
}

export async function adminDeleteMemory(id: string): Promise<boolean> {
  const existing = await prisma.memory.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.memory.delete({ where: { id } });
  return true;
}

/** Platform-wide memory counts for the Admin Dashboard's "Memory Statistics" card. */
export async function getMemoryStats() {
  const [total, byType] = await Promise.all([
    prisma.memory.count(),
    prisma.memory.groupBy({ by: ["type"], _count: { type: true } }),
  ]);

  return {
    total,
    byType: byType.map((t) => ({ type: t.type, count: t._count.type })),
  };
}
