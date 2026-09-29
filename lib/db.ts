import {
  seedApplications,
  seedCities,
  seedJobTypes,
  seedJobs,
  seedReviews,
  seedStores,
  seedUsers,
} from "./seed";
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
import { normalizeSalaryToMonth } from "./types";

/**
 * In-memory data access layer backed by lib/seed.ts.
 *
 * Every function is async and returns a Promise so page code never
 * changes when this file is swapped for a real Postgres/Drizzle
 * implementation in WP1 — only the function bodies here change.
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
  return seedCities;
}

export async function getCityById(id: string): Promise<City | null> {
  return seedCities.find((c) => c.id === id) ?? null;
}

export async function getJobTypes(): Promise<JobType[]> {
  return seedJobTypes;
}

export async function getStores(): Promise<Store[]> {
  return seedStores;
}

export async function getStoreById(id: string): Promise<Store | null> {
  return seedStores.find((s) => s.id === id) ?? null;
}

export async function getStoresByOwner(ownerUserId: string): Promise<Store[]> {
  return seedStores.filter((s) => s.owner_user_id === ownerUserId);
}

export async function getJobs(filters: JobFilters = {}): Promise<Job[]> {
  const status = filters.status ?? "active";

  const filtered = seedJobs.filter((job) => {
    if (job.status !== status) return false;
    if (filters.city && job.city !== filters.city) return false;
    if (filters.jobType && job.job_type !== filters.jobType) return false;
    if (filters.mealsIncluded && !job.meals_included) return false;
    if (filters.residenceOk && job.residence_required === "required") {
      return false;
    }
    if (filters.salaryMin) {
      const monthlyMax = normalizeSalaryToMonth(
        job.salary_max,
        job.salary_period
      );
      if (monthlyMax < filters.salaryMin) return false;
    }
    return true;
  });

  return filtered.sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

export async function getJobById(id: string): Promise<Job | null> {
  return seedJobs.find((j) => j.id === id) ?? null;
}

export async function getJobsByStore(storeId: string): Promise<Job[]> {
  return seedJobs.filter((j) => j.store_id === storeId);
}

export async function getReviewsByStore(storeId: string): Promise<Review[]> {
  return seedReviews.filter((r) => r.store_id === storeId);
}

export async function getApplicationsBySeeker(
  seekerUserId: string
): Promise<Application[]> {
  return seedApplications.filter((a) => a.seeker_user_id === seekerUserId);
}

export async function getApplicationsByJob(
  jobId: string
): Promise<Application[]> {
  return seedApplications.filter((a) => a.job_id === jobId);
}

export async function getUserById(id: string): Promise<User | null> {
  return seedUsers.find((u) => u.id === id) ?? null;
}

/** Demo seeker used to power the /me/applications placeholder before auth (WP4) exists. */
export async function getDemoSeekerId(): Promise<string> {
  return "u_seek_1";
}

/** Demo employer used to power the /employer/* placeholders before auth (WP4) exists. */
export async function getDemoEmployerId(): Promise<string> {
  return "u_emp_jinlong";
}
