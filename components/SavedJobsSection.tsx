"use client";

import { useEffect, useState } from "react";
import { getSavedJobsDataAction } from "@/app/actions";
import { useSavedJobs } from "@/lib/useSavedJobs";
import type { City, Job, JobType, Store } from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { JobCard } from "./JobCard";

interface SavedJobsData {
  jobs: Job[];
  stores: Store[];
  jobTypes: JobType[];
  cities: City[];
}

const EMPTY: SavedJobsData = { jobs: [], stores: [], jobTypes: [], cities: [] };

/** "我收藏的" section on /me (WP-B3) — ids come from localStorage, details fetched on demand. */
export function SavedJobsSection() {
  const { t } = useLocale();
  const { savedIds } = useSavedJobs();
  const [data, setData] = useState<SavedJobsData>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    if (savedIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(EMPTY);
      return;
    }
    getSavedJobsDataAction(savedIds).then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, [savedIds]);

  const storesById = new Map(data.stores.map((s) => [s.id, s]));
  const jobTypesById = new Map(data.jobTypes.map((jt) => [jt.id, jt]));
  const citiesById = new Map(data.cities.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{t("home.saved.title")}</h2>
      {data.jobs.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t("home.saved.empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.jobs.map((job) => {
            const store = storesById.get(job.store_id);
            const jobType = jobTypesById.get(job.job_type);
            const city = citiesById.get(job.city);
            if (!store || !jobType || !city) return null;
            return <JobCard key={job.id} job={job} store={store} jobType={jobType} city={city} />;
          })}
        </div>
      )}
    </div>
  );
}
