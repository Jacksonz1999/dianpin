import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  getJobById,
  getJobTypes,
  getStoreById,
  getStoresByOwner,
} from "@/lib/db";
import { JobCreateForm } from "@/components/JobCreateForm";

export const dynamic = "force-dynamic";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("employer", `/employer/job/${id}/edit`);
  const job = await getJobById(id);
  if (!job) notFound();
  const store = await getStoreById(job.store_id);
  if (!store || store.owner_user_id !== session.userId) notFound();

  const [stores, jobTypes] = await Promise.all([
    getStoresByOwner(session.userId),
    getJobTypes(),
  ]);
  return <JobCreateForm stores={stores} jobTypes={jobTypes} job={job} />;
}
