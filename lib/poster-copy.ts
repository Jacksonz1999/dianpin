import { t, type Locale } from "@/lib/i18n";

/**
 * Builds the neutral zh/es/en job copy for a PegaLocal poster. All wording
 * comes from the `poster.copy.*` i18n keys so no language is hardcoded here,
 * and the template never produces exclusionary phrasing (see lib/compliance).
 */

// job_types has no English column; map the seeded name_zh values. Unknown
// types fall back to the Spanish name, which English readers in Spain parse.
const JOB_NAME_EN: Record<string, string> = {
  服务员: "Waiter / Waitress",
  收银员: "Cashier",
  厨师: "Cook",
  店员: "Shop assistant",
  送货员: "Delivery driver",
  清洁工: "Cleaner",
  按摩师: "Massage therapist",
  美甲师: "Nail technician",
  保姆: "Nanny",
  建筑工: "Construction worker",
  仓库员: "Warehouse worker",
  理发师: "Hairdresser",
};

export interface PosterCopyInput {
  storeName: string;
  jobType: { name_zh: string; name_es: string };
  city: { name_zh: string; name_es: string };
  district: string;
  salaryMin: number;
  salaryMax: number;
  salaryPeriod: "hour" | "day" | "month";
  mealsIncluded: boolean;
  liveIn: boolean;
  residenceRequired: "none" | "prefer" | "required";
}

export function mealsKey(meals: boolean, liveIn: boolean): string {
  if (meals && liveIn) return "both";
  if (meals) return "meals";
  if (liveIn) return "live";
  return "none";
}

function salaryText(locale: Locale, input: PosterCopyInput): string {
  const key =
    input.salaryMin === input.salaryMax
      ? `poster.copy.salaryFixed.${input.salaryPeriod}`
      : `poster.copy.salary.${input.salaryPeriod}`;
  return t(locale, key, { min: input.salaryMin, max: input.salaryMax });
}

function buildFor(locale: Locale, input: PosterCopyInput) {
  const job =
    locale === "zh"
      ? input.jobType.name_zh
      : locale === "en"
        ? JOB_NAME_EN[input.jobType.name_zh] ?? input.jobType.name_es
        : input.jobType.name_es;
  const city = locale === "zh" ? input.city.name_zh : input.city.name_es;
  const location = input.district ? `${city} · ${input.district}` : city;
  const title = t(locale, "poster.copy.title", { job });
  const description = t(locale, "poster.copy.description", {
    store: input.storeName,
    job,
    salary: salaryText(locale, input),
    meals: t(locale, `poster.copy.meals.${mealsKey(input.mealsIncluded, input.liveIn)}`),
    residence: t(locale, `poster.copy.residence.${input.residenceRequired}`),
    location,
  });
  return { title, description };
}

export function buildPosterCopy(input: PosterCopyInput) {
  return {
    zh: buildFor("zh", input),
    es: buildFor("es", input),
    en: buildFor("en", input),
  };
}
