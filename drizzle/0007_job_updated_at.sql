-- Idempotent on purpose: Railway's preDeploy migration step has been known
-- to be skipped (devDependencies pruned with --omit=dev), so operators may
-- have applied this column by hand. A plain ADD COLUMN would then make the
-- next `drizzle-kit migrate` fail with 42701 duplicate_column.
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
