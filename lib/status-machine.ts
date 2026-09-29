import type {
  ApplicationStatus,
  JobStatus,
  StoreVerificationStatus,
} from "./types";

/**
 * Centralized state machines for `applications.status` and `jobs.status`.
 * UI code must call these helpers instead of hard-coding which
 * transitions are legal (see AGENTS.md §8).
 */

const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ["viewed", "withdrawn"],
  viewed: ["contacted", "rejected", "withdrawn"],
  contacted: ["hired", "rejected", "withdrawn"],
  hired: [],
  rejected: [],
  withdrawn: [],
};

export function nextApplicationStatuses(
  from: ApplicationStatus
): ApplicationStatus[] {
  return APPLICATION_TRANSITIONS[from];
}

export function canTransitionApplication(
  from: ApplicationStatus,
  to: ApplicationStatus
): boolean {
  return APPLICATION_TRANSITIONS[from].includes(to);
}

export function isTerminalApplicationStatus(
  status: ApplicationStatus
): boolean {
  return APPLICATION_TRANSITIONS[status].length === 0;
}

/** Only these statuses reveal the seeker's contact details to the employer. */
export function applicationRevealsContact(status: ApplicationStatus): boolean {
  return status === "contacted" || status === "hired";
}

/**
 * Statuses an employer is allowed to move an application to. Same table as
 * canTransitionApplication, minus "withdrawn" — that's a seeker-only action
 * (see app/me/applications), never something an employer sets.
 */
export function nextEmployerApplicationStatuses(
  from: ApplicationStatus
): ApplicationStatus[] {
  return nextApplicationStatuses(from).filter((s) => s !== "withdrawn");
}

const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ["active"],
  active: ["paused", "filled", "closed"],
  paused: ["active", "closed"],
  filled: ["active", "closed"],
  closed: [],
};

export function nextJobStatuses(from: JobStatus): JobStatus[] {
  return JOB_TRANSITIONS[from];
}

export function canTransitionJob(from: JobStatus, to: JobStatus): boolean {
  return JOB_TRANSITIONS[from].includes(to);
}

export function isTerminalJobStatus(status: JobStatus): boolean {
  return JOB_TRANSITIONS[status].length === 0;
}

/** Only jobs in this status should appear in the public job feed. */
export function isJobPubliclyVisible(status: JobStatus): boolean {
  return status === "active";
}

/**
 * unverified/rejected -> pending is the only transition an employer
 * triggers (submitting for review). pending -> verified/rejected is an
 * admin action with no UI yet (out of scope for WP3's employer side).
 */
export function canSubmitStoreForVerification(
  status: StoreVerificationStatus
): boolean {
  return status === "unverified" || status === "rejected";
}
