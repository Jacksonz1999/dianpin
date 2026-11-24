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
 *
 * Regression cases live in scripts/test-poster-parse.ts (runs in CI).
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
  建筑工: ["建筑", "泥水", "albañil", "construction", "obra"],
  仓库员: ["仓库", "almacén", "almacen", "warehouse"],
  理发师: ["理发", "peluquero", "peluquera", "barber", "hairdresser"],
};

// Pay-period keywords. Checked first in a short window AFTER the number
// ("11–13欧一小时", "60€/día") — the EARLIEST keyword wins, so
// "1300 每月 工作6天" stays monthly — then, only for explicit pay prefixes, in a
// short window BEFORE it ("日薪 60").
const PERIOD_KW: Array<["hour" | "day" | "month", RegExp]> = [
  ["hour", /(小时|时薪|钟点|\/\s*h\b|por\s*hora|la\s*hora|per\s*hour|\bhora\b|\bhour\b|€\s*h\b)/i],
  ["day", /(日薪|每天|一天|天|\/\s*d[ií]a|por\s*d[ií]a|al\s*d[ií]a|diari[oa]s?|\bd[ií]a\b|per\s*day|\bday\b)/i],
  ["month", /(月薪|每月|一个月|月|al\s*mes|por\s*mes|per\s*month|\bmes\b|\bmonth\b|mensual)/i],
];
const PERIOD_PREFIX: Array<["hour" | "day" | "month", RegExp]> = [
  ["hour", /(时薪|每小时|por\s*hora)\s*[:：]?\s*$/i],
  ["day", /(日薪|每天|por\s*d[ií]a)\s*[:：]?\s*$/i],
  ["month", /(月薪|每月|al\s*mes|sueldo|salario)\s*[:：]?\s*$/i],
];

function detectPeriodAfter(window: string): "hour" | "day" | "month" | undefined {
  let best: { period: "hour" | "day" | "month"; index: number } | undefined;
  for (const [period, re] of PERIOD_KW) {
    const m = window.match(re);
    if (m && m.index !== undefined && (!best || m.index < best.index)) {
      best = { period, index: m.index };
    }
  }
  return best?.period;
}

function detectPeriodBefore(window: string): "hour" | "day" | "month" | undefined {
  for (const [period, re] of PERIOD_PREFIX) {
    if (re.test(window)) return period;
  }
  return undefined;
}

/**
 * Validates a digit run as a plausible phone number and normalises it to E.164.
 * Returns null for anything that isn't phone-shaped — most importantly salary
 * ranges like "1200-1500" (8 digits), which the old greedy regex swallowed.
 */
