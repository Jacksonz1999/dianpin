import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  applications,
  cities,
  jobTypes,
  jobs,
  reports,
  reviews,
  seekerProfiles,
  stores,
  users,
} from "@/db/schema";
import { canTransitionApplication } from "./status-machine";
import type { Locale } from "./i18n";
import type {
  Application,
  City,
  Job,
  JobStatus,
  JobType,
  Report,
  ReportTargetType,
  Review,
  SeekerProfile,
  SeekerProfileFormValues,
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
  /** Free-text match against job title (zh/es) and store name (zh/es). */
  search?: string;
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

export async function getJobTypeById(id: string): Promise<JobType | null> {
  const [row] = await db.select().from(jobTypes).where(eq(jobTypes.id, id));
  return row ?? null;
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
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(sql`(
      ${jobs.title_zh} ILIKE ${term} OR
      ${jobs.title_es} ILIKE ${term} OR
      EXISTS (
        SELECT 1 FROM ${stores}
        WHERE ${stores.id} = ${jobs.store_id}
          AND (${stores.name_zh} ILIKE ${term} OR ${stores.name_es} ILIKE ${term})
      )
    )`);
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

export async function getSeekerProfileByUserId(
  userId: string
): Promise<SeekerProfile | null> {
  const [row] = await db
    .select()
    .from(seekerProfiles)
    .where(eq(seekerProfiles.user_id, userId));
  return row ?? null;
}

export interface SaveSeekerProfileInput extends SeekerProfileFormValues {
  userId: string;
}

/**
 * Creates or updates the seeker's minimal profile ("姓名/工种/经验/可到岗/
 * 居留状态/期望月薪/联系方式" per AGENTS.md's apply-flow onboarding) in one
 * call: the name/contact fields live on `users`, everything else on
 * `seeker_profiles`. Fields this form doesn't collect (bio, avatar,
 * preferred_cities, languages, live_in_ok) are left untouched on update.
 */
export async function saveSeekerProfile(
  input: SaveSeekerProfileInput
): Promise<{ user: User; profile: SeekerProfile }> {
  const [userRow] = await db
    .update(users)
    .set({ name: input.name, phone: input.phone })
    .where(eq(users.id, input.userId))
    .returning();

  const profileValues = {
    job_types: input.jobTypes,
    experience_years: input.experienceYears,
    available_from: input.availableFrom,
    residence_status: input.residenceStatus,
    expected_salary_min: input.expectedSalaryMin,
    expected_salary_max: input.expectedSalaryMax,
  };

  const [profileRow] = await db
    .insert(seekerProfiles)
    .values({ user_id: input.userId, ...profileValues })
    .onConflictDoUpdate({
      target: seekerProfiles.user_id,
      set: profileValues,
    })
    .returning();

  return {
    user: { ...userRow, locale: userRow.locale as Locale },
    profile: profileRow,
  };
}

export async function getApplicationForJobAndSeeker(
  jobId: string,
  seekerUserId: string
): Promise<Application | null> {
  const [row] = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.job_id, jobId),
        eq(applications.seeker_user_id, seekerUserId)
      )
    );
  return row ?? null;
}

export interface CreateApplicationInput {
  jobId: string;
  seekerUserId: string;
  message: string;
}

export async function createApplication(
  input: CreateApplicationInput
): Promise<Application> {
  const [row] = await db
    .insert(applications)
    .values({
      id: `app_${randomUUID()}`,
      job_id: input.jobId,
      seeker_user_id: input.seekerUserId,
      message: input.message,
    })
    .returning();
  return row;
}

/**
 * Moves an application to `withdrawn`, per the state machine in
 * lib/status-machine.ts (submitted/viewed/contacted -> withdrawn only;
 * hired/rejected/withdrawn are terminal).
 */
export async function withdrawApplication(
  applicationId: string
): Promise<Application> {
  const [existing] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId));

  if (!existing) {
    throw new Error(`Application ${applicationId} not found`);
  }
  if (!canTransitionApplication(existing.status, "withdrawn")) {
    throw new Error(
      `Cannot withdraw application ${applicationId} from status "${existing.status}"`
    );
  }

  const [row] = await db
    .update(applications)
    .set({ status: "withdrawn", updated_at: new Date().toISOString() })
    .where(eq(applications.id, applicationId))
    .returning();
  return row;
}

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reporterUserId: string;
  reason: string;
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const [row] = await db
    .insert(reports)
    .values({
      id: `report_${randomUUID()}`,
      target_type: input.targetType,
      target_id: input.targetId,
      reporter_user_id: input.reporterUserId,
      reason: input.reason,
    })
    .returning();
  return row;
}
