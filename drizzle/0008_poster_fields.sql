-- PegaLocal poster jobs (phase 2). These columns are intentionally kept OUT
-- of the drizzle schema (db/schema.ts) so a skipped preDeploy migration can
-- never take the site down with 42703 — the app reads/writes them through
-- guarded raw SQL in lib/db.ts and scripts/ensure-schema.mjs creates them at
-- container start. See 0007_job_updated_at.sql for the same rationale.
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'standard';
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "poster_slug" text UNIQUE;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "contact_phone" text NOT NULL DEFAULT '';
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "contact_whatsapp" text NOT NULL DEFAULT '';
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "title_en" text;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "description_en" text NOT NULL DEFAULT '';
