import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  applications,
  cities,
  jobTypes,
  jobs,
  reviews,
  stores,
  users,
} from "@/db/schema";
import type { Locale } from "./i18n";
import type {
  Application,
  City,
  Job,
  JobStatus,
  JobType,
  Review,
  Store,
  User,
} from "./types";

/**
 * Postgres-backed data access layer (Drizzle ORM + node-postgres).
 *
 * This replaces the WP0 in-memory version — every exported function keeps
 * the same name, parameters and return shape, so app/ and components/ call
 * this exactly as before; only the implementation changed.
 */

export interface JobFilters {
  city?: string;
  jobType?: string;
  mealsIncluded?: boolean;
  residenceOk?: boolean;
  salaryMin?: number;
  status?: JobStatus;
}

export async function getCities(): Promise<City[]> {
  return db.select().from(cities);
}

export async function getCityById(id: string): Promise<City | null> {
  const [row] = await db.select().from(cities).where(eq(cities.id, id));
  return row ?? null;
}

export async function getJobTypes(): Promise<JobType[]> {
  return db.select().from(jobTypes);
}

export async function getStores(): Promise<Store[]> {
  return db.select().from(stores);
}

export async function getStoreById(id: string): Promise<Store | null> {
  const [row] = await db.select().from(stores).where(eq(stores.id, id));
  return row ?? null;
}

export async function getStoresByOwner(ownerUserId: string): Promise<Store[]> {
  return db.select().from(stores).where(eq(stores.owner_user_id, ownerUserId));
}

/**
 * hour/day salaries are normalized to a monthly figure (hour×8×22,
 * day×22) before being compared against `filters.salaryMin`, per
 * AGENTS.md §5. Expressed as a SQL CASE so the comparison happens in the
 * database rather than after fetching rows.
 */
const monthlySalaryMax = sql<number>`
  case ${jobs.salary_period}
    when 'hour' then ${jobs.salary_max} * 8 * 22
    when 'day' then ${jobs.salary_max} * 22
    else ${jobs.salary_max}
  end
`;

export async function getJobs(filters: JobFilters = {}): Promise<Job[]> {
  const status = filters.status ?? "active";

  const conditions = [eq(jobs.status, status)];
  if (filters.city) conditions.push(eq(jobs.city, filters.city));
  if (filters.jobType) conditions.push(eq(jobs.job_type, filters.jobType));
  if (filters.mealsIncluded) conditions.push(eq(jobs.meals_included, true));
  if (filters.residenceOk) {
    conditions.push(sql`${jobs.residence_required} <> 'required'`);
  }
  if (filters.salaryMin) {
    conditions.push(gte(monthlySalaryMax, filters.salaryMin));
  }

  return db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(desc(jobs.published_at));
}

export async function getJobById(id: string): Promise<Job | null> {
  const [row] = await db.select().from(jobs).where(eq(jobs.id, id));
  return row ?? null;
}

export async function getJobsByStore(storeId: string): Promise<Job[]> {
  return db.select().from(jobs).where(eq(jobs.store_id, storeId));
}

export async function getReviewsByStore(storeId: string): Promise<Review[]> {
  return db
    .select()
    .from(reviews)
    .where(eq(reviews.store_id, storeId))
    .orderBy(desc(reviews.created_at));
}

export async function getApplicationsBySeeker(
  seekerUserId: string
): Promise<Application[]> {
  return db
    .select()
    .from(applications)
    .where(eq(applications.seeker_user_id, seekerUserId))
    .orderBy(desc(applications.created_at));
}

export async function getApplicationsByJob(
  jobId: string
): Promise<Application[]> {
  return db
    .select()
    .from(applications)
    .where(eq(applications.job_id, jobId))
    .orderBy(asc(applications.created_at));
}

export async function getUserById(id: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  if (!row) return null;
  // users.locale is plain text in Postgres (AGENTS.md §5 doesn't list it
  // among the enumerated columns), but the app only ever writes 'zh'/'es'.
  return { ...row, locale: row.locale as Locale };
}

/** Demo seeker used to power the /me/applications placeholder before auth (WP4) exists. */
export async function getDemoSeekerId(): Promise<string> {
  return "u_seek_1";
}

/** Demo employer used to power the /employer/* placeholders before auth (WP4) exists. */
export async function getDemoEmployerId(): Promise<string> {
  return "u_emp_jinlong";
}
