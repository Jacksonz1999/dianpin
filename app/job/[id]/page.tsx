import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getApplicationForJobAndSeeker,
  getCityById,
  getJobById,
  getJobTypeById,
  getJobTypes,
  getSeekerProfileByUserId,
  getStoreById,
  getUserById,
} from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { jobMetadata, jobPostingJsonLd, jsonLdScriptContent } from "@/lib/seo";
import { JobDetailView } from "@/components/JobDetailView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) return {};

  const [store, city] = await Promise.all([
    getStoreById(job.store_id),
    getCityById(job.city),
  ]);
  if (!store || !city) return {};

  return jobMetadata(job, store, city);
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  const [store, city, jobType, allJobTypes, session] = await Promise.all([
    getStoreById(job.store_id),
    getCityById(job.city),
    getJobTypeById(job.job_type),
    getJobTypes(),
    getSession(),
  ]);

  if (!store || !city || !jobType) notFound();

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScriptContent(jobPostingJsonLd(job, store, city)),
        }}
      />
      <JobDetailView
        job={job}
        store={store}
        city={city}
        jobType={jobType}
        jobTypes={allJobTypes}
        isLoggedIn={!!session}
        isLoggedInSeeker={isSeeker}
        existingApplication={existingApplication}
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
