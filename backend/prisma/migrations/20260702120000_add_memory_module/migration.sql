-- Memory module (#15, Part 1 of 3) — backend foundation
-- Adds a single shared `memories` table covering long-term, short-term,
-- preference, fact, and summary memory kinds via the `MemoryType` enum.

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('LONG_TERM', 'SHORT_TERM', 'PREFERENCE', 'FACT', 'SUMMARY');

-- CreateTable
CREATE TABLE "memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MemoryType" NOT NULL,
    "category" TEXT,
    "key" TEXT,
    "content" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "importance" INTEGER NOT NULL DEFAULT 5,
    "source" TEXT,
    "metadata" JSONB,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "memories_userId_type_idx" ON "memories"("userId", "type");

-- CreateIndex
CREATE INDEX "memories_userId_category_idx" ON "memories"("userId", "category");

-- CreateIndex
CREATE INDEX "memories_userId_key_idx" ON "memories"("userId", "key");

-- AddForeignKey
ALTER TABLE "memories" ADD CONSTRAINT "memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
