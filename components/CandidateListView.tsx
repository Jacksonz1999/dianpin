"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { advanceApplicationStatusAction, updateJobStatusAction } from "@/app/actions";
import { nextEmployerApplicationStatuses, nextJobStatuses } from "@/lib/status-machine";
import type {
  Application,
  ApplicationStatus,
  Job,
  JobStatus,
  JobType,
  SeekerProfile,
  Store,
  User,
} from "@/lib/types";
import { useLocale } from "./LocaleProvider";

export type CandidateRow = {
  application: Application;
  seeker: User | null;
  profile: SeekerProfile | null;
};

const ACTION_LABEL_KEY: Record<ApplicationStatus, string> = {
  submitted: "employer.job.markViewed",
  viewed: "employer.job.markViewed",
  contacted: "employer.job.markContacted",
  hired: "employer.job.markHired",
  rejected: "employer.job.markRejected",
  withdrawn: "employer.job.markRejected",
};

function CandidateCard({
  row,
  jobTypesById,
}: {
  row: CandidateRow;
  jobTypesById: Map<string, JobType>;
}) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [advancing, setAdvancing] = useState<ApplicationStatus | null>(null);
  const { application, seeker, profile } = row;

  async function handleAdvance(next: ApplicationStatus) {
    setAdvancing(next);
    await advanceApplicationStatusAction(application.id, next);
    setAdvancing(null);
    router.refresh();
  }

  const contactVisible = application.contact_revealed;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold">
          {seeker?.name ?? "—"}
        </span>
        <span className="shrink-0 rounded-full bg-[var(--color-bg)] px-2 py-1 text-xs">
          {t(`applicationStatus.${application.status}`)}
        </span>
      </div>

      {application.message && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {application.message}
        </p>
      )}

      {profile ? (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--color-bg)] p-3 text-xs">
          <div>
            <span className="text-[var(--color-text-muted)]">
              {t("me.profile.jobTypesLabel")}
            </span>
            <p className="font-medium">
              {profile.job_types.length > 0
                ? profile.job_types
                    .map((id) => {
                      const jt = jobTypesById.get(id);
                      return jt
                        ? locale === "es"
                          ? jt.name_es
                          : jt.name_zh
                        : id;
                    })
                    .join(", ")
                : t("me.profile.notSet")}
            </p>
          </div>
          <div>
            <span className="text-[var(--color-text-muted)]">
              {t("me.profile.experienceLabel")}
            </span>
            <p className="font-medium">
              {profile.experience_years != null
                ? t("me.profile.experienceYears", {
                    count: profile.experience_years,
                  })
                : t("me.profile.notSet")}
            </p>
          </div>
          <div>
            <span className="text-[var(--color-text-muted)]">
              {t("me.profile.residenceLabel")}
            </span>
            <p className="font-medium">
              {profile.residence_status
                ? t(`residenceStatus.${profile.residence_status}`)
                : t("me.profile.notSet")}
            </p>
          </div>
          <div>
            <span className="text-[var(--color-text-muted)]">
              {t("me.profile.expectedSalaryLabel")}
            </span>
            <p className="font-medium">
              {profile.expected_salary_min != null
                ? `${profile.expected_salary_min} ${t("common.perMonth")}`
                : t("me.profile.notSet")}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">
          {t("employer.job.noProfile")}
        </p>
      )}

      <div className="rounded-lg bg-[var(--color-bg)] px-3 py-2 text-xs">
        <span className="text-[var(--color-text-muted)]">
          {t("employer.job.contact")}：
        </span>
        {contactVisible ? (
          <span className="font-medium">{seeker?.phone ?? "—"}</span>
        ) : (
          <span className="text-[var(--color-text-muted)]">
            {t("employer.job.contactHidden")}
          </span>
        )}
      </div>

      {nextEmployerApplicationStatuses(application.status).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {nextEmployerApplicationStatuses(application.status).map((next) => (
            <button
              key={next}
              type="button"
              disabled={advancing !== null}
              onClick={() => handleAdvance(next)}
              className="min-h-[36px] rounded-full border border-[var(--color-border)] px-3 text-xs disabled:opacity-60"
            >
              {advancing === next
                ? t("job.form.publishing")
                : t(ACTION_LABEL_KEY[next])}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CandidateListView({
  job,
  store,
  rows,
  jobTypes,
}: {
  job: Job;
  store: Store;
  rows: CandidateRow[];
  jobTypes: JobType[];
}) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [changingStatus, setChangingStatus] = useState<JobStatus | null>(null);

  const jobTypesById = useMemo(
    () => new Map(jobTypes.map((jt) => [jt.id, jt])),
    [jobTypes]
  );

  async function handleJobStatusChange(next: JobStatus) {
    setChangingStatus(next);
    await updateJobStatusAction(job.id, next);
    setChangingStatus(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <Link href="/employer" className="text-sm text-[var(--color-text-muted)]">
        ← {t("employer.job.backToDashboard")}
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">
          {locale === "es" ? job.title_es : job.title_zh}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {locale === "es" ? store.name_es : store.name_zh}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div>
          <span className="text-xs text-[var(--color-text-muted)]">
            {t("employer.job.jobStatusLabel")}
          </span>
          <p className="text-sm font-medium">{t(`jobStatus.${job.status}`)}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {nextJobStatuses(job.status).map((next) => (
            <button
              key={next}
              type="button"
              disabled={changingStatus !== null}
              onClick={() => handleJobStatusChange(next)}
              className="min-h-[32px] rounded-full border border-[var(--color-border)] px-2.5 text-xs disabled:opacity-60"
            >
              {changingStatus === next
                ? t("job.form.publishing")
                : t("employer.dashboard.jobStatusChange", {
                    status: t(`jobStatus.${next}`),
                  })}
            </button>
          ))}
        </div>
      </div>

      <h2 className="text-sm font-medium">{t("employer.job.candidatesTitle")}</h2>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
          {t("employer.job.noApplications")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <CandidateCard
              key={row.application.id}
              row={row}
              jobTypesById={jobTypesById}
            />
          ))}
        </div>
      )}
    </div>
  );
}
