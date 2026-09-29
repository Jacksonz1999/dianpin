import { getCities, getJobTypes, getJobs, getStores } from "@/lib/db";
import { JobsExplorer } from "@/components/JobsExplorer";

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
