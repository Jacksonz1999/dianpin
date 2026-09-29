import {
  getApplicationsBySeeker,
  getDemoSeekerId,
  getJobById,
  getStoreById,
} from "@/lib/db";
import { ApplicationsView, type ApplicationRow } from "@/components/ApplicationsView";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const seekerId = await getDemoSeekerId();
  const applications = await getApplicationsBySeeker(seekerId);

  const rows: ApplicationRow[] = await Promise.all(
    applications.map(async (application) => {
      const job = await getJobById(application.job_id);
      const store = job ? await getStoreById(job.store_id) : null;
      return { application, job, store };
    })
  );

  return <ApplicationsView rows={rows} />;
}
