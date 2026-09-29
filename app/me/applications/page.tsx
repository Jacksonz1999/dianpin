import { getApplicationsBySeeker, getJobById, getStoreById } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { ApplicationsView, type ApplicationRow } from "@/components/ApplicationsView";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const session = await requireRole("seeker", "/me/applications");
  const applications = await getApplicationsBySeeker(session.userId);

  const rows: ApplicationRow[] = await Promise.all(
    applications.map(async (application) => {
      const job = await getJobById(application.job_id);
      const store = job ? await getStoreById(job.store_id) : null;
      return { application, job, store };
    })
  );

  return <ApplicationsView rows={rows} />;
}
