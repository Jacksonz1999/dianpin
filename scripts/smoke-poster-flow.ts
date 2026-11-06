/**
 * Real smoke for the "smart note" poster flow (prompt 1.1 / 4).
 *
 * Covers, against a live Postgres:
 *  - parsePosterNote: Chinese & Spanish free-text -> structured fields
 *  - detectDiscrimination: bilingual red-line guard (flag + clean)
 *  - full publish path (mirrors actions.createPosterPost's data writes):
 *    parse a note -> build zh/es/en copy -> createPosterStore + createPosterJob
 *    -> read back via getJobPosterMeta / getJobBySlug (QR landing path)
 *
 * Run: DATABASE_URL=postgresql://ci:ci@localhost:5432/dianpin npx tsx scripts/smoke-poster-flow.ts
 */
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { parsePosterNote } from "@/lib/poster-parse";
import { detectDiscrimination } from "@/lib/compliance";
import {
  createPosterStore,
  createPosterJob,
  getJobBySlug,
  getJobPosterMeta,
} from "@/lib/db";

const DATABASE_URL = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString: DATABASE_URL });

let failures = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    failures++;
    console.error("FAIL: " + msg);
  } else {
    console.log("PASS: " + msg);
  }
}

const JT = { id: "jt_flow", name_zh: "服务员", name_es: "Camarero" };
const CITY = { id: "c_flow", name_zh: "马德里", name_es: "Madrid" };

