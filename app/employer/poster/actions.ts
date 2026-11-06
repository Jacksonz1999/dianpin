"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { requireRole } from "@/lib/auth/session";
import {
  createPosterJob,
  createPosterStore,
  getCities,
  getCityById,
  getJobTypeById,
  getJobTypes,
} from "@/lib/db";
import { detectDiscrimination } from "@/lib/compliance";
import { parsePosterNote } from "@/lib/poster-parse";

export interface PosterResult {
  ok: boolean;
  jobId?: string;
  error?: string;
}

function toInt(v: FormDataEntryValue | null, fallback = 0): number {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true" || v === "1";
}

/**
 * PegaLocal poster publish flow. Design iron law: the owner writes a free-text
 * "smart note" (primary) or taps structured fields (fallback); the SYSTEM does
 * the rest — parse, translate to zh/es/en, render the poster, publish + SEO, QR.
 *
 * Compliance guardrails:
 *  - the form NEVER collects nationality; only residency *requirement*.
 *  - the free-text note + store name are screened against a bilingual
 *    discriminatory-term library; flagged content is rejected before publish.
 *  - generated copy is a neutral, compliant template in zh/es/en — no
 *    "only Chinese" / "no X nationality" wording is ever produced.
 *
 * Signature is `(prevState, formData)` to match useActionState; prevState is
 * ignored (the success path redirects, so no state is returned there).
 */
