import { notFound } from "next/navigation";
import {
  getApplicationForJobAndSeeker,
  getCityById,
  getDemoSeekerId,
  getJobById,
  getJobTypeById,
  getJobTypes,
  getSeekerProfileByUserId,
  getStoreById,
  getUserById,
} from "@/lib/db";
import { JobDetailView } from "@/components/JobDetailView";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  const [store, city, jobType, allJobTypes, seekerId] = await Promise.all([
    getStoreById(job.store_id),
    getCityById(job.city),
    getJobTypeById(job.job_type),
    getJobTypes(),
    getDemoSeekerId(),
  ]);

  if (!store || !city || !jobType) notFound();

  const [existingApplication, seekerProfile, seekerUser] = await Promise.all([
    getApplicationForJobAndSeeker(job.id, seekerId),
    getSeekerProfileByUserId(seekerId),
    getUserById(seekerId),
  ]);

  return (
    <JobDetailView
      job={job}
      store={store}
      city={city}
      jobType={jobType}
      jobTypes={allJobTypes}
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
  );
}