async function main() {
  // --- seed minimal reference data (self-contained, deterministic) ----------
  const userId = "u_flow_" + randomUUID().slice(0, 8);
  await pool.query(
    `INSERT INTO users (id, role, name, locale) VALUES ($1,'employer','Flow Owner','zh') ON CONFLICT DO NOTHING`,
    [userId],
  );
  await pool.query(
    `INSERT INTO cities (id, name_zh, name_es, region) VALUES ($1,$2,$3,'Madrid') ON CONFLICT DO NOTHING`,
    [CITY.id, CITY.name_zh, CITY.name_es],
  );
  await pool.query(
    `INSERT INTO job_types (id, name_zh, name_es, icon) VALUES ($1,$2,$3,'utensils') ON CONFLICT DO NOTHING`,
    [JT.id, JT.name_zh, JT.name_es],
  );

  // ============ PURE: parse (Chinese) ============
  const zhNote = "招服务员，包吃住，11–13欧一小时，需合法居留，电话 612345678";
  const zh = parsePosterNote(zhNote, [JT], [CITY]);
  assert(zh.jobTypeId === JT.id, "解析(中): 工种=服务员");
  assert(zh.salaryPeriod === "hour", "解析(中): 时薪口径");
  assert(zh.salaryMin === 11 && zh.salaryMax === 13, "解析(中): 薪资 11–13");
  assert(zh.mealsIncluded === true && zh.liveIn === true, "解析(中): 包吃住");
  assert(zh.residenceRequired === "required", "解析(中): 需合法居留");
  assert(zh.contactPhone === "+34612345678", "解析(中): 电话 +34 规范化");

  // ============ PURE: parse (Spanish) ============
  const esNote =
    "Se busca camarero, comida incluida, 11–13€/hora, tel 612345678";
  const es = parsePosterNote(esNote, [JT], [CITY]);
  assert(es.jobTypeId === JT.id, "解析(西): 工种=camarero");
  assert(es.salaryPeriod === "hour", "解析(西): 时薪口径");
  assert(es.salaryMin === 11 && es.salaryMax === 13, "解析(西): 薪资 11–13");
  assert(es.mealsIncluded === true, "解析(西): 包吃(comida incluida)");
  assert(es.liveIn === false, "解析(西): 未提包住");
  assert(es.contactPhone === "+34612345678", "解析(西): 电话 +34 规范化");

  // ============ PURE: compliance guard ============
  const c1 = detectDiscrimination("招服务员，包吃住，电话612345678");
  assert(c1.flagged === false, "合规: 中性招聘不命中");
  const c2 = detectDiscrimination("Se busca personal, comida incluida");
  assert(c2.flagged === false, "合规(西): 中性招聘不命中");
  const c3 = detectDiscrimination("只招华人 服务员");
  assert(c3.flagged === true && c3.terms.includes("只招华人"), "合规: 命中「只招华人」");
  const c4 = detectDiscrimination("Buscamos solo hombres");
  assert(c4.flagged === true, "合规(西): 命中「solo hombres」");

  // ============ DB: publish from Chinese note (bidirectional) ============
  const pZh = parsePosterNote(zhNote, [JT], [CITY]);
  const storeZh = await createPosterStore({
    ownerUserId: userId,
    nameZh: "好运百元店",
    city: CITY.id,
    district: "Usera",
    category: JT.name_zh,
  });
  assert(!!storeZh?.id, "发布(中): createPosterStore 成功");

  const slugZh = randomUUID().replace(/-/g, "").slice(0, 12);
  const jobIdZh = await createPosterJob({
    storeId: storeZh.id,
    jobTypeId: pZh.jobTypeId!,
    city: CITY.id,
    district: "Usera",
    titleZh: `招聘${JT.name_zh}`,
    titleEs: `Se busca ${JT.name_es}`,
    titleEn: `We're hiring: ${JT.name_es}`,
    descriptionZh: "诚聘服务员",
    descriptionEs: "Buscamos camarero",
    descriptionEn: "We are hiring a waiter",
    salaryMin: pZh.salaryMin!,
    salaryMax: pZh.salaryMax!,
    salaryPeriod: pZh.salaryPeriod!,
    headcount: 1,
    liveIn: pZh.liveIn!,
    mealsIncluded: pZh.mealsIncluded!,
    languageRequired: "",
    residenceRequired: pZh.residenceRequired!,
    posterSlug: slugZh,
    contactPhone: pZh.contactPhone!,
    contactWhatsapp: "",
  });
  assert(!!jobIdZh, "发布(中): createPosterJob 成功");

  const metaZh = await getJobPosterMeta(jobIdZh);
  const { rows: zhRows } = await pool.query(
    `SELECT title_zh, title_es, salary_min, salary_max, salary_period FROM jobs WHERE id=$1`,
    [jobIdZh],
  );
  const zr = zhRows[0];
  assert(zr.title_zh === "招聘服务员", "发布(中): title_zh 落库");
  assert(
    zr.title_es === "Se busca Camarero",
    "发布(中): title_es 落库(西语求职者可见)",
  );
  assert(!!metaZh?.titleEn, "发布(中): title_en 落库(英文求职者可见)");
  assert(metaZh?.contactPhone === "+34612345678", "发布(中): 解析出的电话落库");
  assert(
    Number(zr.salary_min) === 11 &&
      Number(zr.salary_max) === 13 &&
      zr.salary_period === "hour",
    "发布(中): 解析出的薪资落库",
  );

  const bySlugZh = await getJobBySlug(slugZh);
  assert(
    !!bySlugZh && bySlugZh.id === jobIdZh && bySlugZh.status === "active",
    "发布(中): 二维码落地路径(getJobBySlug)解析到 active 岗位",
  );

  // ============ DB: publish from Spanish note (bidirectional) ============
  const pEs = parsePosterNote(esNote, [JT], [CITY]);
  const storeEs = await createPosterStore({
    ownerUserId: userId,
    nameZh: "Tienda Suerte",
    city: CITY.id,
    district: "Usera",
    category: JT.name_zh,
  });
  const slugEs = randomUUID().replace(/-/g, "").slice(0, 12);
  const jobIdEs = await createPosterJob({
    storeId: storeEs.id,
    jobTypeId: pEs.jobTypeId!,
    city: CITY.id,
    district: "Usera",
    titleZh: `招聘${JT.name_zh}`,
    titleEs: `Se busca ${JT.name_es}`,
    titleEn: `We're hiring: ${JT.name_es}`,
    descriptionZh: "诚聘服务员",
    descriptionEs: "Buscamos camarero",
    descriptionEn: "We are hiring a waiter",
    salaryMin: pEs.salaryMin!,
    salaryMax: pEs.salaryMax!,
    salaryPeriod: pEs.salaryPeriod!,
    headcount: 1,
    liveIn: pEs.liveIn!,
    mealsIncluded: pEs.mealsIncluded!,
    languageRequired: "",
    residenceRequired: pEs.residenceRequired ?? "none",
    posterSlug: slugEs,
    contactPhone: pEs.contactPhone!,
    contactWhatsapp: "",
  });
  const metaEs = await getJobPosterMeta(jobIdEs);
  const { rows: esRows } = await pool.query(
    `SELECT title_zh, title_es FROM jobs WHERE id=$1`,
    [jobIdEs],
  );
  const er = esRows[0];
  assert(er.title_es === "Se busca Camarero", "发布(西): 西语店主源文案=Se busca");
  assert(er.title_zh === "招聘服务员", "发布(西): 中文求职者可见(双向)");
  assert(metaEs?.contactPhone === "+34612345678", "发布(西): 解析出的电话落库");

  // ============ compliance guard blocks publish (mirrors action early-return) =====
  const blocked = detectDiscrimination("只招华人 招服务员 电话612345678");
  assert(blocked.flagged === true, "护栏: 歧视词命中 → action 早返回，不写库");

  console.log(`\nSMOKE DONE — failures: ${failures}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("SMOKE ERROR:", e);
  process.exit(1);
});
