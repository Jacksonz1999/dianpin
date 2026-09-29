import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// Cache on globalThis rather than a module-scope variable so the pool (and
// the drizzle instance built on it) survives Next.js dev hot-reloads too,
// not just repeat calls within one already-loaded module instance.
const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
  drizzleDb?: DrizzleDb;
};

// Every page in this app is `force-dynamic`, so nothing queries the
// database while Next.js is building — but `next build` still *imports*
// every route module (this one included) to collect its route config.
// On Railway, DATABASE_URL is only injected into the deploy/runtime
// environment, not the build environment, so eagerly connecting (or even
// eagerly validating the env var) at module-import time breaks the build.
// Deferring both behind this getter, invoked only when a query actually
// runs, keeps the build import-safe while still failing fast — with a
// clear message — the first time code tries to touch the database without
// DATABASE_URL set.
function getDb(): DrizzleDb {
  if (globalForDb.drizzleDb) {
    return globalForDb.drizzleDb;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in (see README / PR notes for the Railway production setup)."
    );
  }

  const pool =
    globalForDb.pgPool ??
    new Pool({
      connectionString: process.env.DATABASE_URL,
    });

  const instance = drizzle(pool, { schema });

  globalForDb.pgPool = pool;
  globalForDb.drizzleDb = instance;

  return instance;
}

export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
