import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Locale } from "../../lib/i18n";
import {
  seedCities,
  seedJobs,
  seedJobTypes,
  seedStores,
  seedUsers,
} from "../../lib/seed";
import {
  applications,
  authChallenges,
  cities,
  jobs,
  jobTypes,
  stores,
  users,
} from "../../db/schema";
import type { UserRole } from "../../lib/types";

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/dianpin_test";

// E2E truncates tables before every test. Refuse anything that does not look
// like a dedicated test database, even if someone exported a production URL.
const databaseName = new URL(DATABASE_URL).pathname;
if (!/(test|e2e)/i.test(databaseName)) {
  throw new Error(
    `Refusing to run E2E against non-test database "${databaseName}". ` +
      "Set E2E_DATABASE_URL to a dedicated dianpin_test database."
  );
}

export const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

export const E2E_JOB_ID = "job_e2e";
export const E2E_SEEKER_EMAIL = "seeker.private@e2e.test";
export const E2E_EMPLOYER_EMAIL = "owner@e2e.test";
export const E2E_ADMIN_EMAIL = "admin@e2e.test";
export const E2E_SEEKER_PHONE = "+34699999999";
export const MAIL_OUTBOX = path.resolve("test-results/e2e-mail.jsonl");

export type MailOutboxEntry = { to: string; subject: string; text: string };

export async function resetMailOutbox(): Promise<void> {
  await rm(MAIL_OUTBOX, { force: true });
}

export async function readMailOutbox(): Promise<MailOutboxEntry[]> {
  try {
    const content = await readFile(MAIL_OUTBOX, "utf8");
    return content
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as MailOutboxEntry);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function required<T>(value: T | undefined, label: string): T {
  if (!value) throw new Error(`Missing E2E fixture: ${label}`);
  return value;
}

export async function resetAndSeedDatabase(): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE
      auth_challenges,
      auth_sessions,
      job_alerts,
      seeker_posts,
      reports,
      reviews,
      applications,
      jobs,
      stores,
      seeker_profiles,
      users,
      job_types,
      cities
    CASCADE
  `);

  await db.insert(cities).values(seedCities);
  await db.insert(jobTypes).values(seedJobTypes);

  const employer = {
    ...required(
      seedUsers.find((user) => user.id === "u_emp_hualian"),
      "employer"
    ),
    email: E2E_EMPLOYER_EMAIL,
  };
  await db.insert(users).values([
    employer,
    {
      id: "u_e2e_admin",
      role: "employer",
      email: E2E_ADMIN_EMAIL,
      name: "E2E Admin",
      locale: "zh",
    },
  ]);

  const store = required(
    seedStores.find((row) => row.id === "store_hualian"),
    "store"
  );
  await db
    .insert(stores)
    .values({ ...store, rating_avg: 0, rating_count: 0, is_seed: false });

  const sourceJob = required(
    seedJobs.find((row) => row.id === "job_1"),
    "job"
  );
  await db.insert(jobs).values({
    ...sourceJob,
    id: E2E_JOB_ID,
    published_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    is_seed: false,
  });
}

/** Creates a known raw token without depending on Resend or server logs. */
export async function createMagicLogin(input: {
  email: string;
  intendedRole: UserRole;
  locale: Locale;
  nextPath?: string;
}): Promise<string> {
  const id = `chal_${randomUUID()}`;
  const rawCode = randomBytes(32).toString("base64url");
  await db.insert(authChallenges).values({
    id,
    channel: "email",
    identifier: input.email,
    code_hash: createHash("sha256").update(rawCode).digest("hex"),
    intended_role: input.intendedRole,
    next_path: input.nextPath ?? null,
    ip: "127.0.0.1",
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });

  const prefix = input.locale === "zh" ? "" : `/${input.locale}`;
  return `${prefix}/auth/callback?challenge=${id}&code=${rawCode}`;
}

export async function getOnlyApplication() {
  const rows = await db.select().from(applications);
  if (rows.length !== 1) {
    throw new Error(`Expected one application, found ${rows.length}`);
  }
  return rows[0];
}

export async function seedSeekerWithApplication(): Promise<void> {
  await db.insert(users).values({
    id: "u_e2e_seeker",
    role: "seeker",
    email: E2E_SEEKER_EMAIL,
    phone: E2E_SEEKER_PHONE,
    name: "E2E Seeker",
    locale: "zh",
  });
  await db.insert(applications).values({
    id: "app_e2e",
    job_id: E2E_JOB_ID,
    seeker_user_id: "u_e2e_seeker",
    status: "submitted",
  });
}
