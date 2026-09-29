import { getCities, getJobTypes, getJobs, getStores } from "@/lib/db";
import { JobsExplorer } from "@/components/JobsExplorer";

// Job listings change at runtime (new posts, status changes) — render on
// every request instead of freezing a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [cities, jobTypes, jobs, stores] = await Promise.all([
    getCities(),
    getJobTypes(),
    getJobs({ status: "active" }),
    getStores(),
  ]);

  return (
    <JobsExplorer
      initialJobs={jobs}
      cities={cities}
      jobTypes={jobTypes}
      stores={stores}
    />
  );
}
