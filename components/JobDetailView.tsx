"use client";

import { Heart } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { renderJobTypeIcon } from "@/lib/job-type-icons";
import { useSavedJobs } from "@/lib/useSavedJobs";
import type {
  ApplicationStatus,
  City,
  Job,
  JobType,
  PublicStore,
  SeekerProfileFormValues,
} from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { LocaleLink } from "./LocaleLink";
import { ApplyModal } from "./ApplyModal";
import { ReportModal } from "./ReportModal";
import { StoreCoverImage } from "./StoreCoverImage";
import { StoreVerificationBadge } from "./StoreVerificationBadge";
import { JobCard } from "./JobCard";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function JobDetailView({
  job,
  store,
  city,
  jobType,
  jobTypes,
  stores,
  otherJobs,
  similarJobs,
  expired,
  isLoggedIn,
  isLoggedInSeeker,
  existingApplicationStatus,
  hasProfile,
  initialProfileValues,
}: {
  job: Job;
  store: PublicStore;
  city: City;
  jobType: JobType;
  jobTypes: JobType[];
  stores: PublicStore[];
  otherJobs: Job[];
  similarJobs: Job[];
  expired: boolean;
  isLoggedIn: boolean;
  isLoggedInSeeker: boolean;
  existingApplicationStatus: ApplicationStatus | null;
  hasProfile: boolean;
  initialProfileValues: SeekerProfileFormValues;
}) {
  const { locale, t, href } = useLocale();
  const [applyOpen, setApplyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { isSaved, toggleSaved } = useSavedJobs();
  const saved = isSaved(job.id);

  const title = locale === "es" ? job.title_es : job.title_zh;
  const description = locale === "es" ? job.description_es : job.description_zh;
  const storeName = locale === "es" ? store.name_es : store.name_zh;
  const cityName = locale === "es" ? city.name_es : city.name_zh;
  const jobTypeName = locale === "es" ? jobType.name_es : jobType.name_zh;
  const periodLabel = t(`job.salaryPeriod.${job.salary_period}`);
  const salaryRange =
    job.salary_min === job.salary_max
      ? `${job.salary_min}`
      : `${job.salary_min}-${job.salary_max}`;
  // Every job on this platform is Spain-based and priced in euros — there
  // is no currency field in the data model because there's only ever one
  // currency. Always show €, in every locale.
  const salaryText = `${salaryRange} €/${periodLabel}`;
  // ISO slice, not toLocaleDateString: deterministic across SSR/browser.
  const publishedDate = job.published_at.slice(0, 10);
  const loginHref = `/login?role=seeker&next=${encodeURIComponent(
    href(`/job/${job.id}`)
  )}`;
  const showRating =
    store.verification_status !== "rejected" && store.rating_count > 0;

  const storesById = useMemo(
    () => new Map(stores.map((s) => [s.id, s])),
    [stores]
  );
  const jobTypesById = useMemo(
    () => new Map(jobTypes.map((jt) => [jt.id, jt])),
    [jobTypes]
  );

  function renderRecommendations(items: Job[]) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("job.similarJobsEmpty")}
        </p>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const itemStore = storesById.get(item.store_id) ?? store;
          const itemType = jobTypesById.get(item.job_type);
          if (!itemType) return null;
          return (
            <JobCard
              key={item.id}
              job={item}
              store={itemStore}
              jobType={itemType}
              city={city}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <LocaleLink href="/" className="text-sm text-[var(--color-text-muted)]">
        ← {t("job.backToList")}
      </LocaleLink>

      {expired && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            {t("job.expired.title")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-700">
            {t("job.expired.body")}
          </p>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8">
        <article className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-semibold">{title}</h1>
              <button
                type="button"
                onClick={() => toggleSaved(job.id)}
                aria-label={t(saved ? "job.unsave" : "job.save")}
                aria-pressed={saved}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)]"
              >
                <Heart
                  className={"h-4 w-4 " + (saved ? "text-[var(--color-primary)]" : "")}
                  fill={saved ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              </button>
            </div>
            <p className="text-lg font-semibold text-[var(--color-primary)]">
              {salaryText}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {t("job.publishedAt", { date: publishedDate })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
            <Field
              label={t("home.filters.jobType")}
              value={
                <span className="inline-flex items-center gap-1">
                  {renderJobTypeIcon(jobType.id, "h-3.5 w-3.5 shrink-0")}
                  {jobTypeName}
                </span>
              }
            />
            <Field label={cityName} value={job.district} />
            <Field label={t("job.scheduleLabel")} value={job.schedule} />
            <Field label={t("job.headcountLabel")} value={t("job.headcount", { count: job.headcount })} />
            <Field
              label={t("job.mealsLabel")}
              value={job.meals_included ? t("job.mealsIncluded") : t("job.mealsNotIncluded")}
            />
            <Field label={t("job.liveIn")} value={job.live_in ? t("common.yes") : t("common.no")} />
            <Field label={t("job.languageLabel")} value={job.language_required} />
            <Field
              label={t("job.residenceLabel")}
              value={t(`residenceRequired.${job.residence_required}`)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">{t("job.description")}</h2>
            <p className="whitespace-pre-line text-sm text-[var(--color-text-muted)]">
              {description}
            </p>
          </div>
        </article>

        <aside className="mt-4 flex flex-col gap-4 lg:sticky lg:top-20 lg:mt-0">
          <LocaleLink
            href={`/store/${store.id}`}
            className="flex flex-col gap-2 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <StoreCoverImage
              src={store.cover_image}
              alt={storeName}
              name={storeName}
              className="h-24 w-full object-cover"
            />
            <div className="flex flex-col gap-2 p-4 pt-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("job.storeSection")}</span>
                <span className="text-xs text-[var(--color-primary)]">
                  {t("job.viewStore")} →
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-base font-semibold">{storeName}</span>
                <StoreVerificationBadge status={store.verification_status} />
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                {showRating && (
                  <>★ {store.rating_avg.toFixed(1)} ({store.rating_count}) · </>
                )}
                {cityName} {store.district}
              </span>
            </div>
          </LocaleLink>

          <div className="flex flex-col gap-2">
            {expired ? (
              <div className="flex min-h-[44px] items-center justify-center rounded-full bg-[var(--color-bg)] px-4 text-sm text-[var(--color-text-muted)]">
                {t("job.expired.applyDisabled")}
              </div>
            ) : existingApplicationStatus ? (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-center text-sm">
                {t("job.yourApplicationStatus")}：
                {t(`applicationStatus.${existingApplicationStatus}`)}
              </div>
            ) : isLoggedInSeeker ? (
              <button
                type="button"
                onClick={() => setApplyOpen(true)}
                className="min-h-[44px] rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)]"
              >
                {t("job.applyButton")}
              </button>
            ) : (
              <LocaleLink
                href={loginHref}
                className="flex min-h-[44px] items-center justify-center rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)]"
              >
                {t("job.applyButton")}
              </LocaleLink>
            )}

            {/* Audit P1-3: reporting is a low-frequency action — a plain
                text link instead of a button that competes with "一键投递". */}
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="min-h-[44px] text-xs text-[var(--color-text-muted)] underline underline-offset-2"
              >
                {t("job.reportButton")}
              </button>
            ) : (
              <LocaleLink
                href={loginHref}
                className="flex min-h-[44px] items-center justify-center text-xs text-[var(--color-text-muted)] underline underline-offset-2"
              >
                {t("job.reportButton")}
              </LocaleLink>
            )}
          </div>
        </aside>
      </div>

      {/* Audit P1-3: turn the two biggest drop-off moments (wrong role,
          wrong location) into a second chance instead of a dead end. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{t("job.otherJobsAtStore")}</h2>
        {renderRecommendations(otherJobs)}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{t("job.similarJobs")}</h2>
        {renderRecommendations(similarJobs)}
      </section>

      <ApplyModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        job={job}
        jobTypes={jobTypes}
        hasProfile={hasProfile}
        initialProfileValues={initialProfileValues}
      />
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="job"
        targetId={job.id}
      />
    </div>
  );
}
