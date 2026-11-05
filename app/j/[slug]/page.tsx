import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getApplicationForJobAndSeeker,
  getCityById,
  getJobById,
  getJobBySlug,
  getJobPosterMeta,
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

// QR landing for PegaLocal poster jobs: /es/j/{slug} and /en/j/{slug} are
// rewritten here by proxy.ts (locale comes from the x-dianpin-locale header).
// Only jobs that actually have a poster_slug resolve; everything else 404s.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await getJobBySlug(slug);
  if (!resolved) return {};
  const [locale, job] = await Promise.all([
    getRequestLocale(),
    getJobById(resolved.id),
  ]);
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

export default async function PosterJobLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await getJobBySlug(slug);
  if (!resolved) notFound();

  const [locale, job] = await Promise.all([
    getRequestLocale(),
    getJobById(resolved.id),
  ]);
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
    posterMeta,
  ] = await Promise.all([
    getStoreById(job.store_id),
    getCityById(job.city),
    getJobTypeById(job.job_type),
    getJobTypes(),
    getSession(),
    getStores(),
    getJobsByStore(job.store_id),
    getJobs({ status: "active", jobType: job.job_type }),
    getJobs({ status: "active", city: job.city }),
    getJobPosterMeta(job.id),
  ]);

  if (!storeRow || !city || !jobType) notFound();

  const store = sanitizePublicStore(storeRow);
  const stores = allStores.map(sanitizePublicStore);
  const expired = isJobExpired(job);

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
        posterMeta={posterMeta}
      />
    </>
  );
}
