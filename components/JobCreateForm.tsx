"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createJobAction } from "@/app/actions";
import type {
  JobFormValues,
  JobType,
  ResidenceRequired,
  SalaryPeriod,
  Store,
} from "@/lib/types";
import { useLocale } from "./LocaleProvider";

const SALARY_PERIODS: SalaryPeriod[] = ["hour", "day", "month"];
const RESIDENCE_REQUIRED: ResidenceRequired[] = ["none", "prefer", "required"];

const EMPTY_VALUES: JobFormValues = {
  titleZh: "",
  titleEs: "",
  jobType: "",
  district: "",
  salaryMin: 0,
  salaryMax: 0,
  salaryPeriod: "month",
  headcount: 1,
  schedule: "",
  liveIn: false,
  mealsIncluded: false,
  languageRequired: "",
  residenceRequired: "none",
  descriptionZh: "",
  descriptionEs: "",
};

export function JobCreateForm({
  stores,
  jobTypes,
}: {
  stores: Store[];
  jobTypes: JobType[];
}) {
  const { locale, t } = useLocale();
  const router = useRouter();

  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [value, setValue] = useState<JobFormValues>({
    ...EMPTY_VALUES,
    district: stores[0]?.district ?? "",
    jobType: jobTypes[0]?.id ?? "",
  });
  const [submitting, setSubmitting] = useState<"draft" | "active" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (stores.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("job.form.noStores")}
        </p>
        <Link
          href="/employer"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--color-primary)] px-4 text-sm text-[var(--color-primary-text)]"
        >
          {t("employer.job.backToDashboard")}
        </Link>
      </div>
    );
  }

  function handleStoreChange(id: string) {
    setStoreId(id);
    const store = stores.find((s) => s.id === id);
    if (store) {
      setValue((v) => ({ ...v, district: store.district }));
    }
  }

  function isValid(): boolean {
    return (
      !!storeId &&
      value.titleZh.trim().length > 0 &&
      value.titleEs.trim().length > 0 &&
      !!value.jobType &&
      value.district.trim().length > 0 &&
      value.salaryMin > 0 &&
      value.salaryMax >= value.salaryMin &&
      value.headcount > 0 &&
      value.schedule.trim().length > 0 &&
      value.languageRequired.trim().length > 0 &&
      value.descriptionZh.trim().length > 0 &&
      value.descriptionEs.trim().length > 0
    );
  }

  async function handleSubmit(status: "draft" | "active") {
    if (!isValid()) {
      setError(t("common.fillRequiredFields"));
      return;
    }
    setError(null);
    setSubmitting(status);
    const result = await createJobAction({ ...value, storeId, status });
    setSubmitting(null);
    if (result.ok) {
      setSuccess(true);
      setValue({
        ...EMPTY_VALUES,
        district: stores.find((s) => s.id === storeId)?.district ?? "",
        jobType: jobTypes[0]?.id ?? "",
      });
      router.refresh();
    } else {
      setError(t(`job.error.${result.error}`));
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{t("job.form.title")}</h1>

      {success && (
        <p className="rounded-lg bg-[var(--color-bg)] px-3 py-2 text-sm">
          {t("job.form.success")}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        {t("job.form.selectStore")}
        <select
          value={storeId}
          onChange={(e) => handleStoreChange(e.target.value)}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {locale === "es" ? s.name_es : s.name_zh}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("job.form.titleZh")}
        <input
          type="text"
          value={value.titleZh}
          onChange={(e) => setValue({ ...value, titleZh: e.target.value })}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("job.form.titleEs")}
        <input
          type="text"
          value={value.titleEs}
          onChange={(e) => setValue({ ...value, titleEs: e.target.value })}
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
            // <option> can only render plain text — see JobsExplorer.tsx.
            <option key={jt.id} value={jt.id}>
              {locale === "es" ? jt.name_es : jt.name_zh}
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

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          {t("job.form.salaryMin")}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={value.salaryMin || ""}
            onChange={(e) =>
              setValue({ ...value, salaryMin: Number(e.target.value) })
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
            value={value.salaryMax || ""}
            onChange={(e) =>
              setValue({ ...value, salaryMax: Number(e.target.value) })
            }
            className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {t("job.form.salaryPeriod")}
        <select
          value={value.salaryPeriod}
          onChange={(e) =>
            setValue({
              ...value,
              salaryPeriod: e.target.value as SalaryPeriod,
            })
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
        {t("job.form.headcount")}
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={value.headcount || ""}
          onChange={(e) =>
            setValue({ ...value, headcount: Number(e.target.value) })
          }
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("job.form.schedule")}
        <input
          type="text"
          value={value.schedule}
          onChange={(e) => setValue({ ...value, schedule: e.target.value })}
          placeholder={t("job.form.schedulePlaceholder")}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <label className="flex min-h-[44px] items-center justify-between text-sm">
        {t("home.filters.mealsIncluded")}
        <input
          type="checkbox"
          checked={value.mealsIncluded}
          onChange={(e) =>
            setValue({ ...value, mealsIncluded: e.target.checked })
          }
          className="h-5 w-5"
        />
      </label>

      <label className="flex min-h-[44px] items-center justify-between text-sm">
        {t("job.liveIn")}
        <input
          type="checkbox"
          checked={value.liveIn}
          onChange={(e) => setValue({ ...value, liveIn: e.target.checked })}
          className="h-5 w-5"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("job.languageLabel")}
        <input
          type="text"
          value={value.languageRequired}
          onChange={(e) =>
            setValue({ ...value, languageRequired: e.target.value })
          }
          placeholder={t("job.form.languageRequiredPlaceholder")}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("job.residenceLabel")}
        <select
          value={value.residenceRequired}
          onChange={(e) =>
            setValue({
              ...value,
              residenceRequired: e.target.value as ResidenceRequired,
            })
          }
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        >
          {RESIDENCE_REQUIRED.map((r) => (
            <option key={r} value={r}>
              {t(`residenceRequired.${r}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("job.form.descriptionZh")}
        <textarea
          value={value.descriptionZh}
          onChange={(e) =>
            setValue({ ...value, descriptionZh: e.target.value })
          }
          rows={3}
          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("job.form.descriptionEs")}
        <textarea
          value={value.descriptionEs}
          onChange={(e) =>
            setValue({ ...value, descriptionEs: e.target.value })
          }
          rows={3}
          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
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
