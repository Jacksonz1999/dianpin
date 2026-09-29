"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { JobType, SeekerProfile, User } from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { ProfileEditModal } from "./ProfileEditModal";

export function MeView({
  user,
  profile,
  jobTypes,
}: {
  user: User | null;
  profile: SeekerProfile | null;
  jobTypes: JobType[];
}) {
  const { locale, t } = useLocale();
  const [editOpen, setEditOpen] = useState(false);

  const jobTypesById = useMemo(
    () => new Map(jobTypes.map((jt) => [jt.id, jt])),
    [jobTypes]
  );

  const initialValues = {
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    jobTypes: profile?.job_types ?? [],
    experienceYears: profile?.experience_years ?? null,
    availableFrom: profile?.available_from?.slice(0, 10) ?? null,
    residenceStatus: profile?.residence_status ?? null,
    expectedSalaryMin: profile?.expected_salary_min ?? null,
    expectedSalaryMax: profile?.expected_salary_max ?? null,
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{t("me.title")}</h1>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-base font-medium">{user?.name ?? t("common.loading")}</p>
        {user && (
          <p className="text-sm text-[var(--color-text-muted)]">{user.phone}</p>
        )}
      </div>

      {profile ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{t("me.profile.jobTypesLabel")}</span>
            <span className="text-right text-[var(--color-text-muted)]">
              {profile.job_types.length > 0
                ? profile.job_types
                    .map((id) => {
                      const jt = jobTypesById.get(id);
                      return jt ? (locale === "es" ? jt.name_es : jt.name_zh) : id;
                    })
                    .join(", ")
                : t("me.profile.notSet")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{t("me.profile.experienceLabel")}</span>
            <span className="text-[var(--color-text-muted)]">
              {profile.experience_years != null
                ? t("me.profile.experienceYears", {
                    count: profile.experience_years,
                  })
                : t("me.profile.notSet")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{t("me.profile.availableFromLabel")}</span>
            <span className="text-[var(--color-text-muted)]">
              {profile.available_from
                ? profile.available_from.slice(0, 10)
                : t("me.profile.notSet")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{t("me.profile.residenceLabel")}</span>
            <span className="text-[var(--color-text-muted)]">
              {profile.residence_status
                ? t(`residenceStatus.${profile.residence_status}`)
                : t("me.profile.notSet")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{t("me.profile.expectedSalaryLabel")}</span>
            <span className="text-[var(--color-text-muted)]">
              {profile.expected_salary_min != null
                ? `${profile.expected_salary_min} ${t("common.perMonth")}`
                : t("me.profile.notSet")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="mt-2 min-h-[44px] rounded-full border border-[var(--color-border)] px-4 text-sm"
          >
            {t("me.profile.editCta")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] p-4 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("me.profile.empty")}
          </p>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="min-h-[44px] rounded-full bg-[var(--color-primary)] px-4 text-sm text-[var(--color-primary-text)]"
          >
            {t("me.profile.completeCta")}
          </button>
        </div>
      )}

      <Link
        href="/employer"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--color-border)] px-4 text-sm"
      >
        {t("me.roleSwitch")}
      </Link>

      <ProfileEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        jobTypes={jobTypes}
        initialValues={initialValues}
      />
    </div>
  );
}
