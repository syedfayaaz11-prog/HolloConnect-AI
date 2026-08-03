import { prisma } from "../config/db";

/**
 * Resolves the model to use for an AI call: an explicitly requested model wins, otherwise
 * fall back to the user's saved default, otherwise the global default. Extracted here
 * because this exact three-way fallback was duplicated across chat, search, research, and
 * document controllers — any future module needing a model just calls this instead of
 * re-deriving it.
 */
export async function resolveUserModel(userId: string, requestedModel?: string): Promise<string> {
  if (requestedModel) return requestedModel;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { defaultModel: true } });
  return user?.defaultModel ?? "claude-sonnet-4";
}
