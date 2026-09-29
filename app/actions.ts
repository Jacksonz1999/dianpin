"use server";

import { revalidatePath } from "next/cache";
import {
  advanceApplicationStatus,
  createApplication,
  createJob,
  createReport,
  createStore,
  getApplicationById,
  getApplicationForJobAndSeeker,
  getJobById,
  getJobs,
  getSeekerProfileByUserId,
  getStoreById,
  saveSeekerProfile,
  submitStoreForVerification,
  updateJobStatus,
  withdrawApplication,
  type JobFilters,
} from "@/lib/db";
import { requireRole, requireSession } from "@/lib/auth/session";
import type {
  ApplicationStatus,
  Job,
  JobFormValues,
  JobStatus,
  ReportTargetType,
  SeekerProfileFormValues,
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
): Promise<{ ok: true; storeId: string }> {
  const session = await requireRole("employer", "/employer");
  const store = await createStore({ ownerUserId: session.userId, ...input });
  revalidatePath("/employer");
  return { ok: true, storeId: store.id };
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

  const job = await createJob({ ...input, city: store.city });
  revalidatePath("/employer");
  return { ok: true, jobId: job.id };
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
