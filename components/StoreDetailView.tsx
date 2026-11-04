"use client";

import { useMemo, useState } from "react";
import type {
  City,
  Job,
  JobType,
  PublicStore,
  Review,
} from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { JobCard } from "./JobCard";
import { ReportModal } from "./ReportModal";
import { StoreCoverImage } from "./StoreCoverImage";
import { StoreVerificationBadge } from "./StoreVerificationBadge";

export function StoreDetailView({
  store,
  city,
  jobs,
  jobTypes,
  reviewRows,
  showReviews,
}: {
  store: PublicStore;
  city: City;
  jobs: Job[];
  jobTypes: JobType[];
  reviewRows: { review: Review; reviewerName: string }[];
  showReviews: boolean;
}) {
  const { locale, t } = useLocale();
  const [reportOpen, setReportOpen] = useState(false);

  const jobTypesById = useMemo(
    () => new Map(jobTypes.map((jt) => [jt.id, jt])),
    [jobTypes]
  );

  const name = locale === "es" ? store.name_es : store.name_zh;
  const cityName = locale === "es" ? city.name_es : city.name_zh;
  const showRating = showReviews && store.rating_count > 0;

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div className="flex flex-col gap-2 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <StoreCoverImage
          src={store.cover_image}
          alt={name}
          name={name}
          className="h-40 w-full object-cover"
        />
        <div className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">{name}</h1>
            {/* Audit P0-4: EVERY store gets an explicit state, not just
                verified/pending — otherwise unverified and rejected stores
                look identical to a verified one. */}
            <StoreVerificationBadge status={store.verification_status} />
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">{store.category}</p>
          {showRating && (
            <p className="text-sm">
              ★ {store.rating_avg.toFixed(1)} ({store.rating_count})
            </p>
          )}
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("store.addressLabel")}：{cityName} {store.district}，{store.address}
          </p>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="mt-1 min-h-[44px] self-start text-xs text-[var(--color-text-muted)] underline underline-offset-2"
          >
            {t("store.reportButton")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t("store.reviewsTitle")}</h2>
        {!showReviews ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {t("store.ratingHidden")}
          </p>
        ) : reviewRows.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("store.noReviews")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {reviewRows.map(({ review, reviewerName }) => (
              <div
                key={review.id}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{reviewerName}</span>
                  <span className="text-sm text-amber-500">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t("store.otherJobsTitle")}</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("store.noOtherJobs")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {jobs.map((job) => {
              const jobType = jobTypesById.get(job.job_type);
              if (!jobType) return null;
              return (
                <JobCard
                  key={job.id}
                  job={job}
                  store={store}
                  jobType={jobType}
                  city={city}
                />
              );
            })}
          </div>
        )}
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="store"
        targetId={store.id}
      />
    </div>
  );
}