export async function createPosterPost(
  _prevState: PosterResult,
  formData: FormData
): Promise<PosterResult> {
  // requireRole redirects (throws) for non-employer sessions.
  const session = await requireRole("employer");

  const note = String(formData.get("note") ?? "").trim();
  const nameZh = String(formData.get("nameZh") ?? "").trim();
  const jobTypeId = String(formData.get("jobTypeId") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const salaryPeriod = String(formData.get("salaryPeriod") ?? "month") as
    | "hour"
    | "day"
    | "month";
  const salaryMin = toInt(formData.get("salaryMin"));
  const salaryMax = toInt(formData.get("salaryMax"), salaryMin);
  const mealsIncluded = toBool(formData.get("mealsIncluded"));
  const liveIn = toBool(formData.get("liveIn"));
  const residenceRequired = String(
    formData.get("residenceRequired") ?? "none"
  ) as "none" | "prefer" | "required";
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  const contactWhatsapp = String(formData.get("contactWhatsapp") ?? "").trim();

  // --- compliance red line: screen note + store name before anything ships ---
  const compliance = detectDiscrimination(`${note} ${nameZh}`);
  if (compliance.flagged) {
    return {
      ok: false,
      error: `${compliance.suggestionZh} (${compliance.terms.join(", ")})`,
    };
  }

  // --- smart-note parsing (server-authoritative) ----------------------------
  // Explicit fields from the icon-tap fallback override the parse. The note is
  // primary; whatever the owner didn't set by hand is filled from the parse.
  const [jobTypes, cities] = await Promise.all([getJobTypes(), getCities()]);
  const parsed = parsePosterNote(note, jobTypes, cities);

  const finalJobTypeId = jobTypeId || parsed.jobTypeId || "";
  const finalCity = city || parsed.city || "";
  const finalDistrict = district || parsed.district || "";
  const finalSalaryPeriod: "hour" | "day" | "month" =
    salaryPeriod === "hour" || salaryPeriod === "day"
      ? salaryPeriod
      : parsed.salaryPeriod ?? "month";
  const finalSalaryMin = salaryMin || parsed.salaryMin || 0;
  const finalSalaryMax = salaryMax || parsed.salaryMax || finalSalaryMin;
  const finalMeals = mealsIncluded || Boolean(parsed.mealsIncluded);
  const finalLiveIn = liveIn || Boolean(parsed.liveIn);
  const finalResidence: "none" | "prefer" | "required" =
    residenceRequired !== "none"
      ? residenceRequired
      : parsed.residenceRequired ?? "none";
  const finalPhone = contactPhone || parsed.contactPhone || "";
  const finalWhatsapp = contactWhatsapp || parsed.contactWhatsapp || "";

  if (!nameZh || !finalJobTypeId || !finalCity || !finalPhone) {
    return {
      ok: false,
      error: "信息不足：请写几句招人话，或补充工种 / 城市 / 电话。",
    };
  }

  const jobType = await getJobTypeById(finalJobTypeId);
  const cityRow = await getCityById(finalCity);
  if (!jobType || !cityRow) {
    return { ok: false, error: "工种或城市无效" };
  }

  const store = await createPosterStore({
    ownerUserId: session.userId,
    nameZh,
    city: finalCity,
    district: finalDistrict,
    // The store's category drives the cover-image gradient fallback; use the
    // job type name (descriptive enough) since job_types has no category.
    category: jobType.name_zh,
  });

  const jobTypeNameZh = jobType.name_zh;
  const jobTypeNameEs = jobType.name_es;
  const cityNameZh = cityRow.name_zh;
  const cityNameEs = cityRow.name_es;

  const salaryZh =
    finalSalaryPeriod === "hour"
      ? `€${finalSalaryMin}-${finalSalaryMax}/小时`
      : `€${finalSalaryMin}-${finalSalaryMax}/月`;
  const salaryEs =
    finalSalaryPeriod === "hour"
      ? `de €${finalSalaryMin} a €${finalSalaryMax} por hora`
      : `de €${finalSalaryMin} a €${finalSalaryMax} al mes`;
  const salaryEn =
    finalSalaryPeriod === "hour"
      ? `€${finalSalaryMin}–€${finalSalaryMax} per hour`
      : `€${finalSalaryMin}–€${finalSalaryMax} per month`;

  const mealsZh = finalMeals
    ? finalLiveIn
      ? "包吃住"
      : "包吃"
    : "不包吃住";
  const mealsEs = finalMeals
    ? finalLiveIn
      ? "Comida y alojamiento incluidos"
      : "Comida incluida"
    : "Sin comida ni alojamiento";
  const mealsEn = finalMeals
    ? finalLiveIn
      ? "Meals & lodging included"
      : "Meals included"
    : "No meals or lodging";

  const resZh =
    finalResidence === "required"
      ? "需合法居留"
      : finalResidence === "prefer"
        ? "优先有居留"
        : "不限居留";
  const resEs =
    finalResidence === "required"
      ? "Se requiere residencia legal"
      : finalResidence === "prefer"
        ? "Se valora tener residencia"
        : "No se requiere residencia";
  const resEn =
    finalResidence === "required"
      ? "Legal residency required"
      : finalResidence === "prefer"
        ? "Residency preferred"
        : "No residency required";

  const titleZh = `招聘${jobTypeNameZh}`;
  const titleEs = `Se busca ${jobTypeNameEs}`;
  const titleEn = `We're hiring: ${jobTypeNameEs}`;

  const descriptionZh = `${nameZh} 招聘${jobTypeNameZh}。薪资 ${salaryZh}。${mealsZh}。${resZh}。地点：${cityNameZh}${finalDistrict}。`;
  const descriptionEs = `Se necesita ${jobTypeNameEs} en ${nameZh}. ${salaryEs}. ${mealsEs}. ${resEs}. Ubicación: ${cityNameEs}${finalDistrict}.`;
  const descriptionEn = `We are hiring a ${jobTypeNameEs} at ${nameZh}. ${salaryEn}. ${mealsEn}. ${resEn}. Location: ${cityNameEs}${finalDistrict}.`;

  const posterSlug = randomUUID().replace(/-/g, "").slice(0, 12);

  const jobId = await createPosterJob({
    storeId: store.id,
    jobTypeId: finalJobTypeId,
    city: finalCity,
    district: finalDistrict,
    titleZh,
    titleEs,
    titleEn,
    descriptionZh,
    descriptionEs,
    descriptionEn,
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

  redirect(`/employer/poster/${jobId}`);
}
