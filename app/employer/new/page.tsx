import { getDemoEmployerId, getJobTypes, getStoresByOwner } from "@/lib/db";
import { JobCreateForm } from "@/components/JobCreateForm";

export const dynamic = "force-dynamic";

export default async function EmployerNewJobPage() {
  const employerId = await getDemoEmployerId();
  const [stores, jobTypes] = await Promise.all([
    getStoresByOwner(employerId),
    getJobTypes(),
  ]);

  return <JobCreateForm stores={stores} jobTypes={jobTypes} />;
}
