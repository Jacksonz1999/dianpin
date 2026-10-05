import { Suspense } from "react";
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
    // JobsExplorer reads useSearchParams() (J4, round 9: filters sync to
    // the URL so a filtered view is shareable) — Next requires a Suspense
    // boundary around any client component that does, even under
    // force-dynamic. No fallback UI needed: this resolves in the same
    // tick on the client, nothing is actually suspended.
    <Suspense>
      <JobsExplorer
        initialJobs={jobs}
        cities={cities}
        jobTypes={jobTypes}
        stores={stores}
      />
    </Suspense>
  );
}
