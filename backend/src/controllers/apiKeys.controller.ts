import { Response } from "express";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { createApiKeySchema, updateApiKeySchema } from "../utils/validation";
import { encryptApiKey, decryptApiKey, previewKey, testProviderConnection } from "../services/apiKeys.service";
import { ApiKeyProvider } from "@prisma/client";

// Never sent to the client: the ciphertext (useless without the server's encryption key, but
// no reason to expose it) and, obviously, the plaintext key. Every response shape below is
// built from this select so a field can't accidentally leak by being added to the model and
// forgotten here.
const SAFE_SELECT = {
  id: true,
  provider: true,
  label: true,
  baseUrl: true,
  defaultModel: true,
  keyPreview: true,
  isDefault: true,
  status: true,
  lastTestedAt: true,
  lastError: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listApiKeys(req: AuthedRequest, res: Response) {
  const keys = await prisma.apiKey.findMany({
    where: { userId: req.user!.userId },
    select: SAFE_SELECT,
    orderBy: [{ provider: "asc" }, { createdAt: "asc" }],
  });
  res.json({ keys });
}

/** Unsets isDefault on every other key of the same user+provider — enforces "at most one
    default per provider" at the service layer, since Postgres/Prisma can't express a partial
    unique index declaratively here. */
async function clearOtherDefaults(userId: string, provider: ApiKeyProvider, exceptId?: string) {
  await prisma.apiKey.updateMany({
    where: { userId, provider, isDefault: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
    data: { isDefault: false },
  });
}

export async function createApiKey(req: AuthedRequest, res: Response) {
  const parsed = createApiKeySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0].message);
  }
  const { provider, label, apiKey, baseUrl, defaultModel, isDefault } = parsed.data;
  const userId = req.user!.userId;

  // First key for a given provider becomes that provider's default automatically — matches
  // what a user would expect ("I just added my only OpenAI key, obviously use it").
  const existingForProvider = await prisma.apiKey.count({ where: { userId, provider } });
  const shouldBeDefault = isDefault ?? existingForProvider === 0;

  const created = await prisma.apiKey.create({
    data: {
      userId,
      provider,
      label,
      baseUrl,
      defaultModel,
      encryptedKey: apiKey ? encryptApiKey(apiKey) : null,
      keyPreview: apiKey ? previewKey(apiKey) : null,
      isDefault: shouldBeDefault,
    },
    select: SAFE_SELECT,
  });

  if (shouldBeDefault) await clearOtherDefaults(userId, provider, created.id);

  res.status(201).json({ key: created });
}

export async function updateApiKey(req: AuthedRequest, res: Response) {
  const parsed = updateApiKeySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0].message);
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new ApiError(400, "No fields to update");
  }
  const userId = req.user!.userId;

  const existing = await prisma.apiKey.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) throw new ApiError(404, "API key not found");

  const { apiKey, ...rest } = parsed.data;
  const updated = await prisma.apiKey.update({
    where: { id: existing.id },
    data: {
      ...rest,
      ...(apiKey
        ? {
            encryptedKey: encryptApiKey(apiKey),
            keyPreview: previewKey(apiKey),
            // A changed key is unverified until re-tested — don't keep showing a stale
            // "Valid" badge for a secret that's no longer the one that was tested.
            status: "UNTESTED",
            lastError: null,
          }
        : {}),
    },
    select: SAFE_SELECT,
  });

  if (rest.isDefault) await clearOtherDefaults(userId, existing.provider, existing.id);

  res.json({ key: updated });
}

export async function deleteApiKey(req: AuthedRequest, res: Response) {
  const existing = await prisma.apiKey.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
  if (!existing) throw new ApiError(404, "API key not found");
  await prisma.apiKey.delete({ where: { id: existing.id } });
  res.status(204).end();
}

/** POST /api/api-keys/:id/test — pings the provider with the stored (decrypted) credentials
    and records the result, so the Settings UI's status badge reflects a real, current check
    rather than just "saved successfully" (which only confirms the request was well-formed,
    not that the key actually works). */
export async function testApiKey(req: AuthedRequest, res: Response) {
  const existing = await prisma.apiKey.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
  if (!existing) throw new ApiError(404, "API key not found");

  const apiKey = existing.encryptedKey ? decryptApiKey(existing.encryptedKey) : undefined;
  const result = await testProviderConnection(existing.provider, apiKey, existing.baseUrl ?? undefined);

  const updated = await prisma.apiKey.update({
    where: { id: existing.id },
    data: {
      status: result.ok ? "VALID" : "INVALID",
      lastTestedAt: new Date(),
      lastError: result.ok ? null : result.error ?? "Connection test failed",
    },
    select: SAFE_SELECT,
  });

  res.json({ key: updated, result });
}
