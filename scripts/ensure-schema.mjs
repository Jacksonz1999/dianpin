// Additive-only, idempotent DDL safety net applied at container start.
//
// Why this exists: `railway.toml` runs `npm run db:migrate` as a
// preDeployCommand, but Railway prunes devDependencies in the runtime image
// (`npm warn config production` / --omit=dev). On 2026-11-04 drizzle-kit and
// dotenv were devDependencies, so that step failed, migration 0007 never
// landed and every `select ... from jobs` died with 42703 undefined_column.
//
// This script is NOT a replacement for drizzle migrations: it only contains
// additive, IF NOT EXISTS statements for columns the app can live without.
// The app itself is written to work with or without them (see db/schema.ts),
// so a failure here is logged but never blocks startup.
import pg from "pg";

const { Pool } = pg;

const CHECKS = [
  {
    name: "jobs.updated_at (0007, sitemap lastmod)",
    exists: `SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'jobs'
               AND column_name = 'updated_at'`,
    create: `ALTER TABLE "jobs"
             ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now()`,
  },
  {
    name: "jobs.source / poster_slug / contact_* / title_en / description_en (0008, PegaLocal posters)",
    exists: `SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'jobs'
               AND column_name = 'poster_slug'`,
    create: `ALTER TABLE "jobs"
             ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'standard',
             ADD COLUMN IF NOT EXISTS "poster_slug" text UNIQUE,
             ADD COLUMN IF NOT EXISTS "contact_phone" text NOT NULL DEFAULT '',
             ADD COLUMN IF NOT EXISTS "contact_whatsapp" text NOT NULL DEFAULT '',
             ADD COLUMN IF NOT EXISTS "title_en" text,
             ADD COLUMN IF NOT EXISTS "description_en" text NOT NULL DEFAULT ''`,
  },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("[ensure-schema] DATABASE_URL is not set — skipping");
  process.exit(0);
}

const pool = new Pool({ connectionString, max: 1 });

try {
  const client = await pool.connect();
  try {
    for (const check of CHECKS) {
      const { rows } = await client.query(check.exists);
      if (rows.length > 0) continue;
      await client.query(check.create);
      console.log(`[ensure-schema] added ${check.name}`);
    }
    console.log("[ensure-schema] ok");
  } finally {
    client.release();
  }
} catch (err) {
  // Non-fatal on purpose: the application degrades to published_at for
  // lastmod instead of taking the whole site down.
  console.error(
    "[ensure-schema] failed (server will still start):",
    err?.message ?? err
  );
} finally {
  await pool.end().catch(() => {});
}
