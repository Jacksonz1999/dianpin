"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  submitStoreVerificationAction,
  updateJobStatusAction,
} from "@/app/actions";
import {
  canSubmitStoreForVerification,
  nextJobStatuses,
} from "@/lib/status-machine";
import type { City, Job, JobStatus, Store } from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { StoreCreateModal } from "./StoreCreateModal";

export type JobWithNewCount = { job: Job; newApplicationsCount: number };
export type StoreWithJobs = { store: Store; jobs: JobWithNewCount[] };

function JobRow({ job, newApplicationsCount }: JobWithNewCount) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [changing, setChanging] = useState<JobStatus | null>(null);

  async function handleStatusChange(next: JobStatus) {
    setChanging(next);
    await updateJobStatusAction(job.id, next);
    setChanging(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/employer/job/${job.id}`}
          className="text-sm font-medium underline-offset-2 hover:underline"
        >
          {locale === "es" ? job.title_es : job.title_zh}
        </Link>
        <span className="shrink-0 rounded-full bg-[var(--color-bg)] px-2 py-1 text-xs">
          {t(`jobStatus.${job.status}`)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/employer/job/${job.id}`}
          className="inline-flex min-h-[36px] items-center rounded-full border border-[var(--color-border)] px-3 text-xs"
        >
          {t("employer.dashboard.manageJob")}
        </Link>
        {newApplicationsCount > 0 && (
          <span className="rounded-full bg-[var(--color-accent)] px-2 py-1 text-xs text-white">
            {t("employer.dashboard.newApplicationsBadge", {
              count: newApplicationsCount,
            })}
          </span>
        )}
      </div>

      {nextJobStatuses(job.status).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {nextJobStatuses(job.status).map((next) => (
            <button
              key={next}
              type="button"
              disabled={changing !== null}
              onClick={() => handleStatusChange(next)}
              className="min-h-[32px] rounded-full border border-[var(--color-border)] px-2.5 text-xs text-[var(--color-text-muted)] disabled:opacity-60"
            >
              {changing === next
                ? t("job.form.publishing")
                : t("employer.dashboard.jobStatusChange", {
                    status: t(`jobStatus.${next}`),
                  })}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StoreCard({ store }: { store: Store }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmitVerification() {
    setSubmitting(true);
    await submitStoreVerificationAction(store.id);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-medium">
        {locale === "es" ? store.name_es : store.name_zh}
      </h2>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-[var(--color-bg)] px-2 py-1 text-xs">
          {t(`verificationStatus.${store.verification_status}`)}
        </span>
        {canSubmitStoreForVerification(store.verification_status) && (
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmitVerification}
            className="min-h-[32px] rounded-full border border-[var(--color-border)] px-2.5 text-xs disabled:opacity-60"
          >
            {submitting
              ? t("store.form.submitting")
              : t("employer.dashboard.submitVerification")}
          </button>
        )}
        {store.verification_status === "pending" && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {t("employer.dashboard.verificationSubmitted")}
          </span>
        )}
      </div>
    </div>
  );
}

export function EmployerDashboardView({
  groups,
  cities,
}: {
  groups: StoreWithJobs[];
  cities: City[];
}) {
  const { t } = useLocale();
  const [createStoreOpen, setCreateStoreOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("employer.dashboard.title")}</h1>
        <button
          type="button"
          onClick={() => setCreateStoreOpen(true)}
          className="min-h-[36px] rounded-full bg-[var(--color-primary)] px-3 text-sm text-[var(--color-primary-text)]"
        >
          {t("employer.dashboard.newStoreCta")}
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("employer.dashboard.noStores")}
          </p>
        </div>
      ) : (
        groups.map(({ store, jobs }) => (
          <div key={store.id} className="flex flex-col gap-2">
            <StoreCard store={store} />
            <div className="flex flex-col gap-2">
              {jobs.map(({ job, newApplicationsCount }) => (
                <JobRow
                  key={job.id}
                  job={job}
                  newApplicationsCount={newApplicationsCount}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <Link
        href="/employer/new"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--color-border)] px-4 text-sm"
      >
        {t("employer.dashboard.postJobCta")}
      </Link>

      <StoreCreateModal
        open={createStoreOpen}
        onClose={() => setCreateStoreOpen(false)}
        cities={cities}
      />
    </div>
  );
}
