"use client";

import { startTransition, useMemo, useState, useActionState } from "react";
import type { City, JobType } from "@/lib/types";
import { t, type Locale as LocaleType } from "@/lib/i18n";
import { parsePosterNote } from "@/lib/poster-parse";
import { detectDiscrimination } from "@/lib/compliance";
import { mealsKey } from "@/lib/poster-copy";
import { createPosterPost, type PosterResult } from "@/app/employer/poster/actions";

const initial: PosterResult = { ok: false };

type Period = "hour" | "day" | "month";
type Residence = "none" | "prefer" | "required";

interface Overrides {
  jobTypeId?: string;
  city?: string;
  district?: string;
  salaryPeriod?: Period;
  salaryMin?: string;
  salaryMax?: string;
  mealsIncluded?: boolean;
  liveIn?: boolean;
  residenceRequired?: Residence;
  contactPhone?: string;
  contactWhatsapp?: string;
}

export function PosterForm({
  jobTypes,
  cities,
  locale,
}: {
  jobTypes: JobType[];
  cities: City[];
  locale: LocaleType;
}) {
  const [state, formAction, pending] = useActionState(createPosterPost, initial);

  // Primary input: the free-text "smart note" (owner writes like a paper sign).
  const [note, setNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [nameZh, setNameZh] = useState("");

  // Icon-tap fallback: only fields the owner explicitly edited live here; every
  // other field is DERIVED from the parse on each render (no effect syncing).
  const [overrides, setOverrides] = useState<Overrides>({});
  const setField = <K extends keyof Overrides>(k: K, v: Overrides[K]) =>
    setOverrides((prev) => ({ ...prev, [k]: v }));

  const parsed = useMemo(
    () => parsePosterNote(note, jobTypes, cities),
    [note, jobTypes, cities]
  );
  const compliance = useMemo(
    () => detectDiscrimination(`${note}\n${nameZh}`),
    [note, nameZh]
  );

  const jobTypeId = overrides.jobTypeId ?? parsed.jobTypeId ?? "";
  const cityId = overrides.city ?? parsed.city ?? "";
  const district = overrides.district ?? parsed.district ?? "";
  const salaryPeriod = overrides.salaryPeriod ?? parsed.salaryPeriod ?? "month";
  const salaryMin =
    overrides.salaryMin ?? (parsed.salaryMin ? String(parsed.salaryMin) : "");
  const salaryMax =
    overrides.salaryMax ?? (parsed.salaryMax ? String(parsed.salaryMax) : "");
  const meals = overrides.mealsIncluded ?? Boolean(parsed.mealsIncluded);
  const liveIn = overrides.liveIn ?? Boolean(parsed.liveIn);
  const residence = overrides.residenceRequired ?? parsed.residenceRequired ?? "none";
  const phone = overrides.contactPhone ?? parsed.contactPhone ?? "";
  const whatsapp = overrides.contactWhatsapp ?? parsed.contactWhatsapp ?? "";

  // A "missing fields" error for something that lives in the details panel
  // opens the panel so the owner sees where to fill it in.
  const detailsOpen =
    showDetails ||
    (state.errorKey === "poster.error.missing" &&
      (state.terms ?? []).some((f) => f !== "storeName"));

  const jobTypeRow = jobTypes.find((j) => j.id === jobTypeId);
  const cityRow = cities.find((c) => c.id === cityId);
  const minN = parseInt(salaryMin, 10);
  const maxN = parseInt(salaryMax, 10);
  const salaryPreview = Number.isFinite(minN)
    ? `€${minN}${Number.isFinite(maxN) && maxN !== minN ? `–${maxN}` : ""}/${t(
        locale,
        `poster.unit.${salaryPeriod}`
      )}`
    : null;
  const mealsPreview = t(locale, `poster.meals.${mealsKey(meals, liveIn)}`);

  const errorText = state.errorKey
    ? state.errorKey === "poster.error.missing"
      ? t(locale, state.errorKey, {
          fields: (state.terms ?? []).map((f) => t(locale, `poster.${f}`)).join(" / "),
        })
      : t(locale, state.errorKey, state.errorVars) +
        (state.terms?.length ? ` (${state.terms.join(", ")})` : "")
    : null;

  const inputCls =
    "h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm";

  // Only explicitly edited fields are submitted; the server fills the rest
  // from its own authoritative parse of the note.
  const hidden: Array<[string, string]> = [];
  if (overrides.jobTypeId !== undefined) hidden.push(["jobTypeId", overrides.jobTypeId]);
  if (overrides.city !== undefined) hidden.push(["city", overrides.city]);
  if (overrides.district !== undefined) hidden.push(["district", overrides.district]);
  if (overrides.salaryPeriod !== undefined) hidden.push(["salaryPeriod", overrides.salaryPeriod]);
  if (overrides.salaryMin !== undefined) hidden.push(["salaryMin", overrides.salaryMin]);
  if (overrides.salaryMax !== undefined) hidden.push(["salaryMax", overrides.salaryMax]);
  if (overrides.mealsIncluded !== undefined)
    hidden.push(["mealsIncluded", overrides.mealsIncluded ? "true" : "false"]);
  if (overrides.liveIn !== undefined) hidden.push(["liveIn", overrides.liveIn ? "true" : "false"]);
  if (overrides.residenceRequired !== undefined)
    hidden.push(["residenceRequired", overrides.residenceRequired]);
  if (overrides.contactPhone !== undefined) hidden.push(["contactPhone", overrides.contactPhone]);
  if (overrides.contactWhatsapp !== undefined)
    hidden.push(["contactWhatsapp", overrides.contactWhatsapp]);

  const periodOptions: Array<[Period, string]> = [
    ["month", "poster.salaryMonthly"],
    ["day", "poster.salaryDaily"],
    ["hour", "poster.salaryHourly"],
  ];

  return (
    <form
      // Submit via onSubmit instead of `action=`: React resets a form after an
      // action completes, which visually blanks the controlled <select>s
      // (city / residence) on a validation error even though state is intact.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="flex flex-col gap-5"
    >
      {hidden.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {/* ---- primary: smart note ---- */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm font-medium">
          {t(locale, "poster.noteLabel")}
        </label>
        <textarea
          id="note"
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder={t(locale, "poster.notePlaceholder")}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
        <p className="text-xs text-[var(--color-text-muted)]">
          {t(locale, "poster.noteHint")}
        </p>
      </div>

      {/* ---- store name: required and not parseable, so always visible ---- */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nameZh" className="text-sm font-medium">
          {t(locale, "poster.storeName")} <span className="text-red-500">*</span>
        </label>
        <input
          id="nameZh"
          name="nameZh"
          required
          value={nameZh}
          onChange={(e) => setNameZh(e.target.value)}
          className={inputCls}
          placeholder={t(locale, "poster.storeName")}
        />
      </div>

      {/* ---- compliance guard ---- */}
      {compliance.flagged && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(locale, "poster.complianceBlocked")}
          {compliance.terms.length > 0 ? ` (${compliance.terms.join(", ")})` : ""}
        </p>
      )}

      {/* ---- live preview (system renders the poster) ---- */}
      {jobTypeRow || cityRow || salaryPreview || phone ? (
        <div className="rounded-2xl border-2 border-[var(--color-primary)] bg-white p-4 text-[var(--color-text)]">
          <p className="mb-2 text-xs font-medium tracking-wide text-[var(--color-primary)]">
            PegaLocal · {t(locale, "poster.preview")}
          </p>
          <p className="text-lg font-bold leading-tight">
            {nameZh || t(locale, "poster.storeName")}
          </p>
          {jobTypeRow && (
            <p className="text-base font-semibold">
              {jobTypeRow.icon ? `${jobTypeRow.icon} ` : ""}
              {locale === "zh" ? jobTypeRow.name_zh : jobTypeRow.name_es}
            </p>
          )}
          <div className="mt-2 flex flex-col gap-1 text-sm">
            {salaryPreview && (
              <div className="flex justify-between border-b border-dashed border-[var(--color-border)] pb-1">
                <span className="text-[var(--color-text-muted)]">
                  {t(locale, "poster.salary")}
                </span>
                <span className="font-medium">{salaryPreview}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-dashed border-[var(--color-border)] pb-1">
              <span className="text-[var(--color-text-muted)]">
                {t(locale, "poster.mealsIncluded")}
              </span>
              <span className="font-medium">{mealsPreview}</span>
            </div>
            {cityRow && (
              <div className="flex justify-between border-b border-dashed border-[var(--color-border)] pb-1">
                <span className="text-[var(--color-text-muted)]">
                  {t(locale, "poster.city")}
                </span>
                <span className="font-medium">
                  {locale === "zh" ? cityRow.name_zh : cityRow.name_es}
                  {district ? ` · ${district}` : ""}
                </span>
              </div>
            )}
            {phone && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">
                  {t(locale, "poster.contactPhone")}
                </span>
                <span className="font-medium">{phone}</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ---- fallback: icon-tap details ---- */}
      <button
        type="button"
        onClick={() => setShowDetails(!detailsOpen)}
        aria-expanded={detailsOpen}
        className="min-h-[44px] self-start text-sm font-medium text-[var(--color-primary)]"
      >
        {detailsOpen ? "▴ " : "▾ "}
        {t(locale, "poster.detailsToggle")}
      </button>

      {detailsOpen && (
        <div className="flex flex-col gap-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          {/* job type icon grid */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t(locale, "poster.jobType")} <span className="text-red-500">*</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {jobTypes.map((jt) => (
                <button
                  key={jt.id}
                  type="button"
                  onClick={() => setField("jobTypeId", jt.id)}
                  aria-pressed={jobTypeId === jt.id}
                  className={
                    "flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs " +
                    (jobTypeId === jt.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                      : "border-[var(--color-border)]")
                  }
                >
                  <span className="text-2xl">{jt.icon}</span>
                  <span>{locale === "zh" ? jt.name_zh : jt.name_es}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="city" className="text-sm font-medium">
                {t(locale, "poster.city")} <span className="text-red-500">*</span>
              </label>
              <select
                id="city"
                value={cityId}
                onChange={(e) => setField("city", e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "zh" ? c.name_zh : c.name_es}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="district" className="text-sm font-medium">
                {t(locale, "poster.district")}
              </label>
              <input
                id="district"
                value={district}
                onChange={(e) => setField("district", e.target.value)}
                className={inputCls}
                placeholder={t(locale, "poster.district")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t(locale, "poster.salary")}</span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {periodOptions.map(([value, key]) => (
                <label key={value} className="inline-flex min-h-[44px] items-center gap-1.5">
                  <input
                    type="radio"
                    name="salaryPeriodChoice"
                    value={value}
                    checked={salaryPeriod === value}
                    onChange={() => setField("salaryPeriod", value)}
                  />
                  {t(locale, key)}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={salaryMin}
                onChange={(e) => setField("salaryMin", e.target.value)}
                className={inputCls}
                aria-label={t(locale, "poster.salaryMinPlaceholder")}
                placeholder={t(locale, "poster.salaryMinPlaceholder")}
              />
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={salaryMax}
                onChange={(e) => setField("salaryMax", e.target.value)}
                className={inputCls}
                aria-label={t(locale, "poster.salaryMaxPlaceholder")}
                placeholder={t(locale, "poster.salaryMaxPlaceholder")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t(locale, "poster.mealsIncluded")}</span>
            <div className="flex items-center gap-4 text-sm">
              <label className="inline-flex min-h-[44px] items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={meals}
                  onChange={(e) => setField("mealsIncluded", e.target.checked)}
                />
                {t(locale, "poster.mealsIncluded")}
              </label>
              <label className="inline-flex min-h-[44px] items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={liveIn}
                  onChange={(e) => setField("liveIn", e.target.checked)}
                />
                {t(locale, "poster.liveIn")}
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="residence" className="text-sm font-medium">
              {t(locale, "poster.residence")}
            </label>
            <select
              id="residence"
              value={residence}
              onChange={(e) => setField("residenceRequired", e.target.value as Residence)}
              className={inputCls}
            >
              <option value="none">{t(locale, "poster.residenceNone")}</option>
              <option value="prefer">{t(locale, "poster.residencePrefer")}</option>
              <option value="required">{t(locale, "poster.residenceRequired")}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contactPhone" className="text-sm font-medium">
                {t(locale, "poster.contactPhone")} <span className="text-red-500">*</span>
              </label>
              <input
                id="contactPhone"
                type="tel"
                value={phone}
                onChange={(e) => setField("contactPhone", e.target.value)}
                className={inputCls}
                placeholder="+34 600 000 000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contactWhatsapp" className="text-sm font-medium">
                {t(locale, "poster.whatsapp")}
              </label>
              <input
                id="contactWhatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setField("contactWhatsapp", e.target.value)}
                className={inputCls}
                placeholder="+34 600 000 000"
              />
            </div>
          </div>
        </div>
      )}

      {errorText && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errorText}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || compliance.flagged}
        className="min-h-[48px] rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)] disabled:opacity-60"
      >
        {pending ? t(locale, "poster.publishing") : t(locale, "poster.publish")}
      </button>
    </form>
  );
}
