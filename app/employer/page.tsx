import {
  getApplicationsByJob,
  getCities,
  getDemoEmployerId,
  getJobsByStore,
  getStoresByOwner,
} from "@/lib/db";
import {
  EmployerDashboardView,
  type JobWithNewCount,
  type StoreWithJobs,
} from "@/components/EmployerDashboardView";

export const dynamic = "force-dynamic";

export default async function EmployerDashboardPage() {
  const employerId = await getDemoEmployerId();
  const [stores, cities] = await Promise.all([
    getStoresByOwner(employerId),
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
