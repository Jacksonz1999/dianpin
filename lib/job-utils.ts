import type { Job } from "./types";

/**
 * A job is live only while it is `active` AND its expiry (if any) is in the
 * future. Used by the public list/detail/apply paths as the single source of
 * truth — filtering only in the list query left expired detail pages
 * (including their JobPosting JSON-LD and apply button) online.
 */
export function isJobExpired(job: Job, now: number = Date.now()): boolean {
  if (job.status !== "active") return true;
  if (!job.expires_at) return false;
  const expiresAt = Date.parse(job.expires_at);
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

export function isJobLive(job: Job, now: number = Date.now()): boolean {
  return !isJobExpired(job, now);
}

/** Whole days since publication, clamped at 0 — never a negative "future" age. */
export function daysSincePublished(job: Job, now: number = Date.now()): number {
  const published = Date.parse(job.published_at);
  if (!Number.isFinite(published)) return 0;
  return Math.max(0, Math.floor((now - published) / 86_400_000));
}
