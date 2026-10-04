import { randomUUID } from "node:crypto";
import { cache } from "react";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  applications,
  cities,
  jobTypes,
  jobs,
  reports,
  reviews,
  seekerPosts,
  seekerProfiles,
  stores,
  users,
} from "@/db/schema";
import {
  applicationRevealsContact,
  canAdminReviewStore,
  canSubmitStoreForVerification,
  canTransitionApplication,
  canTransitionJob,
  canTransitionSeekerPost,
} from "./status-machine";
import { assertNotPlaceholder } from "./validation";
import { notifyJobAlertSubscribers } from "./job-alerts";
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
  SeekerPost,
  SeekerPostFormValues,
  SeekerPostStatus,
  SeekerPostSummary,
  SeekerProfile,
  SeekerProfileFormValues,
  Store,
  StoreFormValues,
  StoreVerificationStatus,
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

// Wrapped in React's cache() because generateMetadata() and the page body
// both call this for the same job/store detail page — without it, adding
// generateMetadata would silently double every one of these queries per
// request. cache() memoizes per-request only, never across requests, so
// this can't leak stale data between visitors.
export const getCityById = cache(async (id: string): Promise<City | null> => {
  const [row] = await db.select().from(cities).where(eq(cities.id, id));
  return row ?? null;
});

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

export const getStoreById = cache(async (id: string): Promise<Store | null> => {
  const [row] = await db.select().from(stores).where(eq(stores.id, id));
  return row ?? null;
});

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

export const getJobById = cache(async (id: string): Promise<Job | null> => {
  const [row] = await db.select().from(jobs).where(eq(jobs.id, id));
  return row ?? null;
});

/** Used by the "我收藏的" section (WP-B3) — ids come from the browser's localStorage, not a query filter. */
export async function getJobsByIds(ids: string[]): Promise<Job[]> {
  if (ids.length === 0) return [];
  return db.select().from(jobs).where(inArray(jobs.id, ids));
}

/**
 * Fire-and-forget from the job detail page — the displayed count is as of
 * page load, this registers for the next viewer. No per-viewer dedup (no
 * session/cookie plumbing for anonymous browsing), so it's a raw hit
 * counter, not unique visitors.
 */
export async function incrementJobViews(id: string): Promise<void> {
  await db
    .update(jobs)
    .set({ views: sql`${jobs.views} + 1` })
    .where(eq(jobs.id, id));
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
  assertNotPlaceholder("nameZh", input.nameZh);
  assertNotPlaceholder("nameEs", input.nameEs);

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

// ---------------------------------------------------------------------------
// Admin (round 10 / WP-L) — store verification review only, see lib/admin.ts
// for the access-control side (email allowlist, no "admin" role).
// ---------------------------------------------------------------------------

/** status omitted = every store, newest first — used by the "全量列表" filter view. */
export async function getStoresForAdmin(
  status?: StoreVerificationStatus
): Promise<Store[]> {
  const query = db.select().from(stores).orderBy(desc(stores.created_at));
  if (!status) return query;
  return db
    .select()
    .from(stores)
    .where(eq(stores.verification_status, status))
    .orderBy(desc(stores.created_at));
}

/**
 * pending -> verified/rejected only (see canAdminReviewStore) — this is
 * deliberately the only state transition this function allows. There is
 * no "undo" here by design: if a verified/rejected store needs
 * re-review, the employer re-submits it (submitStoreForVerification),
 * which puts it back in the pending queue.
 */
export async function adminSetStoreVerification(
  storeId: string,
  nextStatus: "verified" | "rejected"
): Promise<Store> {
  const [existing] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId));

  if (!existing) {
    throw new Error(`Store ${storeId} not found`);
  }
  if (!canAdminReviewStore(existing.verification_status)) {
    throw new Error(
      `Cannot admin-review store ${storeId} from status "${existing.verification_status}"`
    );
  }

  const [row] = await db
    .update(stores)
    .set({
      verification_status: nextStatus,
      verified_at: nextStatus === "verified" ? new Date().toISOString() : null,
    })
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
  assertNotPlaceholder("titleZh", input.titleZh);
  assertNotPlaceholder("titleEs", input.titleEs);
  assertNotPlaceholder("descriptionZh", input.descriptionZh);
  assertNotPlaceholder("descriptionEs", input.descriptionEs);

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

  if (row.status === "active") {
    // Synchronous, not queued — see AGENTS.md §5 and the WP-B PR
    // description for why (real inventory + call volume here is tiny;
    // db/import-csv.ts's bulk path bypasses createJob entirely so a CSV
    // import never triggers this). Best-effort: a mail-side failure here
    // (e.g. SMTP down) must never fail the job publish itself — the job
    // row above is already committed by the time this runs.
    try {
      await notifyJobAlertSubscribers(row);
    } catch (err) {
      console.error(`[job-alerts] notifyJobAlertSubscribers failed for job ${row.id}:`, err);
    }
  }

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

// ---------------------------------------------------------------------------
// Seeker posts (round 8 / WP-E) — see AGENTS.md §5/§6 and lib/types.ts's
// SeekerPost/SeekerPostSummary doc comments for the contact-reveal design.
// ---------------------------------------------------------------------------

export interface SeekerPostFilters {
  city?: string;
  jobType?: string;
  status?: SeekerPostStatus;
}

