"use client";

import { useEffect, useMemo, useState } from "react";
import { searchJobs } from "@/app/actions";
import type { City, Job, JobType, Store } from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { JobCard } from "./JobCard";

const ALL = "";

export function JobsExplorer({
  initialJobs,
  cities,
  jobTypes,
  stores,
}: {
  initialJobs: Job[];
  cities: City[];
  jobTypes: JobType[];
  stores: Store[];
}) {
  const { locale, t } = useLocale();

  const [city, setCity] = useState<string>(ALL);
  const [jobType, setJobType] = useState<string>(ALL);
  const [mealsIncluded, setMealsIncluded] = useState(false);
  const [residenceOk, setResidenceOk] = useState(false);
  const [salaryMin, setSalaryMin] = useState<string>("");
  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  useEffect(() => {
    let cancelled = false;
    const salaryMinNum = salaryMin ? Number(salaryMin) : undefined;

    searchJobs({
      status: "active",
      city: city || undefined,
      jobType: jobType || undefined,
      mealsIncluded: mealsIncluded || undefined,
      residenceOk: residenceOk || undefined,
      salaryMin: Number.isFinite(salaryMinNum) ? salaryMinNum : undefined,
    }).then((result) => {
      if (!cancelled) setJobs(result);
    });

    return () => {
      cancelled = true;
    };
  }, [city, jobType, mealsIncluded, residenceOk, salaryMin]);

  const storesById = useMemo(
    () => new Map(stores.map((s) => [s.id, s])),
    [stores]
  );
  const jobTypesById = useMemo(
    () => new Map(jobTypes.map((jt) => [jt.id, jt])),
    [jobTypes]
  );
  const citiesById = useMemo(
    () => new Map(cities.map((c) => [c.id, c])),
    [cities]
  );

  function resetFilters() {
    setJobType(ALL);
    setMealsIncluded(false);
    setResidenceOk(false);
    setSalaryMin("");
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-semibold">{t("home.title")}</h1>

      <div className="flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setCity(ALL)}
          className={
            "min-h-[36px] shrink-0 rounded-full px-3 text-sm " +
            (city === ALL
              ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
              : "bg-[var(--color-bg)] text-[var(--color-text-muted)]")
          }
        >
          {t("common.all")}
        </button>
        {cities.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCity(c.id)}
            className={
              "min-h-[36px] shrink-0 rounded-full px-3 text-sm " +
              (city === c.id
                ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
                : "bg-[var(--color-bg)] text-[var(--color-text-muted)]")
            }
          >
            {locale === "es" ? c.name_es : c.name_zh}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("home.filters.title")}</span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-[var(--color-text-muted)] underline"
          >
            {t("common.reset")}
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          {t("home.filters.jobType")}
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
          >
            <option value={ALL}>{t("common.all")}</option>
            {jobTypes.map((jt) => (
              <option key={jt.id} value={jt.id}>
                {jt.icon} {locale === "es" ? jt.name_es : jt.name_zh}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-h-[44px] items-center justify-between text-sm">
          {t("home.filters.mealsIncluded")}
          <input
            type="checkbox"
            checked={mealsIncluded}
            onChange={(e) => setMealsIncluded(e.target.checked)}
            className="h-5 w-5"
          />
        </label>

        <label className="flex min-h-[44px] items-center justify-between text-sm">
          {t("home.filters.residenceOk")}
          <input
            type="checkbox"
            checked={residenceOk}
            onChange={(e) => setResidenceOk(e.target.checked)}
            className="h-5 w-5"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("home.filters.salaryMin")}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
            placeholder="0"
            className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
          />
        </label>
      </div>

      <p className="text-sm text-[var(--color-text-muted)]">
        {t("home.resultsCount", { count: jobs.length })}
      </p>

      {jobs.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
          {t("home.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => {
            const store = storesById.get(job.store_id);
            const type = jobTypesById.get(job.job_type);
            const cityInfo = citiesById.get(job.city);
            if (!store || !type || !cityInfo) return null;
            return (
              <JobCard
                key={job.id}
                job={job}
                store={store}
                jobType={type}
                city={cityInfo}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
