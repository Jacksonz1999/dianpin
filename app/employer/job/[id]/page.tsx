import { notFound } from "next/navigation";
import {
  getCandidateRowsByJob,
  getJobById,
  getJobTypes,
  getStoreById,
  markSubmittedApplicationsAsViewed,
} from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { CandidateListView } from "@/components/CandidateListView";

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

  const [rows, jobTypes] = await Promise.all([
    getCandidateRowsByJob(job.id),
    getJobTypes(),
  ]);

  return (
    <CandidateListView job={job} store={store} rows={rows} jobTypes={jobTypes} />
  );
}
