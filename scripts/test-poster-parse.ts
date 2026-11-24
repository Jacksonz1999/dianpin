/**
 * Pure regression tests for the PegaLocal smart-note parser, the compliance
 * guard and the generated poster copy. No database needed — runs in CI.
 *
 * Run: npx tsx scripts/test-poster-parse.ts
 */
import { parsePosterNote, type ParsedPoster } from "../lib/poster-parse";
import { detectDiscrimination } from "../lib/compliance";
import { buildPosterCopy } from "../lib/poster-copy";

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`PASS: ${name}`);
  } else {
    failures++;
    console.error(`FAIL: ${name}`, detail ?? "");
  }
}

const JT = [
  { id: "waiter", name_zh: "服务员", name_es: "Camarero" },
  { id: "cook", name_zh: "厨师", name_es: "Cocinero" },
];
const CITIES = [
  { id: "madrid", name_zh: "马德里", name_es: "Madrid" },
  { id: "barcelona", name_zh: "巴塞罗那", name_es: "Barcelona" },
];
const parse = (n: string) => parsePosterNote(n, JT, CITIES);

function expectParse(note: string, expected: Partial<ParsedPoster>) {
  const got = parse(note);
  for (const [k, v] of Object.entries(expected)) {
    const actual = got[k as keyof ParsedPoster];
    check(`parse「${note}」 ${k}=${JSON.stringify(v)}`, actual === v, { got: actual });
  }
}

// --- original smoke cases (must keep passing) --------------------------------
expectParse("招服务员，包吃住，11–13欧一小时，需合法居留，电话 612345678", {
  jobTypeId: "waiter",
  salaryPeriod: "hour",
  salaryMin: 11,
  salaryMax: 13,
  mealsIncluded: true,
  liveIn: true,
  residenceRequired: "required",
  contactPhone: "+34612345678",
});
expectParse("Se busca camarero, comida incluida, 11–13€/hora, tel 612345678", {
  jobTypeId: "waiter",
  salaryPeriod: "hour",
  salaryMin: 11,
  salaryMax: 13,
  mealsIncluded: true,
  liveIn: false,
  contactPhone: "+34612345678",
});

// --- phone vs salary range ---------------------------------------------------
expectParse("马德里招服务员 1200-1500 电话 612345678", {
  contactPhone: "+34612345678",
  salaryMin: 1200,
  salaryMax: 1500,
  salaryPeriod: "month",
  city: "madrid",
});
expectParse("服务员 1300 612345678", { contactPhone: "+34612345678", salaryMin: 1300 });
expectParse("服务员 月薪1400 电话 +34 612 345 678", {
  contactPhone: "+34612345678",
  salaryMin: 1400,
  salaryPeriod: "month",
});
expectParse("服务员 1200-1500", { contactPhone: undefined, salaryMin: 1200, salaryMax: 1500 });

// --- meals / lodging negation -----------------------------------------------
expectParse("马德里服务员 不包吃住 1300", { mealsIncluded: false, liveIn: false });
expectParse("服务员 包吃不包住", { mealsIncluded: true, liveIn: false });
expectParse("服务员 包住不包吃", { mealsIncluded: false, liveIn: true });
expectParse("服务员 没有吃住", { mealsIncluded: false, liveIn: false });
expectParse("Camarero, sin comida ni alojamiento", { mealsIncluded: false, liveIn: false });
expectParse("Camarero, comida y alojamiento incluidos", { mealsIncluded: true, liveIn: true });

// --- residency negation / preference ----------------------------------------
expectParse("马德里服务员 无需居留 1300", { residenceRequired: "none" });
expectParse("服务员 不需要居留", { residenceRequired: "none" });
expectParse("服务员 有无居留均可", { residenceRequired: "none" });
expectParse("服务员 有居留优先", { residenceRequired: "prefer" });
expectParse("服务员 需合法居留", { residenceRequired: "required" });
expectParse("Camarero, no se requiere residencia", { residenceRequired: "none" });
expectParse("Camarero, se valora residencia", { residenceRequired: "prefer" });
expectParse("Camarero, con residencia legal", { residenceRequired: "required" });

// --- pay period ---------------------------------------------------------------
expectParse("马德里服务员 日薪 60 欧", { salaryMin: 60, salaryPeriod: "day" });
expectParse("Camarero 60€/día", { salaryMin: 60, salaryPeriod: "day" });
expectParse("服务员 1300欧，工作6天", { salaryMin: 1300, salaryPeriod: "month" });
expectParse("服务员 1300 每月 工作6天", { salaryPeriod: "month" });
expectParse("Camarero de 1200 a 1400 al mes", { salaryMin: 1200, salaryMax: 1400, salaryPeriod: "month" });

// --- whatsapp vs wechat -------------------------------------------------------
expectParse("服务员 1300 加微信 612345678", {
  contactPhone: "+34612345678",
  contactWhatsapp: undefined,
});
expectParse("Camarero, WhatsApp 612345678", { contactWhatsapp: "+34612345678" });

// --- compliance: must flag ------------------------------------------------------
for (const text of [
  "只招华人 服务员",
  "限男性",
  "只招女生",
  "女生优先",
  "不要黑人",
  "穆斯林优先",
  "Buscamos solo hombres",
  "Sólo chinos",
  "No extranjeros",
  "Imprescindible ser español",
  "Nacionalidad española",
  "Abstenerse mujeres",
]) {
  check(`compliance flags「${text}」`, detectDiscrimination(text).flagged);
}

// --- compliance: must NOT flag (former false positives + neutral copy) --------
for (const text of [
  "招服务员，包吃住，电话612345678",
  "Se busca personal, comida incluida",
  "Se busca camarero, pregunta por Cristian",
  "Todas las nacionalidades bienvenidas",
  "回族拉面馆",
  "男女不限",
  "不限男女",
  "Se busca camarero o camarera",
]) {
  const r = detectDiscrimination(text);
  check(`compliance allows「${text}」`, !r.flagged, r.terms);
}

// --- generated copy -------------------------------------------------------------
const copy = buildPosterCopy({
  storeName: "好运百元店",
  jobType: { name_zh: "服务员", name_es: "Camarero" },
  city: { name_zh: "马德里", name_es: "Madrid" },
  district: "Usera",
  salaryMin: 60,
  salaryMax: 70,
  salaryPeriod: "day",
  mealsIncluded: false,
  liveIn: true,
  residenceRequired: "none",
});
check("copy zh title", copy.zh.title === "招聘服务员", copy.zh.title);
check("copy es title", copy.es.title === "Se busca Camarero", copy.es.title);
check("copy en title uses English job name", copy.en.title === "We're hiring: Waiter / Waitress", copy.en.title);
check("copy zh day salary", copy.zh.description.includes("€60-70/天"), copy.zh.description);
check("copy es day salary", copy.es.description.includes("al día"), copy.es.description);
check("copy lodging-only meals", copy.zh.description.includes("包住") && !copy.zh.description.includes("不包吃住"), copy.zh.description);
check("copy location separator", copy.es.description.includes("Madrid · Usera"), copy.es.description);
check("copy is compliant", !detectDiscrimination(Object.values(copy).map((c) => c.description).join("\n")).flagged);

console.log(`\nDONE — failures: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
