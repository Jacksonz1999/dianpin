"use server";

import { revalidatePath } from "next/cache";
import {
  createApplication,
  createReport,
  getApplicationForJobAndSeeker,
  getDemoSeekerId,
  getJobs,
  getSeekerProfileByUserId,
  saveSeekerProfile,
  withdrawApplication,
  type JobFilters,
} from "@/lib/db";
import type {
  Job,
  ReportTargetType,
  SeekerProfileFormValues,
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
  | { ok: false; error: "already_applied" | "profile_required" | "unknown" };

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
 * Submits an application for the demo seeker. `profile` is required only
 * the first time (no seeker_profiles row yet) — the apply UI decides
 * whether to collect it based on the `hasProfile` flag the job detail
 * page already fetched server-side; this action re-checks it too, since a
 * Server Action can be invoked directly regardless of what the UI sent.
 */
export async function applyToJob(input: {
  jobId: string;
  message: string;
  profile?: SeekerProfileFormValues;
}): Promise<ApplyToJobResult> {
  const seekerId = await getDemoSeekerId();

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
  const seekerId = await getDemoSeekerId();
  await saveSeekerProfile({ userId: seekerId, ...profile });
  revalidatePath("/me");
}

export async function withdrawApplicationAction(
  applicationId: string
): Promise<void> {
  await withdrawApplication(applicationId);
  revalidatePath("/me/applications");
}

export async function submitReportAction(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}): Promise<void> {
  const seekerId = await getDemoSeekerId();
  await createReport({
    targetType: input.targetType,
    targetId: input.targetId,
    reporterUserId: seekerId,
    reason: input.reason,
  });
}
