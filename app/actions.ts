"use server";

import { revalidatePath } from "next/cache";
import {
  advanceApplicationStatus,
  createApplication,
  createJob,
  createReport,
  createSeekerPost,
  createStore,
  getApplicationById,
  getApplicationForJobAndSeeker,
  getCities,
  getJobById,
  getJobs,
  getJobsByIds,
  getJobTypes,
  getOwnSeekerPostById,
  getSeekerPosts,
  getSeekerProfileByUserId,
  getStoreById,
  getStores,
  saveSeekerProfile,
  submitStoreForVerification,
  updateJobStatus,
  updateSeekerPostStatus,
  withdrawApplication,
  type JobFilters,
  type SeekerPostFilters,
} from "@/lib/db";
import {
  sendJobAlertConfirmationEmail,
  subscribeJobAlert,
} from "@/lib/job-alerts";
import { getSession, requireRole, requireSession } from "@/lib/auth/session";
import { PlaceholderValueError } from "@/lib/validation";
import type { Locale } from "@/lib/i18n";
import type {
  ApplicationStatus,
  City,
  Job,
  JobAlertFormValues,
  JobFormValues,
  JobStatus,
  JobType,
  ReportTargetType,
  SeekerPostFormValues,
  SeekerPostStatus,
  SeekerPostSummary,
  SeekerProfileFormValues,
  Store,
  StoreFormValues,
} from "@/lib/types";

/**
 * lib/db.ts imports the Postgres client (pg), which is Node-only and
 * can't be bundled into the browser. Interactive Client Components call
 * these Server Actions instead of importing lib/db.ts directly.
 */
export async function searchJobs(filters: JobFilters): Promise<Job[]> {
  return getJobs(filters);
}

export type ApplyToJobResult =
  | { ok: true; applicationId: string }
  | {
      ok: false;
      error: "already_applied" | "profile_required" | "unknown";
    };

/** Postgres unique_violation error code — see https://www.postgresql.org/docs/current/errcodes-appendix.html */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}

/**
 * Submits an application for the signed-in seeker (redirects to /login if
 * not signed in — the job detail page shows an "apply" link that already
 * points there for anonymous visitors, this is the belt-and-suspenders
 * server-side check per AGENTS.md's "服务端校验，不靠前端过滤"). `profile`
 * is required only the first time (no seeker_profiles row yet).
 */
export async function applyToJob(input: {
  jobId: string;
  message: string;
  profile?: SeekerProfileFormValues;
}): Promise<ApplyToJobResult> {
  const session = await requireRole("seeker", `/job/${input.jobId}`);
  const seekerId = session.userId;

  const [existingApplication, existingProfile] = await Promise.all([
    getApplicationForJobAndSeeker(input.jobId, seekerId),
    getSeekerProfileByUserId(seekerId),
  ]);

  if (existingApplication) {
    return { ok: false, error: "already_applied" };
  }
  if (!existingProfile && !input.profile) {
    return { ok: false, error: "profile_required" };
  }

  if (input.profile) {
    await saveSeekerProfile({ userId: seekerId, ...input.profile });
  }

  let application;
  try {
    application = await createApplication({
      jobId: input.jobId,
      seekerUserId: seekerId,
      message: input.message,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // UNIQUE(job_id, seeker_user_id) constraint, from a duplicate submit
      // racing the existence check above.
      return { ok: false, error: "already_applied" };
    }
    throw err;
  }

  revalidatePath(`/job/${input.jobId}`);
  revalidatePath("/me/applications");
  revalidatePath("/me");
  return { ok: true, applicationId: application.id };
}

/** Used by the /me profile editor (not the first-time apply flow, which goes through applyToJob). */
export async function saveProfileAction(
  profile: SeekerProfileFormValues
): Promise<void> {
  const session = await requireRole("seeker", "/me");
  await saveSeekerProfile({ userId: session.userId, ...profile });
  revalidatePath("/me");
}

export async function withdrawApplicationAction(
  applicationId: string
): Promise<void> {
  const session = await requireRole("seeker", "/me/applications");

  const application = await getApplicationById(applicationId);
  if (!application || application.seeker_user_id !== session.userId) {
    throw new Error(
      `Application ${applicationId} does not belong to the current user`
    );
  }

  await withdrawApplication(applicationId);
  revalidatePath("/me/applications");
}

export async function submitReportAction(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}): Promise<void> {
  const session = await requireSession();
  await createReport({
    targetType: input.targetType,
    targetId: input.targetId,
    reporterUserId: session.userId,
    reason: input.reason,
  });
}

export async function createStoreAction(
  input: StoreFormValues
): Promise<{ ok: true; storeId: string } | { ok: false; error: string }> {
  const session = await requireRole("employer", "/employer");
  try {
    const store = await createStore({ ownerUserId: session.userId, ...input });
    revalidatePath("/employer");
    return { ok: true, storeId: store.id };
  } catch (err) {
    if (err instanceof PlaceholderValueError) {
      return { ok: false, error: "placeholder_content" };
    }
    throw err;
  }
}

async function assertOwnsStore(storeId: string, employerId: string): Promise<void> {
  const store = await getStoreById(storeId);
  if (!store || store.owner_user_id !== employerId) {
    throw new Error(`Store ${storeId} is not owned by the current employer`);
  }
}

