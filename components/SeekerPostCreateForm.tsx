"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSeekerPostAction } from "@/app/actions";
import type {
  City,
  JobType,
  ResidenceStatus,
  SalaryPeriod,
  SeekerPostFormValues,
} from "@/lib/types";
import { useLocale } from "./LocaleProvider";

const SALARY_PERIODS: SalaryPeriod[] = ["hour", "day", "month"];
const RESIDENCE_STATUSES: ResidenceStatus[] = [
  "有居留",
  "办理中",
  "学生居留",
  "家庭居留",
  "无居留",
];

const EMPTY_VALUES: SeekerPostFormValues = {
  title: "",
  jobType: "",
  city: "",
  district: "",
  experienceYears: null,
  availableFrom: null,
  residenceStatus: null,
  expectedSalaryMin: null,
  expectedSalaryMax: null,
  salaryPeriod: "month",
  languages: [],
  liveInOk: false,
  bio: "",
  contactPhone: "",
  contactWechat: "",
};

export function SeekerPostCreateForm({
  cities,
  jobTypes,
}: {
  cities: City[];
  jobTypes: JobType[];
}) {
  const { locale, t } = useLocale();
  const router = useRouter();

  const [value, setValue] = useState<SeekerPostFormValues>({
    ...EMPTY_VALUES,
    city: cities[0]?.id ?? "",
    jobType: jobTypes[0]?.id ?? "",
  });
  const [languagesInput, setLanguagesInput] = useState("");
  const [submitting, setSubmitting] = useState<"draft" | "active" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function isValid(): boolean {
    return (
      value.title.trim().length > 0 &&
      !!value.jobType &&
      !!value.city &&
      value.bio.trim().length > 0 &&
      (value.contactPhone.trim().length > 0 || value.contactWechat.trim().length > 0)
    );
  }

  async function handleSubmit(status: "draft" | "active") {
    if (!isValid()) {
      setError(t("common.fillRequiredFields"));
      return;
    }
    setError(null);
    setSubmitting(status);
    const languages = languagesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const result = await createSeekerPostAction({
      ...value,
      languages,
      status,
    });
    setSubmitting(null);
    if (result.ok) {
      setSuccess(true);
      router.push("/me/posts");
      router.refresh();
    } else {
      setError(t(`seekerPost.error.${result.error}`));
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{t("seekerPost.form.title")}</h1>

      {success && (
        <p className="rounded-lg bg-[var(--color-bg)] px-3 py-2 text-sm">
          {t("seekerPost.form.success")}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        {t("seekerPost.form.titleLabel")}
        <input
          type="text"
          value={value.title}
          onChange={(e) => setValue({ ...value, title: e.target.value })}
          placeholder={t("seekerPost.form.titlePlaceholder")}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("home.filters.jobType")}
        <select
          value={value.jobType}
          onChange={(e) => setValue({ ...value, jobType: e.target.value })}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        >
          {jobTypes.map((jt) => (
            <option key={jt.id} value={jt.id}>
              {locale === "es" ? jt.name_es : jt.name_zh}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("seekerPost.form.city")}
        <select
          value={value.city}
          onChange={(e) => setValue({ ...value, city: e.target.value })}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        >
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {locale === "es" ? c.name_es : c.name_zh}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("store.form.district")}
        <input
          type="text"
          value={value.district}
          onChange={(e) => setValue({ ...value, district: e.target.value })}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("me.profile.experienceLabel")}
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value.experienceYears ?? ""}
          onChange={(e) =>
            setValue({
              ...value,
              experienceYears: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("me.profile.availableFromLabel")}
        <input
          type="date"
          value={value.availableFrom ?? ""}
          onChange={(e) =>
            setValue({ ...value, availableFrom: e.target.value || null })
          }
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("me.profile.residenceLabel")}
        <select
          value={value.residenceStatus ?? ""}
          onChange={(e) =>
            setValue({
              ...value,
              residenceStatus: (e.target.value || null) as ResidenceStatus | null,
            })
          }
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        >
          <option value="">{t("me.profile.notSet")}</option>
          {RESIDENCE_STATUSES.map((r) => (
            <option key={r} value={r}>
              {t(`residenceStatus.${r}`)}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          {t("job.form.salaryMin")}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={value.expectedSalaryMin ?? ""}
            onChange={(e) =>
              setValue({
                ...value,
                expectedSalaryMin: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("job.form.salaryMax")}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={value.expectedSalaryMax ?? ""}
            onChange={(e) =>
              setValue({
                ...value,
                expectedSalaryMax: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {t("job.form.salaryPeriod")}
        <select
          value={value.salaryPeriod ?? "month"}
          onChange={(e) =>
            setValue({ ...value, salaryPeriod: e.target.value as SalaryPeriod })
          }
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        >
          {SALARY_PERIODS.map((p) => (
            <option key={p} value={p}>
              {t(`job.salaryPeriod.${p}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("seekerPost.form.languagesLabel")}
        <input
          type="text"
          value={languagesInput}
          onChange={(e) => setLanguagesInput(e.target.value)}
          placeholder={t("seekerPost.form.languagesPlaceholder")}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <label className="flex min-h-[44px] items-center justify-between text-sm">
        {t("seekerPost.form.liveInOkLabel")}
        <input
          type="checkbox"
          checked={value.liveInOk}
          onChange={(e) => setValue({ ...value, liveInOk: e.target.checked })}
          className="h-5 w-5"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("seekerPost.form.bio")}
        <textarea
          value={value.bio}
          onChange={(e) => setValue({ ...value, bio: e.target.value })}
          placeholder={t("seekerPost.form.bioPlaceholder")}
          rows={4}
          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("seekerPost.form.contactPhone")}
        <input
          type="text"
          value={value.contactPhone}
          onChange={(e) => setValue({ ...value, contactPhone: e.target.value })}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("seekerPost.form.contactWechat")}
        <input
          type="text"
          value={value.contactWechat}
          onChange={(e) => setValue({ ...value, contactWechat: e.target.value })}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting !== null}
          onClick={() => handleSubmit("draft")}
          className="min-h-[44px] flex-1 rounded-full border border-[var(--color-border)] px-4 text-sm disabled:opacity-60"
        >
          {submitting === "draft" ? t("job.form.publishing") : t("job.form.saveDraft")}
        </button>
        <button
          type="button"
          disabled={submitting !== null}
          onClick={() => handleSubmit("active")}
          className="min-h-[44px] flex-1 rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)] disabled:opacity-60"
        >
          {submitting === "active" ? t("job.form.publishing") : t("job.form.publish")}
        </button>
      </div>
    </div>
  );
}
