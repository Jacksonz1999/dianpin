"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import type { City, JobType } from "@/lib/types";
import { t, type Locale as LocaleType } from "@/lib/i18n";
import { parsePosterNote } from "@/lib/poster-parse";
import { detectDiscrimination } from "@/lib/compliance";
import { createPosterPost, type PosterResult } from "@/app/employer/poster/actions";

const initial: PosterResult = { ok: false };

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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Icon-tap fallback (override) fields — pre-filled from the parse for any the
  // owner hasn't manually edited.
  const [jobTypeId, setJobTypeId] = useState("");
  const [cityId, setCityId] = useState("");
  const [district, setDistrict] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState<"hour" | "month">("month");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [meals, setMeals] = useState(false);
  const [liveIn, setLiveIn] = useState(false);
  const [residence, setResidence] = useState<"none" | "prefer" | "required">(
    "none"
  );
  const [nameZh, setNameZh] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const parsed = useMemo(
    () => parsePosterNote(note, jobTypes, cities),
    [note, jobTypes, cities]
  );
  const compliance = useMemo(() => detectDiscrimination(note), [note]);

  // Auto-fill fallback fields from the parse, except ones the owner touched.
  useEffect(() => {
    setJobTypeId((p) => (touched.jobType ? p : parsed.jobTypeId ?? ""));
    setCityId((p) => (touched.city ? p : parsed.city ?? ""));
    setDistrict((p) => (touched.district ? p : parsed.district ?? ""));
    setSalaryPeriod((p) =>
      touched.salaryPeriod ? p : parsed.salaryPeriod === "hour" ? "hour" : "month"
    );
    setSalaryMin((p) =>
      touched.salaryMin ? p : parsed.salaryMin ? String(parsed.salaryMin) : ""
    );
    setSalaryMax((p) =>
      touched.salaryMax ? p : parsed.salaryMax ? String(parsed.salaryMax) : ""
    );
    setMeals((p) => (touched.meals ? p : Boolean(parsed.mealsIncluded)));
    setLiveIn((p) => (touched.liveIn ? p : Boolean(parsed.liveIn)));
    setResidence((p) =>
      touched.residence ? p : (parsed.residenceRequired ?? "none")
    );
    setPhone((p) => (touched.phone ? p : parsed.contactPhone ?? ""));
    setWhatsapp((p) => (touched.whatsapp ? p : parsed.contactWhatsapp ?? ""));
  }, [parsed, touched]);

  const markTouched = (k: string) =>
    setTouched((prev) => (prev[k] ? prev : { ...prev, [k]: true }));

  const jobTypeRow =
    jobTypes.find((j) => j.id === jobTypeId) ??
    jobTypes.find((j) => j.id === parsed.jobTypeId);
  const cityRow =
    cities.find((c) => c.id === cityId) ??
    cities.find((c) => c.id === parsed.city);
  const minN = parseInt(salaryMin, 10);
  const maxN = parseInt(salaryMax, 10);
  const salaryPreview =
    Number.isFinite(minN)
      ? `€${minN}${Number.isFinite(maxN) && maxN !== minN ? `–${maxN}` : ""}/${
          salaryPeriod === "hour" ? "小时" : "月"
        }`
      : null;
  const mealsPreview = meals
    ? liveIn
      ? "包吃住"
      : "包吃"
    : "不包吃住";

  const inputCls =
    "h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm";

  return (
    <form action={formAction} className="flex flex-col gap-5">
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
              {locale === "es" ? jobTypeRow.name_es : jobTypeRow.name_zh}
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
                  {locale === "es" ? cityRow.name_es : cityRow.name_zh}
                  {district ? ` ${district}` : ""}
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
        onClick={() => setShowDetails((v) => !v)}
        className="self-start text-sm font-medium text-[var(--color-primary)]"
      >
        {showDetails ? "▴ " : "▾ "}
        {t(locale, "poster.detailsToggle")}
      </button>

      {showDetails && (
        <div className="flex flex-col gap-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          {/* job type icon grid */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t(locale, "poster.jobType")}</span>
            <div className="flex flex-wrap gap-2">
              {jobTypes.map((jt) => (
                <button
                  key={jt.id}
                  type="button"
                  onClick={() => {
                    markTouched("jobType");
                    setJobTypeId(jt.id);
                  }}
                  className={
                    "flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs " +
                    (jobTypeId === jt.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                      : "border-[var(--color-border)]")
                  }
                >
                  <span className="text-2xl">{jt.icon}</span>
                  <span>{locale === "es" ? jt.name_es : jt.name_zh}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="city" className="text-sm font-medium">
                {t(locale, "poster.city")}
              </label>
              <select
                id="city"
                name="city"
                value={cityId}
                onChange={(e) => {
                  markTouched("city");
                  setCityId(e.target.value);
                }}
                className={inputCls}
              >
                <option value="">—</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "es" ? c.name_es : c.name_zh}
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
                name="district"
                value={district}
                onChange={(e) => {
                  markTouched("district");
                  setDistrict(e.target.value);
                }}
                className={inputCls}
                placeholder={t(locale, "poster.district")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t(locale, "poster.salary")}</span>
            <div className="flex items-center gap-3 text-sm">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  name="salaryPeriod"
                  value="month"
                  checked={salaryPeriod === "month"}
                  onChange={() => {
                    markTouched("salaryPeriod");
                    setSalaryPeriod("month");
                  }}
                />
                {t(locale, "poster.salaryMonthly")}
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  name="salaryPeriod"
                  value="hour"
                  checked={salaryPeriod === "hour"}
                  onChange={() => {
                    markTouched("salaryPeriod");
                    setSalaryPeriod("hour");
                  }}
                />
                {t(locale, "poster.salaryHourly")}
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="salaryMin"
                type="number"
                min={0}
                inputMode="numeric"
                value={salaryMin}
                onChange={(e) => {
                  markTouched("salaryMin");
                  setSalaryMin(e.target.value);
                }}
                className={inputCls}
                placeholder="最低"
              />
              <input
                name="salaryMax"
                type="number"
                min={0}
                inputMode="numeric"
                value={salaryMax}
                onChange={(e) => {
                  markTouched("salaryMax");
                  setSalaryMax(e.target.value);
                }}
                className={inputCls}
                placeholder="最高"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t(locale, "poster.mealsIncluded")}</span>
            <div className="flex items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  name="mealsIncluded"
                  checked={meals}
                  onChange={(e) => {
                    markTouched("meals");
                    setMeals(e.target.checked);
                  }}
                />
                {t(locale, "poster.mealsIncluded")}
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  name="liveIn"
                  checked={liveIn}
                  onChange={(e) => {
                    markTouched("liveIn");
                    setLiveIn(e.target.checked);
                  }}
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
              name="residenceRequired"
              value={residence}
              onChange={(e) => {
                markTouched("residence");
                setResidence(e.target.value as "none" | "prefer" | "required");
              }}
              className={inputCls}
            >
              <option value="none">{t(locale, "poster.residenceNone")}</option>
              <option value="prefer">{t(locale, "poster.residencePrefer")}</option>
              <option value="required">
                {t(locale, "poster.residenceRequired")}
              </option>
            </select>
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contactPhone" className="text-sm font-medium">
                {t(locale, "poster.contactPhone")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  markTouched("phone");
                  setPhone(e.target.value);
                }}
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
                name="contactWhatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => {
                  markTouched("whatsapp");
                  setWhatsapp(e.target.value);
                }}
                className={inputCls}
                placeholder="+34 600 000 000"
              />
            </div>
          </div>
        </div>
      )}

      {state && !state.ok && state.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
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