export async function submitStoreVerificationAction(
  storeId: string
): Promise<void> {
  const session = await requireRole("employer", "/employer");
  await assertOwnsStore(storeId, session.userId);
  await submitStoreForVerification(storeId);
  revalidatePath("/employer");
}

export async function createJobAction(
  input: JobFormValues & { storeId: string; status: "draft" | "active" }
): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  const session = await requireRole("employer", "/employer/new");

  const store = await getStoreById(input.storeId);
  if (!store) {
    return { ok: false, error: "store_not_found" };
  }
  await assertOwnsStore(input.storeId, session.userId);

  try {
    const job = await createJob({ ...input, city: store.city });
    revalidatePath("/employer");
    return { ok: true, jobId: job.id };
  } catch (err) {
    if (err instanceof PlaceholderValueError) {
      return { ok: false, error: "placeholder_content" };
    }
    throw err;
  }
}

async function assertOwnsJob(jobId: string, employerId: string): Promise<void> {
  const job = await getJobById(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }
  await assertOwnsStore(job.store_id, employerId);
}

export async function updateJobStatusAction(
  jobId: string,
  status: JobStatus
): Promise<void> {
  const session = await requireRole("employer", "/employer");
  await assertOwnsJob(jobId, session.userId);
  await updateJobStatus(jobId, status);
  revalidatePath("/employer");
  revalidatePath(`/employer/job/${jobId}`);
}

export async function advanceApplicationStatusAction(
  applicationId: string,
  status: ApplicationStatus
): Promise<void> {
  const session = await requireRole("employer", "/employer");

  const application = await getApplicationById(applicationId);
  if (!application) {
    throw new Error(`Application ${applicationId} not found`);
  }
  await assertOwnsJob(application.job_id, session.userId);

  await advanceApplicationStatus(applicationId, status);
  revalidatePath(`/employer/job/${application.job_id}`);
  revalidatePath("/employer");
}

export type SubscribeJobAlertResult =
  | { ok: true }
  | { ok: false; error: "invalid_email" | "unknown" };

/**
 * "有新岗位通知我" (WP-B1). Works signed-out — browsing/subscribing stays
 * conversion-friendly per AGENTS.md §6 — but attaches the session's
 * seeker id when one exists. `honeypot` mirrors the login form's
 * anti-bot field (app/auth-actions.ts): a real visitor never fills a
 * field hidden with CSS, so a non-empty value pretends success instead
 * of revealing the trap.
 */
export async function subscribeJobAlertAction(
  input: JobAlertFormValues & { honeypot: string; locale: Locale }
): Promise<SubscribeJobAlertResult> {
  if (input.honeypot.trim().length > 0) {
    return { ok: true };
  }

  const email = input.email.trim();
  if (!email || !email.includes("@") || email.length > 254) {
    return { ok: false, error: "invalid_email" };
  }

  const session = await getSession();
  const seekerUserId = session?.role === "seeker" ? session.userId : null;

  try {
    const { alert, needsConfirmation } = await subscribeJobAlert({
      ...input,
      email,
      seekerUserId,
    });
    if (needsConfirmation) {
      await sendJobAlertConfirmationEmail(alert);
    }
    return { ok: true };
  } catch (err) {
    console.error("[job-alerts] subscribeJobAlertAction failed:", err);
    return { ok: false, error: "unknown" };
  }
}

/**
 * Backs the "我收藏的" section (WP-B3). `jobIds` comes from the browser's
 * localStorage (lib/useSavedJobs.ts) — lib/db.ts imports the Postgres
 * client directly, so the client component can't call it itself. Returns
 * the full stores/jobTypes/cities lists (small, already fetched this way
 * elsewhere — see components/JobsExplorer.tsx) so the caller can render
 * JobCard the same way the home page does.
 */
export async function getSavedJobsDataAction(jobIds: string[]): Promise<{
  jobs: Job[];
  stores: Store[];
  jobTypes: JobType[];
  cities: City[];
}> {
  const [jobs, stores, jobTypes, cities] = await Promise.all([
    getJobsByIds(jobIds),
    getStores(),
    getJobTypes(),
    getCities(),
  ]);
  return { jobs, stores, jobTypes, cities };
}

// ---------------------------------------------------------------------------
// Seeker posts (round 8 / WP-E)
// ---------------------------------------------------------------------------

export async function searchSeekerPosts(
  filters: SeekerPostFilters
): Promise<SeekerPostSummary[]> {
  return getSeekerPosts(filters);
}

export type CreateSeekerPostResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

export async function createSeekerPostAction(
  input: SeekerPostFormValues & { status: "draft" | "active" }
): Promise<CreateSeekerPostResult> {
  const session = await requireRole("seeker", "/me/posts/new");

  try {
    const post = await createSeekerPost({ ...input, userId: session.userId });
    revalidatePath("/me/posts");
    return { ok: true, postId: post.id };
  } catch (err) {
    if (err instanceof PlaceholderValueError) {
      return { ok: false, error: "placeholder_content" };
    }
    throw err;
  }
}

export async function updateSeekerPostStatusAction(
  postId: string,
  status: SeekerPostStatus
): Promise<void> {
  const session = await requireRole("seeker", "/me/posts");
  const own = await getOwnSeekerPostById(postId, session.userId);
  if (!own) {
    throw new Error(`Seeker post ${postId} not found`);
  }
  await updateSeekerPostStatus(postId, status);
  revalidatePath("/me/posts");
}
