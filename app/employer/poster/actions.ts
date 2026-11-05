"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { requireRole } from "@/lib/auth/session";
import {
  createPosterJob,
  createPosterStore,
  getCityById,
  getJobTypeById,
} from "@/lib/db";

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
 * PegaLocal poster publish flow. Compliance guardrails:
 *  - the form NEVER collects nationality; only residency *requirement*.
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

  if (!nameZh || !jobTypeId || !city || !contactPhone) {
    return { ok: false, error: "请填写店名、工种、城市与联系电话" };
  }

  const jobType = await getJobTypeById(jobTypeId);
  const cityRow = await getCityById(city);
  if (!jobType || !cityRow) {
    return { ok: false, error: "工种或城市无效" };
  }

  const store = await createPosterStore({
    ownerUserId: session.userId,
    nameZh,
    city,
    district,
    // The store's category drives the cover-image gradient fallback; use the
    // job type name (descriptive enough) since job_types has no category.
    category: jobType.name_zh,
  });

  const jobTypeNameZh = jobType.name_zh;
  const jobTypeNameEs = jobType.name_es;
  const cityNameZh = cityRow.name_zh;
  const cityNameEs = cityRow.name_es;

  const salaryZh =
    salaryPeriod === "hour"
      ? `€${salaryMin}-${salaryMax}/小时`
      : `€${salaryMin}-${salaryMax}/月`;
  const salaryEs =
    salaryPeriod === "hour"
      ? `de €${salaryMin} a €${salaryMax} por hora`
      : `de €${salaryMin} a €${salaryMax} al mes`;
  const salaryEn =
    salaryPeriod === "hour"
      ? `€${salaryMin}–€${salaryMax} per hour`
      : `€${salaryMin}–€${salaryMax} per month`;

  const mealsZh = mealsIncluded
    ? liveIn
      ? "包吃住"
      : "包吃"
    : "不包吃住";
  const mealsEs = mealsIncluded
    ? liveIn
      ? "Comida y alojamiento incluidos"
      : "Comida incluida"
    : "Sin comida ni alojamiento";
  const mealsEn = mealsIncluded
    ? liveIn
      ? "Meals & lodging included"
      : "Meals included"
    : "No meals or lodging";

  const resZh =
    residenceRequired === "required"
      ? "需合法居留"
      : residenceRequired === "prefer"
        ? "优先有居留"
        : "不限居留";
  const resEs =
    residenceRequired === "required"
      ? "Se requiere residencia legal"
      : residenceRequired === "prefer"
        ? "Se valora tener residencia"
        : "No se requiere residencia";
  const resEn =
    residenceRequired === "required"
      ? "Legal residency required"
      : residenceRequired === "prefer"
        ? "Residency preferred"
        : "No residency required";

  const titleZh = `招聘${jobTypeNameZh}`;
  const titleEs = `Se busca ${jobTypeNameEs}`;
  const titleEn = `We're hiring: ${jobTypeNameEs}`;

  const descriptionZh = `${nameZh} 招聘${jobTypeNameZh}。薪资 ${salaryZh}。${mealsZh}。${resZh}。地点：${cityNameZh}${district}。`;
  const descriptionEs = `Se necesita ${jobTypeNameEs} en ${nameZh}. ${salaryEs}. ${mealsEs}. ${resEs}. Ubicación: ${cityNameEs}${district}.`;
  const descriptionEn = `We are hiring a ${jobTypeNameEs} at ${nameZh}. ${salaryEn}. ${mealsEn}. ${resEn}. Location: ${cityNameEs}${district}.`;

  const posterSlug = randomUUID().replace(/-/g, "").slice(0, 12);

  const jobId = await createPosterJob({
    storeId: store.id,
    jobTypeId,
    city,
    district,
    titleZh,
    titleEs,
    titleEn,
    descriptionZh,
    descriptionEs,
    descriptionEn,
    salaryMin,
    salaryMax,
    salaryPeriod,
    headcount: 1,
    liveIn,
    mealsIncluded,
    languageRequired: "",
    residenceRequired,
    posterSlug,
    contactPhone,
    contactWhatsapp,
  });

  redirect(`/employer/poster/${jobId}`);
}
