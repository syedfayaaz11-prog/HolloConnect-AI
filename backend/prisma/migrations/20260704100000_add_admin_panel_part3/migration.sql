-- Admin Panel (#22, Part 3 of 3) — closing the remaining backend gaps from Part 2.
-- Adds Agent.enabled (real enable/disable) and the settings table (real persistence,
-- replacing Part 2's local-only settings form). Written by hand since there's no live
-- DB/network access in this environment — same convention as the two prior migrations
-- (20260702120000_add_memory_module, 20260703090000_add_admin_panel_foundation). Run
-- `npx prisma migrate deploy` before starting the backend.

-- AlterTable
ALTER TABLE "agents" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);
