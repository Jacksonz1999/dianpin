import {
  getApplicationsByJob,
  getCities,
  getJobsByStore,
  getStoresByOwner,
} from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import {
  EmployerDashboardView,
  type JobWithNewCount,
  type StoreWithJobs,
} from "@/components/EmployerDashboardView";

export const dynamic = "force-dynamic";

export default async function EmployerDashboardPage() {
  const session = await requireRole("employer", "/employer");
  const [stores, cities] = await Promise.all([
    getStoresByOwner(session.userId),
    getCities(),
  ]);

  const groups: StoreWithJobs[] = await Promise.all(
    stores.map(async (store) => {
      const jobs = await getJobsByStore(store.id);
      const jobsWithCounts: JobWithNewCount[] = await Promise.all(
        jobs.map(async (job) => {
          const applications = await getApplicationsByJob(job.id);
          return {
            job,
            newApplicationsCount: applications.filter(
              (a) => a.status === "submitted"
            ).length,
          };
        })
      );
      return { store, jobs: jobsWithCounts };
    })
  );

  return <EmployerDashboardView groups={groups} cities={cities} />;
}
