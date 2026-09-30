"use client";

import type { JobType, ResidenceStatus, SeekerProfileFormValues } from "@/lib/types";
import { renderJobTypeIcon } from "@/lib/job-type-icons";
import { useLocale } from "./LocaleProvider";

const RESIDENCE_STATUSES: ResidenceStatus[] = [
  "有居留",
  "办理中",
  "学生居留",
  "家庭居留",
  "无居留",
];

export const EMPTY_PROFILE_FORM_VALUES: SeekerProfileFormValues = {
  name: "",
  phone: "",
  jobTypes: [],
  experienceYears: null,
  availableFrom: null,
  residenceStatus: null,
  expectedSalaryMin: null,
  expectedSalaryMax: null,
};

export function SeekerProfileForm({
  jobTypes,
  value,
  onChange,
}: {
  jobTypes: JobType[];
  value: SeekerProfileFormValues;
  onChange: (next: SeekerProfileFormValues) => void;
}) {
  const { locale, t } = useLocale();

  function toggleJobType(id: string) {
    const next = value.jobTypes.includes(id)
      ? value.jobTypes.filter((jt) => jt !== id)
      : [...value.jobTypes, id];
    onChange({ ...value, jobTypes: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        {t("profile.name")}
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder={t("profile.namePlaceholder")}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("profile.contact")}
        <input
          type="text"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder={t("profile.contactPlaceholder")}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        {t("profile.jobTypes")}
        <div className="flex flex-wrap gap-1.5">
          {jobTypes.map((jt) => {
            const active = value.jobTypes.includes(jt.id);
            return (
              <button
                key={jt.id}
                type="button"
                onClick={() => toggleJobType(jt.id)}
                className={
                  "inline-flex min-h-[36px] items-center gap-1 rounded-full px-3 text-sm " +
                  (active
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
                    : "bg-[var(--color-bg)] text-[var(--color-text-muted)]")
                }
              >
                {renderJobTypeIcon(jt.id, "h-3.5 w-3.5 shrink-0")}
                {locale === "es" ? jt.name_es : jt.name_zh}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {t("profile.experienceYears")}
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value.experienceYears ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              experienceYears: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("profile.availableFrom")}
        <input
          type="date"
          value={value.availableFrom ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              availableFrom: e.target.value === "" ? null : e.target.value,
            })
          }
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("profile.residenceStatus")}
        <select
          value={value.residenceStatus ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              residenceStatus: e.target.value
                ? (e.target.value as ResidenceStatus)
                : null,
            })
          }
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        >
          <option value="">{t("common.all")}</option>
          {RESIDENCE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`residenceStatus.${status}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("profile.expectedSalary")}
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value.expectedSalaryMin ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              expectedSalaryMin:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>
    </div>
  );
}
