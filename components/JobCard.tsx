"use client";

import { Heart } from "lucide-react";
import type { City, Job, JobType, PublicStore } from "@/lib/types";
import { renderJobTypeIcon } from "@/lib/job-type-icons";
import { useSavedJobs } from "@/lib/useSavedJobs";
import { useLocale } from "./LocaleProvider";
import { LocaleLink } from "./LocaleLink";
import { StoreCoverImage } from "./StoreCoverImage";
import { StoreVerificationBadge } from "./StoreVerificationBadge";

// Every job on this platform is Spain-based and priced in euros — always
// show €, in every locale (see the same fix and rationale already applied
// to components/JobDetailView.tsx; this card has its own independent
// copy of the same formatting logic, missed in that earlier pass).
function formatSalary(job: Job, periodLabel: string): string {
  const range =
    job.salary_min === job.salary_max
      ? `${job.salary_min}`
      : `${job.salary_min}-${job.salary_max}`;
  return `${range} €/${periodLabel}`;
}

export function JobCard({
  job,
  store,
  jobType,
  city,
  dimmed = false,
}: {
  job: Job;
  store: PublicStore;
  jobType: JobType;
  city: City;
  /** Rejected-store jobs are de-emphasised, per audit P0-4 phase-1. */
  dimmed?: boolean;
}) {
  const { locale, t } = useLocale();
  const { isSaved, toggleSaved } = useSavedJobs();
  const saved = isSaved(job.id);

  const title = locale === "es" ? job.title_es : job.title_zh;
  const storeName = locale === "es" ? store.name_es : store.name_zh;
  const jobTypeName = locale === "es" ? jobType.name_es : jobType.name_zh;
  const cityName = locale === "es" ? city.name_es : city.name_zh;
  const periodLabel = t(`job.salaryPeriod.${job.salary_period}`);
  // Deterministic on both server and client: an ISO slice, not
  // toLocaleDateString (whose default locale/timezone differs between the
  // Node SSR process and the browser and causes hydration error #418).
  const publishedOn = job.published_at.slice(0, 10);

  // Core differentiator (audit phase-1 UI2): surface the store's real rating
  // on the card. Suppressed for rejected stores (their rating is hidden at the
  // page level) and when there are no reviews yet.
  const showRating =
    !dimmed && store.rating_count > 0;

  return (
    <div
      className={
        "relative flex h-full flex-col gap-2 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 " +
        (dimmed ? "opacity-60" : "")
      }
    >
      <StoreCoverImage
        src={store.cover_image}
        alt={storeName}
        name={storeName}
        category={store.category}
        className="-mx-4 -mt-4 mb-1 h-28 w-[calc(100%+2rem)] object-cover"
      />

      <button
        type="button"
        onClick={() => toggleSaved(job.id)}
        aria-label={t(saved ? "job.unsave" : "job.save")}
        aria-pressed={saved}
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 backdrop-blur-sm"
      >
        <Heart className="h-4 w-4" fill={saved ? "currentColor" : "none"} aria-hidden="true" />
      </button>

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">{title}</h3>
        <span className="shrink-0 text-sm font-semibold text-[var(--color-primary)]">
          {formatSalary(job, periodLabel)}
        </span>
      </div>

      <p className="text-sm text-[var(--color-text-muted)]">
        {storeName} · {cityName} {job.district}
      </p>

      {showRating && (
        <p className="text-xs font-medium text-[var(--color-text-muted)]">
          {t("store.ratingSummary", {
            avg: store.rating_avg.toFixed(1),
            count: store.rating_count,
          })}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <StoreVerificationBadge status={store.verification_status} />
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg)] px-2 py-1">
          {renderJobTypeIcon(jobType.id, "h-3.5 w-3.5 shrink-0")}
          {jobTypeName}
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

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-[var(--color-text-muted)]">
          {t("job.headcount", { count: job.headcount })} ·{" "}
          {t("job.publishedOn", { date: publishedOn })}
        </span>
        <LocaleLink
          href={`/job/${job.id}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--color-primary)] px-4 text-xs font-medium text-[var(--color-primary-text)]"
        >
          {t("job.viewDetail")}
        </LocaleLink>
      </div>
    </div>
  );
}
