/**
 * PegaLocal "smart note" parser. Pure, environment-agnostic so it runs both on
 * the client (live preview) and on the server (authoritative publish). It turns
 * a free-text note — written by the owner in Chinese OR Spanish, the way they'd
 * scribble on a paper sign — into the structured fields the poster job needs.
 *
 * This is heuristic, not ML: regex + keyword matching against the live
 * job_types / cities reference tables. Anything it can't confidently extract is
 * simply left undefined and the owner fills it via the icon-tap fallback, which
 * is exactly the designed degradation path (prompt 1.2).
 */

export interface PosterJobTypeRef {
  id: string;
  name_zh: string;
  name_es: string;
}

export interface PosterCityRef {
  id: string;
  name_zh: string;
  name_es: string;
}

export interface ParsedPoster {
  jobTypeId?: string;
  city?: string;
  district?: string;
  salaryPeriod?: "hour" | "day" | "month";
  salaryMin?: number;
  salaryMax?: number;
  mealsIncluded?: boolean;
  liveIn?: boolean;
  residenceRequired?: "none" | "prefer" | "required";
  contactPhone?: string;
  contactWhatsapp?: string;
}

// Canonical job-type name_zh -> extra ways an owner might say it (zh + es).
// Keys must match the actual name_zh values seeded in job_types.
const JOB_SYNONYMS: Record<string, string[]> = {
  服务员: ["服务生", "camarero", "camarera", "mesero", "mesa", "waitress", "waiter"],
  收银员: ["收银", "cajero", "cajera", "cashier"],
  厨师: ["帮厨", "cocinero", "cocinera", "cook", "cocina", "kitchen"],
  店员: ["售货员", "dependiente", "dependienta", "vendedor", "vendedora", "sales"],
  送货员: ["送货", "配送", "repartidor", "repartidora", "delivery", "driver"],
  清洁工: ["清洁", "保洁", "limpieza", "cleaner"],
  按摩师: ["按摩", "masajista", "massage"],
  美甲师: ["美甲", "uñas", "manicurist", "manicura"],
  保姆: ["育儿", "canguro", "nanny", "cuidador", "cuidadora", "babysitter"],
  建筑工: ["建筑", "泥水", "albañil", "albañil", "construction", "obra"],
  仓库员: ["仓库", "almacén", "almacen", "warehouse"],
  理发师: ["理发", "peluquero", "peluquera", "barber", "hairdresser"],
};

const HOURLY_KW = /(小时|时薪|\/h|por\s*hora|per\s*hour|\bhora\b|\bhour\b)/i;
const MONTHLY_KW =
  /(月薪|\/月|al\s*mes|per\s*month|\bmes\b|\bmonth\b|每月)/i;

function normalizePhone(raw: string): string {
  let digits = raw.replace(/[\s-]/g, "").replace(/^00/, "+");
  if (digits.startsWith("+")) return digits;
  // Spanish national number (9 digits, starts with 6/7/8/9) → +34.
  if (/^[6789]\d{8}$/.test(digits)) return `+34${digits}`;
  // Anything else (already 9 digits, or a local number) → assume Spain.
  if (/^\d{7,}$/.test(digits)) return `+34${digits}`;
  return digits;
}

export function parsePosterNote(
  note: string,
  jobTypes: PosterJobTypeRef[],
  cities: PosterCityRef[]
): ParsedPoster {
  const text = (note || "").trim();
  if (!text) return {};
  const lower = text.toLowerCase();
  const result: ParsedPoster = { mealsIncluded: false, liveIn: false };

  // --- job type -----------------------------------------------------------
  for (const jt of jobTypes) {
    const terms = [
      jt.name_zh,
      jt.name_es,
      ...(JOB_SYNONYMS[jt.name_zh] ?? []),
    ].filter(Boolean);
    if (terms.some((term) => term && lower.includes(term.toLowerCase()))) {
      result.jobTypeId = jt.id;
      break;
    }
  }

  // --- phone (pull out first long digit run before salary parsing) ---------
  const phoneMatch = text.match(/(?:\+?\d[\d\s-]{6,}\d)/);
  let working = text;
  if (phoneMatch) {
    const phone = normalizePhone(phoneMatch[0]);
    result.contactPhone = phone;
    if (/(whatsapp|wa\b|wasap|微信|wechat)/i.test(text)) {
      result.contactWhatsapp = phone;
    }
    working = text.replace(phoneMatch[0], " ");
  }

  // --- salary (detect the unit in a short window after the number; this
  //     tolerates filler like "11–13欧一小时" where 一 sits between 欧 and 小时) -
  const salaryMatch = working.match(/(\d{2,4})\s*(?:[-–到至]\s*(\d{2,4}))?/);
  if (salaryMatch) {
    const min = parseInt(salaryMatch[1], 10);
    const max = salaryMatch[2] ? parseInt(salaryMatch[2], 10) : min;
    if (Number.isFinite(min)) {
      const after =
        salaryMatch.index !== undefined
          ? working.slice(
              salaryMatch.index + salaryMatch[0].length,
              salaryMatch.index + salaryMatch[0].length + 14
            )
          : "";
      result.salaryMin = min;
      result.salaryMax = Number.isFinite(max) ? max : min;
      result.salaryPeriod = HOURLY_KW.test(after)
        ? "hour"
        : MONTHLY_KW.test(after)
          ? "month"
          : "month";
    }
  }

  // --- meals / lodging ----------------------------------------------------
  // Negative lookbehind so "不管住" / "不包吃" do NOT trigger a positive match.
  // "包吃住" / "吃住" / "食宿" are compact forms that imply BOTH meals and lodging.
  if (/(?<!不|没|无)(包吃|管吃|包吃住|包食宿|吃住|食宿|comida\s*inclu|almuerzo\s*inclu|inclu(ye)?\s*comida)/i.test(text)) {
    result.mealsIncluded = true;
  }
  if (/(?<!不|没|无)(包住|管住|包吃住|包食宿|吃住|食宿|alojamiento\s*inclu|inclu(ye)?\s*alojamiento)/i.test(text)) {
    result.liveIn = true;
  }

  // --- residency requirement ---------------------------------------------
  if (/(需居留|合法居留|有居留|se\s*requiere\s*residencia|con\s*residencia|residencia\s*legal)/i.test(text)) {
    result.residenceRequired = "required";
  } else if (/(优先居留|valora\s*(la\s*)?residencia|prefiere\s*residencia)/i.test(text)) {
    result.residenceRequired = "prefer";
  } else {
    result.residenceRequired = "none";
  }

  // --- city ---------------------------------------------------------------
  for (const c of cities) {
    if (
      text.includes(c.name_zh) ||
      (c.name_es && lower.includes(c.name_es.toLowerCase()))
    ) {
      result.city = c.id;
      break;
    }
  }

  // --- district (light: a word immediately before 区) ---------------------
  const districtMatch = text.match(/([A-Za-zÀ-ÿ0-9]{2,})\s*区/);
  if (districtMatch) result.district = districtMatch[1];

  return result;
}
