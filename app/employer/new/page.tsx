import { getJobTypes, getStoresByOwner } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { JobCreateForm } from "@/components/JobCreateForm";

export const dynamic = "force-dynamic";

export default async function EmployerNewJobPage() {
  const session = await requireRole("employer", "/employer/new");
  const [stores, jobTypes] = await Promise.all([
    getStoresByOwner(session.userId),
    getJobTypes(),
  ]);

  return <JobCreateForm stores={stores} jobTypes={jobTypes} />;
}
