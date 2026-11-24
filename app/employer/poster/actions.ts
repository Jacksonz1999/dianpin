"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { requireRole } from "@/lib/auth/session";
import {
  countRecentPosterJobsByOwner,
  createPosterJob,
  findOrCreatePosterStore,
  getCities,
  getJobTypes,
} from "@/lib/db";
import { detectDiscrimination } from "@/lib/compliance";
import { parsePosterNote } from "@/lib/poster-parse";
import { buildPosterCopy } from "@/lib/poster-copy";
import { getRequestLocale } from "@/lib/locale-server";
import { localePath } from "@/lib/locale-routing";

export interface PosterResult {
  ok: boolean;
  jobId?: string;
  /** i18n key (poster.error.*) — the form translates it in the owner's locale. */
  errorKey?: string;
  /** Interpolation vars for errorKey. */
  errorVars?: Record<string, string | number>;
  /** Flagged terms for the compliance error. */
  terms?: string[];
}

/** Max poster publishes per owner per 24h (AGENTS.md §4 frequency control). */
const POSTER_DAILY_LIMIT = 10;
const SALARY_CAP = 99999;
const RESIDENCE_VALUES = ["none", "prefer", "required"] as const;
const PERIOD_VALUES = ["hour", "day", "month"] as const;

type Residence = (typeof RESIDENCE_VALUES)[number];
type Period = (typeof PERIOD_VALUES)[number];

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Empty -> undefined (not set); non-numeric/negative -> NaN (invalid). */
function toOptionalInt(v: string): number | undefined {
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

function toBool(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true" || v === "1";
}

function oneOf<T extends string>(values: readonly T[], v: string): T | undefined {
  return (values as readonly string[]).includes(v) ? (v as T) : undefined;
}

/**
 * PegaLocal poster publish flow. Design iron law: the owner writes a free-text
 * "smart note" (primary) or taps structured fields (fallback); the SYSTEM does
 * the rest — parse, translate to zh/es/en, render the poster, publish + SEO, QR.
 *
 * Compliance guardrails:
 *  - the form NEVER collects nationality; only residency *requirement*.
 *  - the free-text note + store name are screened for exclusionary phrasing
 *    (lib/compliance); flagged content is rejected before publish.
 *  - generated copy is a neutral template in zh/es/en (lib/poster-copy).
 *
 * Explicit form fields only override the parse when the owner actually set
 * them: the form omits untouched fields, so an empty value means "use the
 * note". Errors are returned as i18n keys so a Spanish-speaking owner never
 * sees a Chinese error.
 *
 * Signature is `(prevState, formData)` to match useActionState.
 */
export async function createPosterPost(
  _prevState: PosterResult,
  formData: FormData
): Promise<PosterResult> {
  // requireRole redirects (throws) for non-employer sessions.
  const session = await requireRole("employer");

  const note = str(formData, "note");
  const nameZh = str(formData, "nameZh");

  // --- compliance red line: screen note + store name before anything ships ---
  const compliance = detectDiscrimination(`${note}\n${nameZh}`);
  if (compliance.flagged) {
    return { ok: false, errorKey: "poster.complianceBlocked", terms: compliance.terms };
  }

  // --- validate explicit overrides -----------------------------------------
  const rawPeriod = str(formData, "salaryPeriod");
  const rawResidence = str(formData, "residenceRequired");
  const periodOverride = rawPeriod ? oneOf(PERIOD_VALUES, rawPeriod) : undefined;
  const residenceOverride = rawResidence
    ? oneOf(RESIDENCE_VALUES, rawResidence)
    : undefined;
  if ((rawPeriod && !periodOverride) || (rawResidence && !residenceOverride)) {
    return { ok: false, errorKey: "poster.error.invalidField" };
  }
  const minOverride = toOptionalInt(str(formData, "salaryMin"));
  const maxOverride = toOptionalInt(str(formData, "salaryMax"));
  if (
    Number.isNaN(minOverride) ||
    Number.isNaN(maxOverride) ||
    (minOverride ?? 0) > SALARY_CAP ||
    (maxOverride ?? 0) > SALARY_CAP
  ) {
    return { ok: false, errorKey: "poster.error.invalidSalary", errorVars: { max: SALARY_CAP } };
  }

  // --- smart-note parsing (server-authoritative) ----------------------------
  const [jobTypes, cities] = await Promise.all([getJobTypes(), getCities()]);
  const parsed = parsePosterNote(note, jobTypes, cities);

  const finalJobTypeId = str(formData, "jobTypeId") || parsed.jobTypeId || "";
  const finalCity = str(formData, "city") || parsed.city || "";
  const finalDistrict = str(formData, "district") || parsed.district || "";
  const finalSalaryPeriod: Period = periodOverride ?? parsed.salaryPeriod ?? "month";
  const a = minOverride ?? parsed.salaryMin ?? 0;
  const b = maxOverride ?? parsed.salaryMax ?? a;
  const finalSalaryMin = Math.min(a, b);
  const finalSalaryMax = Math.max(a, b);
  const finalMeals = formData.has("mealsIncluded")
    ? toBool(formData.get("mealsIncluded"))
    : Boolean(parsed.mealsIncluded);
  const finalLiveIn = formData.has("liveIn")
    ? toBool(formData.get("liveIn"))
    : Boolean(parsed.liveIn);
  const finalResidence: Residence =
    residenceOverride ?? parsed.residenceRequired ?? "none";
  const finalPhone = str(formData, "contactPhone") || parsed.contactPhone || "";
  const finalWhatsapp = str(formData, "contactWhatsapp") || parsed.contactWhatsapp || "";

  const missing: string[] = [];
  if (!nameZh) missing.push("storeName");
  if (!finalJobTypeId) missing.push("jobType");
  if (!finalCity) missing.push("city");
  if (!finalPhone) missing.push("contactPhone");
  if (missing.length > 0) {
    return { ok: false, errorKey: "poster.error.missing", terms: missing };
  }
  if (!/^\+?[\d\s-]{7,20}$/.test(finalPhone)) {
    return { ok: false, errorKey: "poster.error.invalidPhone" };
  }

  const jobType = jobTypes.find((j) => j.id === finalJobTypeId);
  const cityRow = cities.find((c) => c.id === finalCity);
  if (!jobType || !cityRow) {
    return { ok: false, errorKey: "poster.error.invalidField" };
  }

  // --- rate limit -------------------------------------------------------------
  const recent = await countRecentPosterJobsByOwner(
    session.userId,
    new Date(Date.now() - 24 * 3600 * 1000)
  );
  if (recent >= POSTER_DAILY_LIMIT) {
    return {
      ok: false,
      errorKey: "poster.error.rateLimited",
      errorVars: { max: POSTER_DAILY_LIMIT },
    };
  }

  const store = await findOrCreatePosterStore({
    ownerUserId: session.userId,
    nameZh,
    city: finalCity,
    district: finalDistrict,
    // The store's category drives the cover-image gradient fallback; use the
    // job type name (descriptive enough) since job_types has no category.
    category: jobType.name_zh,
  });

  const copy = buildPosterCopy({
    storeName: nameZh,
    jobType,
    city: cityRow,
    district: finalDistrict,
    salaryMin: finalSalaryMin,
    salaryMax: finalSalaryMax,
    salaryPeriod: finalSalaryPeriod,
    mealsIncluded: finalMeals,
    liveIn: finalLiveIn,
    residenceRequired: finalResidence,
  });

  const posterSlug = randomUUID().replace(/-/g, "").slice(0, 12);

  const jobId = await createPosterJob({
    storeId: store.id,
    jobTypeId: finalJobTypeId,
    city: finalCity,
    district: finalDistrict,
    titleZh: copy.zh.title,
    titleEs: copy.es.title,
    titleEn: copy.en.title,
    descriptionZh: copy.zh.description,
    descriptionEs: copy.es.description,
    descriptionEn: copy.en.description,
    salaryMin: finalSalaryMin,
    salaryMax: finalSalaryMax,
    salaryPeriod: finalSalaryPeriod,
    headcount: 1,
    liveIn: finalLiveIn,
    mealsIncluded: finalMeals,
    languageRequired: "",
    residenceRequired: finalResidence,
    posterSlug,
    contactPhone: finalPhone,
    contactWhatsapp: finalWhatsapp,
  });

  // Keep the owner in their language (/es/... for Spanish-speaking owners).
  redirect(localePath(`/employer/poster/${jobId}`, await getRequestLocale()));
}
