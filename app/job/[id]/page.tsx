import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getApplicationForJobAndSeeker,
  getCityById,
  getJobById,
  getJobTypeById,
  getJobTypes,
  getJobs,
  getJobsByStore,
  getSeekerProfileByUserId,
  getStoreById,
  getStores,
  getUserById,
} from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { isJobExpired, isJobLive } from "@/lib/job-utils";
import { getRequestLocale } from "@/lib/locale-server";
import { sanitizePublicStore } from "@/lib/public-store";
import {
  jobMetadata,
  jobPostingJsonLd,
  jsonLdScriptContent,
} from "@/lib/seo";
import { JobDetailView } from "@/components/JobDetailView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [locale, job] = await Promise.all([getRequestLocale(), getJobById(id)]);
  if (!job) return {};

  const [store, city] = await Promise.all([
    getStoreById(job.store_id),
    getCityById(job.city),
  ]);
  if (!store || !city) return {};

  return jobMetadata(job, sanitizePublicStore(store), city, locale, {
    expired: isJobExpired(job),
  });
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [locale, job] = await Promise.all([getRequestLocale(), getJobById(id)]);
  if (!job) notFound();

  const [
    storeRow,
    city,
    jobType,
    allJobTypes,
    session,
    allStores,
    storeJobs,
    sameTypeJobs,
    sameCityJobs,
  ] = await Promise.all([
    getStoreById(job.store_id),
    getCityById(job.city),
    getJobTypeById(job.job_type),
    getJobTypes(),
    getSession(),
    getStores(),
    getJobsByStore(job.store_id),
    // getJobs() already excludes expired/closed rows (audit P0-3), so
    // recommendations can never send a seeker to a dead posting.
    getJobs({ status: "active", jobType: job.job_type }),
    getJobs({ status: "active", city: job.city }),
  ]);

  if (!storeRow || !city || !jobType) notFound();

  const store = sanitizePublicStore(storeRow);
  const stores = allStores.map(sanitizePublicStore);
  const expired = isJobExpired(job);

  // Browsing stays anonymous per AGENTS.md §6; only applying requires a
  // seeker session, so everything below is optional/null when logged out
  // or logged in as an employer.
  const isSeeker = session?.role === "seeker";
  const seekerId = isSeeker ? session.userId : null;

  const [existingApplication, seekerProfile, seekerUser] = seekerId
    ? await Promise.all([
        getApplicationForJobAndSeeker(job.id, seekerId),
        getSeekerProfileByUserId(seekerId),
        getUserById(seekerId),
      ])
    : [null, null, null];

  const otherJobs = storeJobs
    .filter((candidate) => candidate.id !== job.id && isJobLive(candidate))
    .slice(0, 3);

  const seen = new Set<string>([job.id, ...otherJobs.map((j) => j.id)]);
  const similarJobs = [...sameTypeJobs, ...sameCityJobs]
    .filter((candidate) => {
      if (seen.has(candidate.id)) return false;
      seen.add(candidate.id);
      return true;
    })
    .slice(0, 3);

  return (
    <>
      {/* An expired JobPosting must NOT keep serving structured data —
          Google treats stale JobPosting markup as index spam (P0-3). */}
      {!expired && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScriptContent(
              jobPostingJsonLd(job, store, city, locale)
            ),
          }}
        />
      )}
      <JobDetailView
        job={job}
        store={store}
        city={city}
        jobType={jobType}
        jobTypes={allJobTypes}
        stores={stores}
        otherJobs={otherJobs}
        similarJobs={similarJobs}
        expired={expired}
        isLoggedIn={!!session}
        isLoggedInSeeker={isSeeker}
        existingApplicationStatus={existingApplication?.status ?? null}
        hasProfile={!!seekerProfile}
        initialProfileValues={{
          name: seekerUser?.name ?? "",
          phone: seekerUser?.phone ?? "",
          jobTypes: seekerProfile?.job_types ?? [],
          experienceYears: seekerProfile?.experience_years ?? null,
          availableFrom: seekerProfile?.available_from?.slice(0, 10) ?? null,
          residenceStatus: seekerProfile?.residence_status ?? null,
          expectedSalaryMin: seekerProfile?.expected_salary_min ?? null,
          expectedSalaryMax: seekerProfile?.expected_salary_max ?? null,
        }}
      />
    </>
  );
}
