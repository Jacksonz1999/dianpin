import { notFound } from "next/navigation";
import {
  getApplicationsByJob,
  getJobById,
  getJobTypes,
  getSeekerProfileByUserId,
  getStoreById,
  getUserById,
  markSubmittedApplicationsAsViewed,
} from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
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
  const session = await requireRole("employer", `/employer/job/${id}`);

  const job = await getJobById(id);
  if (!job) notFound();

  const store = await getStoreById(job.store_id);
  if (!store || store.owner_user_id !== session.userId) notFound();

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