// Explicit column list (never contact_phone/contact_wechat) so the list
// query is structurally incapable of returning contact info, regardless
// of what a future page/component does with the result — see AGENTS.md
// §6's "never render contact info on the list page" floor.
const SEEKER_POST_SUMMARY_COLUMNS = {
  id: seekerPosts.id,
  user_id: seekerPosts.user_id,
  title: seekerPosts.title,
  job_type: seekerPosts.job_type,
  city: seekerPosts.city,
  district: seekerPosts.district,
  experience_years: seekerPosts.experience_years,
  available_from: seekerPosts.available_from,
  residence_status: seekerPosts.residence_status,
  expected_salary_min: seekerPosts.expected_salary_min,
  expected_salary_max: seekerPosts.expected_salary_max,
  salary_period: seekerPosts.salary_period,
  languages: seekerPosts.languages,
  live_in_ok: seekerPosts.live_in_ok,
  bio: seekerPosts.bio,
  status: seekerPosts.status,
  views: seekerPosts.views,
  published_at: seekerPosts.published_at,
  expires_at: seekerPosts.expires_at,
  is_seed: seekerPosts.is_seed,
  created_at: seekerPosts.created_at,
  updated_at: seekerPosts.updated_at,
};

export async function getSeekerPosts(
  filters: SeekerPostFilters = {}
): Promise<SeekerPostSummary[]> {
  const status = filters.status ?? "active";
  const conditions = [eq(seekerPosts.status, status)];
  if (filters.city) conditions.push(eq(seekerPosts.city, filters.city));
  if (filters.jobType) conditions.push(eq(seekerPosts.job_type, filters.jobType));

  return db
    .select(SEEKER_POST_SUMMARY_COLUMNS)
    .from(seekerPosts)
    .where(and(...conditions))
    .orderBy(desc(seekerPosts.published_at));
}

export async function getSeekerPostsByUser(
  userId: string
): Promise<SeekerPost[]> {
  return db
    .select()
    .from(seekerPosts)
    .where(eq(seekerPosts.user_id, userId))
    .orderBy(desc(seekerPosts.created_at));
}

/**
 * revealContact must only be true for an authenticated employer session
 * (see app/employer/seekers/[id]/page.tsx) — this is the one place
 * contact_phone/contact_wechat can leave the database for any viewer
 * other than the post's own owner.
 */
export async function getSeekerPostById(
  id: string,
  options: { revealContact: boolean } = { revealContact: false }
): Promise<SeekerPost | null> {
  const [row] = await db.select().from(seekerPosts).where(eq(seekerPosts.id, id));
  if (!row) return null;
  if (!options.revealContact) {
    return { ...row, contact_phone: "", contact_wechat: "" };
  }
  return row;
}

/** Called when the owner opens their own post — always the full row, contact included. */
export async function getOwnSeekerPostById(
  id: string,
  userId: string
): Promise<SeekerPost | null> {
  const [row] = await db
    .select()
    .from(seekerPosts)
    .where(and(eq(seekerPosts.id, id), eq(seekerPosts.user_id, userId)));
  return row ?? null;
}

export async function incrementSeekerPostViews(id: string): Promise<void> {
  await db
    .update(seekerPosts)
    .set({ views: sql`${seekerPosts.views} + 1` })
    .where(eq(seekerPosts.id, id));
}

/** Creates a seeker post from the templated "发布求职信息" form. */
export async function createSeekerPost(
  input: SeekerPostFormValues & {
    userId: string;
    status: "draft" | "active";
  }
): Promise<SeekerPost> {
  assertNotPlaceholder("title", input.title);
  assertNotPlaceholder("bio", input.bio);

  const [row] = await db
    .insert(seekerPosts)
    .values({
      id: `sp_${randomUUID()}`,
      user_id: input.userId,
      title: input.title,
      job_type: input.jobType,
      city: input.city,
      district: input.district,
      experience_years: input.experienceYears,
      available_from: input.availableFrom,
      residence_status: input.residenceStatus,
      expected_salary_min: input.expectedSalaryMin,
      expected_salary_max: input.expectedSalaryMax,
      salary_period: input.salaryPeriod,
      languages: input.languages,
      live_in_ok: input.liveInOk,
      bio: input.bio,
      contact_phone: input.contactPhone,
      contact_wechat: input.contactWechat,
      status: input.status,
      published_at: input.status === "active" ? new Date().toISOString() : null,
    })
    .returning();
  return row;
}

export async function updateSeekerPostStatus(
  id: string,
  nextStatus: SeekerPostStatus
): Promise<SeekerPost> {
  const [existing] = await db
    .select()
    .from(seekerPosts)
    .where(eq(seekerPosts.id, id));

  if (!existing) {
    throw new Error(`Seeker post ${id} not found`);
  }
  if (!canTransitionSeekerPost(existing.status, nextStatus)) {
    throw new Error(
      `Cannot move seeker post ${id} from status "${existing.status}" to "${nextStatus}"`
    );
  }

  const [row] = await db
    .update(seekerPosts)
    .set({
      status: nextStatus,
      published_at:
        nextStatus === "active" && !existing.published_at
          ? new Date().toISOString()
          : existing.published_at,
      updated_at: new Date().toISOString(),
    })
    .where(eq(seekerPosts.id, id))
    .returning();
  return row;
}
