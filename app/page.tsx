import { Suspense } from "react";
import { getCities, getJobTypes, getJobs, getStores } from "@/lib/db";
import { JobsExplorer } from "@/components/JobsExplorer";

// Job listings change at runtime (new posts, status changes) — render on
// every request instead of freezing a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
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
        // Set by lib/auth/session.ts's requireRole when a logged-in
        // seeker-role account hits an employer-only page — explains the
        // bounce instead of silently landing here (see Header.tsx's new
        // employer entry, which is what makes this reachable at all now).
        roleMismatchError={params.error === "role_mismatch"}
      />
    </Suspense>
  );
}
