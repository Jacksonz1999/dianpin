import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import {
  createPosterStore,
  createPosterJob,
  getJobBySlug,
  getJobPosterMeta,
  getJobById,
} from "@/lib/db";

const DATABASE_URL = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString: DATABASE_URL });

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL: " + msg);
    process.exitCode = 1;
  } else {
    console.log("PASS: " + msg);
  }
}

async function main() {
  const userId = "u_smoke_" + randomUUID().slice(0, 8);
  const cityId = "c_smoke_" + randomUUID().slice(0, 8);
  const jtId = "jt_smoke_" + randomUUID().slice(0, 8);

  await pool.query(
    `INSERT INTO users (id, role, name, locale) VALUES ($1,'employer','Smoke Owner','zh') ON CONFLICT DO NOTHING`,
    [userId],
  );
  await pool.query(
    `INSERT INTO cities (id, name_zh, name_es, region) VALUES ($1,'马德里','Madrid','Madrid') ON CONFLICT DO NOTHING`,
    [cityId],
  );
  await pool.query(
    `INSERT INTO job_types (id, name_zh, name_es, icon) VALUES ($1,'服务员','Camarero','utensils') ON CONFLICT DO NOTHING`,
    [jtId],
  );

  const store = await createPosterStore({
    ownerUserId: userId,
    nameZh: "好运百元店",
    city: cityId,
    district: "Usera",
    category: "服务员",
  });
  assert(!!store?.id, "createPosterStore 返回门店 id");

  const slug = randomUUID().replace(/-/g, "").slice(0, 12);
  const jobId = await createPosterJob({
    storeId: store.id,
    jobTypeId: jtId,
    city: cityId,
    district: "Usera",
    titleZh: "招聘服务员",
    titleEs: "Se busca camarero",
    titleEn: "We're hiring: waiter",
    descriptionZh: "诚聘服务员一名",
    descriptionEs: "Buscamos camarero",
    descriptionEn: "We are looking for a waiter",
    salaryMin: 1200,
    salaryMax: 1500,
    salaryPeriod: "month",
    headcount: 1,
    schedule: "",
    liveIn: false,
    mealsIncluded: true,
    languageRequired: "",
    residenceRequired: "none",
    posterSlug: slug,
    contactPhone: "+34600111222",
    contactWhatsapp: "+34600333444",
  });
  assert(!!jobId, "createPosterJob 返回岗位 id");

  const bySlug = await getJobBySlug(slug);
  assert(
    !!bySlug && bySlug.id === jobId && bySlug.status === "active",
    "getJobBySlug 解析到新 active 岗位（二维码落地路径）",
  );

  const meta = await getJobPosterMeta(jobId);
  assert(!!meta && meta.source === "poster", "getJobPosterMeta source=poster");
  assert(!!meta && meta.posterSlug === slug, "posterSlug 一致");
  assert(
    !!meta && meta.contactPhone === "+34600111222",
    "联系电话已落库",
  );
  assert(
    !!meta && meta.contactWhatsapp === "+34600333444",
    "WhatsApp 已落库",
  );
  assert(
    !!meta && meta.titleEn === "We're hiring: waiter",
    "title_en 已落库（英文落地文案）",
  );

  const job = await getJobById(jobId);
  assert(!!job && job.id === jobId, "getJobById 返回岗位（落地页数据路径）");

  const { rows } = await pool.query(
    `SELECT source, poster_slug, contact_phone, contact_whatsapp, title_en, description_en FROM jobs WHERE id=$1`,
    [jobId],
  );
  const r = rows[0];
  assert(
    r.source === "poster" &&
      r.poster_slug === slug &&
      r.title_en === "We're hiring: waiter",
    "原生 SQL 校验海报列已落库",
  );

  console.log("\nSMOKE DONE");
  await pool.end();
}

main().catch((e) => {
  console.error("SMOKE ERROR:", e);
  process.exit(1);
});
