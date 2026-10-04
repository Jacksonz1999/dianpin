"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { searchJobs } from "@/app/actions";
import type { City, Job, JobType, Store } from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { JobCard } from "./JobCard";
import { JobAlertSubscribeForm } from "./JobAlertSubscribeForm";

const ALL = "";

export function JobsExplorer({
  initialJobs,
  cities,
  jobTypes,
  stores,
  roleMismatchError = false,
}: {
  initialJobs: Job[];
  cities: City[];
  jobTypes: JobType[];
  stores: Store[];
  roleMismatchError?: boolean;
}) {
  const { locale, t } = useLocale();

  const [city, setCity] = useState<string>(ALL);
  const [jobType, setJobType] = useState<string>(ALL);
  const [mealsIncluded, setMealsIncluded] = useState(false);
  const [residenceOk, setResidenceOk] = useState(false);
  const [salaryMin, setSalaryMin] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

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
      search: search || undefined,
    }).then((result) => {
      if (!cancelled) setJobs(result);
    });

    return () => {
      cancelled = true;
    };
  }, [city, jobType, mealsIncluded, residenceOk, salaryMin, search]);

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

  // Computed from the real, unfiltered active-jobs set (initialJobs is
  // always "status=active, no city filter" — see app/page.tsx) rather
  // than hardcoded, per WP-B4: which cities actually have jobs right now.
  const cityIdsWithJobs = useMemo(
    () => new Set(initialJobs.map((j) => j.city)),
    [initialJobs]
  );
  const otherCitiesWithJobs = useMemo(
    () => cities.filter((c) => c.id !== city && cityIdsWithJobs.has(c.id)),
    [cities, city, cityIdsWithJobs]
  );

  const hasActiveFilters =
    city !== ALL ||
    jobType !== ALL ||
    mealsIncluded ||
    residenceOk ||
    salaryMin !== "" ||
    search !== "";

  // Scoped to the "筛选" sidebar box's own fields — city has its own
  // separate pill selector above it with its own "不限" option, so this
  // intentionally leaves city alone (unchanged from before WP-B).
  function resetFilters() {
    setJobType(ALL);
    setMealsIncluded(false);
    setResidenceOk(false);
    setSalaryMin("");
    setSearchInput("");
  }

  // The empty-state "清除筛选条件" button (WP-B4) clears everything,
  // city included — if the selected city itself is why results are
  // empty, resetFilters() alone wouldn't fix that.
  function clearAllFilters() {
    setCity(ALL);
    resetFilters();
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {roleMismatchError && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          {t("home.error.role_mismatch")}
        </div>
      )}

      {/* D2: lightweight dual-entry so a first-time visitor who is
          actually a store owner doesn't have to discover /employer by
          scrolling to /me — "我要找工作" is the current page (no-op,
          shown as the active state), "我要招人" hands off to the
          employer section via its own requireRole guard. */}
      <div className="flex gap-2">
        <span className="flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[var(--color-primary)] px-3 text-sm font-medium text-[var(--color-primary-text)]">
          {t("home.dualEntry.seeker")}
        </span>
        <Link
          href="/employer"
          className="flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-muted)]"
        >
          {t("home.dualEntry.employer")}
        </Link>
      </div>

      <h1 className="text-lg font-semibold">{t("home.title")}</h1>

      <input
        type="search"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder={t("home.search.placeholder")}
        className="min-h-[44px] rounded-full border border-[var(--color-border)] px-4 text-sm"
      />

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

      <div className="lg:grid lg:grid-cols-[256px_1fr] lg:items-start lg:gap-6">
        <aside className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:sticky lg:top-20 lg:self-start">
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
                // <option> can only render plain text (browsers strip any
                // child elements), so no icon here — just the name.
                <option key={jt.id} value={jt.id}>
                  {locale === "es" ? jt.name_es : jt.name_zh}
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

          <JobAlertSubscribeForm
            city={city}
            jobType={jobType}
            mealsIncluded={mealsIncluded}
            residenceOk={residenceOk}
            salaryMin={salaryMin}
          />
        </aside>

        <div className="mt-4 flex flex-col gap-3 lg:mt-0">
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("home.resultsCount", { count: jobs.length })}
          </p>

          {jobs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">{t("home.empty")}</p>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="min-h-[44px] rounded-full border border-[var(--color-border)] px-4 text-sm"
                >
                  {t("home.empty.clearFilters")}
                </button>
              )}

              {otherCitiesWithJobs.length > 0 && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t("home.empty.otherCitiesHint", {
                    cities: otherCitiesWithJobs
                      .map((c) => (locale === "es" ? c.name_es : c.name_zh))
                      .join("、"),
                  })}
                </p>
              )}

              <div className="w-full max-w-sm">
                <JobAlertSubscribeForm
                  city={city}
                  jobType={jobType}
                  mealsIncluded={mealsIncluded}
                  residenceOk={residenceOk}
                  salaryMin={salaryMin}
                  prominent
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
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
      </div>
    </div>
  );
}