function toPhone(raw: string): string | null {
  const compact = raw.replace(/[\s-]/g, "").replace(/^00/, "+");
  const digits = compact.replace(/^\+/, "");
  if (compact.startsWith("+")) {
    return digits.length >= 9 && digits.length <= 15 ? `+${digits}` : null;
  }
  // Spanish national number: 9 digits starting 6/7/8/9.
  if (/^[6789]\d{8}$/.test(digits)) return `+34${digits}`;
  // Spanish number written with country code but no "+": 34 6xx xxx xxx.
  if (/^34[6789]\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

const PHONE_CANDIDATE = /(?:\+|00)?\d[\d\s-]{6,}\d/g;

function extractPhone(text: string): { phone: string; raw: string } | null {
  for (const m of text.matchAll(PHONE_CANDIDATE)) {
    const whole = toPhone(m[0]);
    if (whole) return { phone: whole, raw: m[0] };
    // The greedy candidate may glue a salary to the phone ("1300 612345678");
    // try each whitespace-separated chunk on its own as well.
    for (const part of m[0].split(/\s+/)) {
      const p = toPhone(part);
      if (p) return { phone: p, raw: part };
    }
  }
  return null;
}

// Negated meals/lodging phrases are removed BEFORE positive detection, so a
// positive alternative can't match inside a negated compound ("不包吃住" used to
// match "吃住" one position later and read as meals+lodging included).
const ZH_NEG_MEALS =
  /(?:不|没有?|无|不提供|不负责)\s*(?:包|管|含|提供)?\s*(吃住|食宿|吃|住)/g;
const ES_NEG_MEALS =
  /(?:sin|no\s+(?:se\s+)?(?:incluye|incluimos|ofrece|ofrecemos|hay|damos))\s+(comida|alojamiento)(?:\s+(?:ni|y|o)\s+(comida|alojamiento))?/gi;

const BOTH_POS = /(包吃住|包食宿|管吃住|吃住|食宿|comida\s+y\s+alojamiento|alojamiento\s+y\s+comida)/i;
const MEALS_POS = /(包吃|管吃|包饭|管饭|comida\s+incluida|incluye\s+comida|almuerzo\s+incluido|comidas\s+incluidas)/i;
const LIVE_POS = /(包住|管住|alojamiento\s+incluido|incluye\s+alojamiento|vivienda\s+incluida)/i;

// Residency: negations first ("无需居留" contains "需居留"), then preference
// ("有居留优先" contains "有居留"), then hard requirement.
const RES_NONE =
  /((?:无需|不需要?|不用|不限|不要求|无所谓)\s*(?:合法|有)?\s*居留|有无居留(?:都|均)?可|居留不限|no\s+(?:se\s+)?(?:requiere|necesita|exige|hace\s+falta)\s+(?:tener\s+)?(?:la\s+)?residencia|sin\s+(?:requisito\s+de\s+)?residencia|con\s+o\s+sin\s+(?:papeles|residencia))/i;
const RES_PREFER =
  /(优先(?:有)?(?:合法)?居留|(?:有|合法)?居留(?:者)?优先|se\s+valora(?:\s+tener)?\s+(?:la\s+)?residencia|preferible(?:mente)?\s+(?:con\s+)?residencia|prefiere\s+residencia)/i;
const RES_REQUIRED =
  /(需(?:要)?(?:有)?(?:合法)?居留|必须(?:有)?(?:合法)?居留|合法居留|有居留|se\s+requiere\s+residencia|imprescindible\s+(?:tener\s+)?residencia|con\s+residencia|residencia\s+legal|con\s+papeles)/i;

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

  // --- phone (validated; removed from the text before salary parsing) -----
  let working = text;
  const phone = extractPhone(text);
  if (phone) {
    result.contactPhone = phone.phone;
    // WhatsApp only — WeChat is a different app and has no field on jobs.
    if (/(whatsapp|wasap|wassap|\bwa\b)/i.test(text)) {
      result.contactWhatsapp = phone.phone;
    }
    working = text.replace(phone.raw, " ");
  }

  // --- salary -------------------------------------------------------------
  const salaryMatch = working.match(/(\d{2,4})\s*(?:€|欧元?|euros?)?\s*(?:[-–~～到至]|a|hasta)\s*(\d{2,4})|(\d{2,4})/i);
  if (salaryMatch && salaryMatch.index !== undefined) {
    const min = parseInt(salaryMatch[1] ?? salaryMatch[3], 10);
    const max = salaryMatch[2] ? parseInt(salaryMatch[2], 10) : min;
    if (Number.isFinite(min) && Number.isFinite(max)) {
      const start = salaryMatch.index;
      const end = start + salaryMatch[0].length;
      // Stop at the first clause separator so "1300欧，工作6天" isn't read as daily.
      const after = working.slice(end, end + 14).split(/[，,。;；\n]/)[0];
      const before = working.slice(Math.max(0, start - 8), start);
      result.salaryMin = Math.min(min, max);
      result.salaryMax = Math.max(min, max);
      result.salaryPeriod =
        detectPeriodAfter(after) ?? detectPeriodBefore(before) ?? "month";
    }
  }

  // --- meals / lodging ----------------------------------------------------
  let positiveText = text;
  for (const re of [ZH_NEG_MEALS, ES_NEG_MEALS]) {
    positiveText = positiveText.replace(re, " ");
  }
  if (BOTH_POS.test(positiveText)) {
    result.mealsIncluded = true;
    result.liveIn = true;
  }
  if (MEALS_POS.test(positiveText)) result.mealsIncluded = true;
  if (LIVE_POS.test(positiveText)) result.liveIn = true;

  // --- residency requirement ---------------------------------------------
  if (RES_NONE.test(text)) {
    result.residenceRequired = "none";
  } else if (RES_PREFER.test(text)) {
    result.residenceRequired = "prefer";
  } else if (RES_REQUIRED.test(text)) {
    result.residenceRequired = "required";
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
