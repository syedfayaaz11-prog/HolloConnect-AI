-- Settings update API — adds real, persisted Appearance and Memory toggles to User.
-- Written by hand since there's no live DB/network access in this environment — same
-- convention as the prior three hand-written migrations. Run `npx prisma migrate deploy`
-- before starting the backend.
--
-- Both columns are NOT NULL with a DEFAULT, so this is purely additive and safe to apply
-- to an existing database with rows already in "users" — no backfill step needed.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "reducedMotion" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "memoryEnabled" BOOLEAN NOT NULL DEFAULT true;
