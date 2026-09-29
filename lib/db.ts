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
import {
  applicationRevealsContact,
  canSubmitStoreForVerification,
  canTransitionApplication,
  canTransitionJob,
} from "./status-machine";
import type { Locale } from "./i18n";
import type {
  Application,
  ApplicationStatus,
  City,
  Job,
  JobFormValues,
  JobStatus,
  JobType,
  Report,
  ReportTargetType,
  Review,
  SeekerProfile,
  SeekerProfileFormValues,
  Store,
  StoreFormValues,
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

function toUser(row: typeof users.$inferSelect): User {
  // users.locale is plain text in Postgres (AGENTS.md §5 doesn't list it
  // among the enumerated columns), but the app only ever writes 'zh'/'es'.
  return { ...row, locale: row.locale as Locale };
}

export async function getUserById(id: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ? toUser(row) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.email, email));
  return row ? toUser(row) : null;
}

export interface CreateUserInput {
  role: "seeker" | "employer";
  email: string;
  name: string;
  locale: Locale;
}

/** Creates a brand-new account. Only called from the auth callback, the first time an identifier verifies successfully. */
export async function createUser(input: CreateUserInput): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      id: `u_${randomUUID()}`,
      role: input.role,
      email: input.email,
      name: input.name,
      locale: input.locale,
    })
    .returning();
  return toUser(row);
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

export async function getApplicationById(
  id: string
): Promise<Application | null> {
  const [row] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id));
  return row ?? null;
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

export async function createStore(
  input: StoreFormValues & { ownerUserId: string }
): Promise<Store> {
  const [row] = await db
    .insert(stores)
    .values({
      id: `store_${randomUUID()}`,
      owner_user_id: input.ownerUserId,
      name_zh: input.nameZh,
      name_es: input.nameEs,
      city: input.city,
      district: input.district,
      address: input.address,
      category: input.category,
      cover_image: input.coverImage,
    })
    .returning();
  return row;
}

/**
 * unverified/rejected -> pending only (see canSubmitStoreForVerification).
 * pending -> verified/rejected is an admin action with no UI yet.
 */
export async function submitStoreForVerification(
  storeId: string
): Promise<Store> {
  const [existing] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId));

  if (!existing) {
    throw new Error(`Store ${storeId} not found`);
  }
  if (!canSubmitStoreForVerification(existing.verification_status)) {
    throw new Error(
      `Cannot submit store ${storeId} for verification from status "${existing.verification_status}"`
    );
  }

  const [row] = await db
    .update(stores)
    .set({ verification_status: "pending" })
    .where(eq(stores.id, storeId))
    .returning();
  return row;
}

/**
 * Creates a job from the templated "发布岗位" form. city/district are
 * taken from the store, not the form — a job's location always matches
 * where its store actually is, so it isn't a separate free-choice field.
 */
export async function createJob(
  input: JobFormValues & { storeId: string; city: string; status: "draft" | "active" }
): Promise<Job> {
  const [row] = await db
    .insert(jobs)
    .values({
      id: `job_${randomUUID()}`,
      store_id: input.storeId,
      title_zh: input.titleZh,
      title_es: input.titleEs,
      job_type: input.jobType,
      city: input.city,
      district: input.district,
      salary_min: input.salaryMin,
      salary_max: input.salaryMax,
      salary_period: input.salaryPeriod,
      headcount: input.headcount,
      schedule: input.schedule,
      live_in: input.liveIn,
      meals_included: input.mealsIncluded,
      language_required: input.languageRequired,
      residence_required: input.residenceRequired,
      description_zh: input.descriptionZh,
      description_es: input.descriptionEs,
      status: input.status,
    })
    .returning();
  return row;
}

export async function updateJobStatus(
  jobId: string,
  nextStatus: JobStatus
): Promise<Job> {
  const [existing] = await db.select().from(jobs).where(eq(jobs.id, jobId));

  if (!existing) {
    throw new Error(`Job ${jobId} not found`);
  }
  if (!canTransitionJob(existing.status, nextStatus)) {
    throw new Error(
      `Cannot move job ${jobId} from status "${existing.status}" to "${nextStatus}"`
    );
  }

  const [row] = await db
    .update(jobs)
    .set({ status: nextStatus })
    .where(eq(jobs.id, jobId))
    .returning();
  return row;
}

/** Called when the employer opens a job's candidate list — clears the "new" badge. */
export async function markSubmittedApplicationsAsViewed(
  jobId: string
): Promise<void> {
  await db
    .update(applications)
    .set({ status: "viewed", updated_at: new Date().toISOString() })
    .where(
      and(eq(applications.job_id, jobId), eq(applications.status, "submitted"))
    );
}

/**
 * Employer-side status advance (viewed/contacted/hired/rejected — never
 * withdrawn, see lib/status-machine.ts's nextEmployerApplicationStatuses).
 * Once contact is revealed it stays revealed even if the status later
 * moves to a non-revealing one.
 */
export async function advanceApplicationStatus(
  applicationId: string,
  nextStatus: ApplicationStatus
): Promise<Application> {
  const [existing] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId));

  if (!existing) {
    throw new Error(`Application ${applicationId} not found`);
  }
  if (!canTransitionApplication(existing.status, nextStatus)) {
    throw new Error(
      `Cannot move application ${applicationId} from status "${existing.status}" to "${nextStatus}"`
    );
  }

  const [row] = await db
    .update(applications)
    .set({
      status: nextStatus,
      contact_revealed:
        existing.contact_revealed || applicationRevealsContact(nextStatus),
      updated_at: new Date().toISOString(),
    })
    .where(eq(applications.id, applicationId))
    .returning();
  return row;
}
