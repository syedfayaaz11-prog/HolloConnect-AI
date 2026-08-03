-- BYOK (Bring Your Own API Keys) + Google Sign-In. Written by hand — no live DB/network
-- access in this sandbox to generate this via `npx prisma migrate dev`, same convention as
-- every prior migration in this project. Run `npx prisma migrate deploy` before starting the
-- backend.
--
-- Both changes are additive/backward-compatible:
--   - "passwordHash" goes from NOT NULL to nullable. Every existing row already has a real
--     hash (it was required at signup until now), so this is a pure widening — no data is
--     touched, no existing login breaks. It only becomes null for brand-new Google-only
--     signups going forward.
--   - "googleId" is a new nullable, unique column — every existing user gets NULL, meaning
--     "has never signed in with Google", which is correct for 100% of pre-migration rows.
--   - The new "api_keys" table is entirely new and has no relationship to existing data
--     until a user actually adds a key through the new BYOK Settings UI.

-- AlterTable: users
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "googleId" TEXT;
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateEnum
CREATE TYPE "ApiKeyProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI', 'OLLAMA', 'OPENAI_COMPATIBLE');
CREATE TYPE "ApiKeyStatus" AS ENUM ('UNTESTED', 'VALID', 'INVALID');

-- CreateTable: api_keys
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "ApiKeyProvider" NOT NULL,
    "label" TEXT NOT NULL,
    "baseUrl" TEXT,
    "defaultModel" TEXT,
    "encryptedKey" TEXT,
    "keyPreview" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'UNTESTED',
    "lastTestedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");
CREATE INDEX "api_keys_userId_provider_idx" ON "api_keys"("userId", "provider");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
