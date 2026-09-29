"use client";

import Link from "next/link";
import type { City, Job, JobType, Store } from "@/lib/types";
import { useLocale } from "./LocaleProvider";

function formatSalary(
  job: Job,
  locale: "zh" | "es",
  periodLabel: string
): string {
  const range =
    job.salary_min === job.salary_max
      ? `${job.salary_min}`
      : `${job.salary_min}-${job.salary_max}`;
  return locale === "es"
    ? `${range} €/${periodLabel}`
    : `${range} 元/${periodLabel}`;
}

export function JobCard({
  job,
  store,
  jobType,
  city,
}: {
  job: Job;
  store: Store;
  jobType: JobType;
  city: City;
}) {
  const { locale, t } = useLocale();

  const title = locale === "es" ? job.title_es : job.title_zh;
  const storeName = locale === "es" ? store.name_es : store.name_zh;
  const jobTypeName = locale === "es" ? jobType.name_es : jobType.name_zh;
  const cityName = locale === "es" ? city.name_es : city.name_zh;
  const periodLabel = t(`job.salaryPeriod.${job.salary_period}`);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">{title}</h3>
        <span className="shrink-0 text-sm font-semibold text-[var(--color-primary)]">
          {formatSalary(job, locale, periodLabel)}
        </span>
      </div>

      <p className="text-sm text-[var(--color-text-muted)]">
        {storeName} · {cityName} {job.district}
      </p>

      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-full bg-[var(--color-bg)] px-2 py-1">
          {jobType.icon} {jobTypeName}
        </span>
        <span className="rounded-full bg-[var(--color-bg)] px-2 py-1">
          {job.meals_included ? t("job.mealsIncluded") : t("job.mealsNotIncluded")}
        </span>
        {job.live_in && (
          <span className="rounded-full bg-[var(--color-bg)] px-2 py-1">
            {t("job.liveIn")}
          </span>
        )}
        <span className="rounded-full bg-[var(--color-bg)] px-2 py-1">
          {t(`residenceRequired.${job.residence_required}`)}
        </span>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-[var(--color-text-muted)]">
          {t("job.headcount", { count: job.headcount })} · {t("job.views", { count: job.views })}
        </span>
        <Link
          href={`/job/${job.id}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--color-primary)] px-4 text-xs font-medium text-[var(--color-primary-text)]"
        >
          {t("job.viewDetail")}
        </Link>
      </div>
    </div>
  );
}
