-- Subscription/trial system — adds plan + trialEndsAt to User. Written by hand since there's
-- no live DB/network access in this environment — same convention as every prior migration.
-- Run `npx prisma migrate deploy` before starting the backend.
--
-- Both columns are additive: "plan" is NOT NULL with a DEFAULT (safe against existing rows —
-- they all become "TRIAL", which is correct: existing users get the same 2-month free trial
-- new signups get, backdated from this migration rather than their original signup date since
-- we don't want to instantly expire everyone's trial the moment this deploys). "trialEndsAt"
-- is nullable, backfilled below for existing rows.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "users" ADD COLUMN "trialEndsAt" TIMESTAMP(3);

-- Backfill: give every existing user a fresh 2-month trial starting now, so this migration
-- doesn't retroactively expire anyone's trial on deploy day.
UPDATE "users" SET "trialEndsAt" = NOW() + INTERVAL '60 days' WHERE "trialEndsAt" IS NULL;
