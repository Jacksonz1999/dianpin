"use server";

import { getJobs, type JobFilters } from "@/lib/db";
import type { Job } from "@/lib/types";

/**
 * lib/db.ts imports the Postgres client (pg), which is Node-only and
 * can't be bundled into the browser. JobsExplorer is a Client Component
 * (it needs instant filter feedback), so it calls this Server Action
 * instead of importing lib/db.ts directly.
 */
export async function searchJobs(filters: JobFilters): Promise<Job[]> {
  return getJobs(filters);
}
