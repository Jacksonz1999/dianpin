import { notFound } from "next/navigation";
import {
  getApplicationsByJob,
  getDemoEmployerId,
  getJobById,
  getJobTypes,
  getSeekerProfileByUserId,
  getStoreById,
  getUserById,
  markSubmittedApplicationsAsViewed,
} from "@/lib/db";
import {
  CandidateListView,
  type CandidateRow,
} from "@/components/CandidateListView";

export const dynamic = "force-dynamic";

export default async function EmployerJobCandidatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  const [store, employerId] = await Promise.all([
    getStoreById(job.store_id),
    getDemoEmployerId(),
  ]);
  if (!store || store.owner_user_id !== employerId) notFound();

  // Opening this page is how the "new" badge on the dashboard gets cleared.
  await markSubmittedApplicationsAsViewed(job.id);

  const [applications, jobTypes] = await Promise.all([
    getApplicationsByJob(job.id),
    getJobTypes(),
  ]);

  const rows: CandidateRow[] = await Promise.all(
    applications.map(async (application) => ({
      application,
      seeker: await getUserById(application.seeker_user_id),
      profile: await getSeekerProfileByUserId(application.seeker_user_id),
    }))
  );

  return (
    <CandidateListView job={job} store={store} rows={rows} jobTypes={jobTypes} />
  );
}
