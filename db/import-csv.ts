import "dotenv/config";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";
import { and, eq } from "drizzle-orm";
import { db } from "./client";
import { cities, jobTypes, jobs, stores, users } from "./schema";

/**
 * Imports real store/job listings from the CSV format described in the
 * "让真实数据能进来" round: one row per job posting, door-name + city pair
 * dedupes the store, phone number dedupes the owner account.
 *
 * Usage:
 *   npm run db:import -- path/to/file.csv [--dry-run]
 *
 * Columns (Chinese header row, in this order):
 *   门店名称 / 城市 / 区域 / 门店地址 / 门店类型 / 老板称呼 / 联系电话 /
 *   认证状态 / 工种 / 薪资类型 / 薪资下限 / 薪资上限 / 货币 / 工作时间 /
 *   招聘人数 / 包吃 / 包住 / 可住宿 / 语言要求 / 居留要求 / 岗位描述 / 发布日期
 *
 * Known simplification: the jobs table (AGENTS.md §5) has one `live_in`
 * boolean, not separate "包住" (employer-provided housing) and "可住宿"
 * (housing available) concepts — this script sets live_in = true if
 * EITHER column says yes. No schema column was added for this; splitting
 * it into two real fields is a product decision for AGENTS.md, not
 * something this import script should decide on its own.
 *
 * Store name_es / job description_es have no CSV column (the sheet is
 * Chinese-only) — both default to the _zh value with a per-row warning,
 * since the schema requires them NOT NULL. Fill in real Spanish text by
 * editing the store/job afterward.
 */

const YES_VALUES = new Set(["是", "y", "yes", "true", "1"]);

function isYes(value: string | undefined): boolean {
  return !!value && YES_VALUES.has(value.trim().toLowerCase());
}

const SALARY_PERIOD_MAP: Record<string, "hour" | "day" | "month"> = {
  时: "hour",
  小时: "hour",
  hour: "hour",
  天: "day",
  day: "day",
  月: "month",
  month: "month",
};

const RESIDENCE_MAP: Record<string, "none" | "prefer" | "required"> = {
  居留不限: "none",
  无要求: "none",
  none: "none",
  有居留优先: "prefer",
  优先: "prefer",
  prefer: "prefer",
  必须有居留: "required",
  必须: "required",
  required: "required",
};

const VERIFICATION_MAP: Record<
  string,
  "unverified" | "pending" | "verified" | "rejected"
> = {
  未认证: "unverified",
  unverified: "unverified",
  认证中: "pending",
  pending: "pending",
  已认证: "verified",
  verified: "verified",
  认证未通过: "rejected",
  rejected: "rejected",
};

interface SkipReason {
  row: number;
  reason: string;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const filePath = args.find((a) => !a.startsWith("--"));

  if (!filePath) {
    console.error("Usage: npm run db:import -- path/to/file.csv [--dry-run]");
    process.exit(1);
  }

  const raw = readFileSync(filePath, "utf-8");
  const rows: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  const cityRows = await db.select().from(cities);
  const jobTypeRows = await db.select().from(jobTypes);
  const cityIdByName = new Map(cityRows.map((c) => [c.name_zh, c.id]));
  const jobTypeIdByName = new Map(jobTypeRows.map((jt) => [jt.name_zh, jt.id]));

  const skipped: SkipReason[] = [];
  const warnings: string[] = [];
  let storesCreated = 0;
  let storesReused = 0;
  let jobsCreated = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +1 for header, +1 for 1-indexing
    const row = rows[i];

    const storeName = row["门店名称"]?.trim();
    const cityName = row["城市"]?.trim();
    const district = row["区域"]?.trim();
    const address = row["门店地址"]?.trim();
    const category = row["门店类型"]?.trim();
    const ownerName = row["老板称呼"]?.trim();
    const ownerPhone = row["联系电话"]?.trim();
    const jobTypeName = row["工种"]?.trim();
    const salaryPeriodRaw = row["薪资类型"]?.trim();
    const salaryMinRaw = row["薪资下限"]?.trim();
    const salaryMaxRaw = row["薪资上限"]?.trim();
    const currency = row["货币"]?.trim();
    const schedule = row["工作时间"]?.trim();
    const headcountRaw = row["招聘人数"]?.trim();
    const languageRequired = row["语言要求"]?.trim();
    const residenceRaw = row["居留要求"]?.trim();
    const description = row["岗位描述"]?.trim();
    const publishedDateRaw = row["发布日期"]?.trim();

    if (!storeName || !cityName || !district || !address || !category) {
      skipped.push({ row: rowNum, reason: "门店必填字段缺失（名称/城市/区域/地址/类型）" });
      continue;
    }
    if (!ownerPhone) {
      skipped.push({ row: rowNum, reason: "缺少联系电话，无法创建/匹配门店主账号" });
      continue;
    }
    if (!jobTypeName || !schedule || !languageRequired || !description) {
      skipped.push({ row: rowNum, reason: "岗位必填字段缺失（工种/工作时间/语言要求/岗位描述）" });
      continue;
    }

    const cityId = cityIdByName.get(cityName);
    if (!cityId) {
      skipped.push({
        row: rowNum,
        reason: `城市「${cityName}」不在 cities 表枚举里（目前只有：${[...cityIdByName.keys()].join("/")}）`,
      });
      continue;
    }

    const jobTypeId = jobTypeIdByName.get(jobTypeName);
    if (!jobTypeId) {
      skipped.push({
        row: rowNum,
        reason: `工种「${jobTypeName}」不在 job_types 表枚举里（目前只有：${[...jobTypeIdByName.keys()].join("/")}）`,
      });
      continue;
    }

    const salaryPeriod = salaryPeriodRaw ? SALARY_PERIOD_MAP[salaryPeriodRaw] : undefined;
    if (!salaryPeriod) {
      skipped.push({ row: rowNum, reason: `薪资类型「${salaryPeriodRaw}」无法识别（时/天/月）` });
      continue;
    }

    const salaryMin = Number(salaryMinRaw);
    const salaryMax = Number(salaryMaxRaw);
    if (!Number.isFinite(salaryMin) || !Number.isFinite(salaryMax) || salaryMin > salaryMax) {
      skipped.push({ row: rowNum, reason: `薪资下限/上限不合法（下限 ${salaryMinRaw}，上限 ${salaryMaxRaw}，要求下限 ≤ 上限）` });
      continue;
    }

    if (currency && !/^(eur|€|欧元)$/i.test(currency)) {
      skipped.push({ row: rowNum, reason: `货币「${currency}」不是欧元——本平台只支持 € 计价` });
      continue;
    }

    const residenceRequired = residenceRaw ? RESIDENCE_MAP[residenceRaw] ?? "none" : "none";
    if (residenceRaw && !RESIDENCE_MAP[residenceRaw]) {
      warnings.push(`第 ${rowNum} 行：居留要求「${residenceRaw}」无法识别，按「居留不限」处理`);
    }

    // null = "CSV didn't say" (blank cell) or "said something this script
    // doesn't recognize" — both cases leave an existing store's status
    // alone and a new store still defaults to unverified below. Collapsing
    // "not specified" into a concrete value here (the old behavior) is
    // exactly what made a reused store's CSV-specified status silently
    // vanish — see WP-M's bug report.
    const verificationRaw = row["认证状态"]?.trim();
    let verificationStatus:
      | "unverified"
      | "pending"
      | "verified"
      | "rejected"
      | null = null;
    if (verificationRaw) {
      verificationStatus = VERIFICATION_MAP[verificationRaw] ?? null;
      if (!verificationStatus) {
        warnings.push(
          `第 ${rowNum} 行：认证状态「${verificationRaw}」无法识别，忽略该列（不会覆盖门店已有认证状态）`
        );
      }
    }

    const headcount = headcountRaw ? Number(headcountRaw) : 1;
    const mealsIncluded = isYes(row["包吃"]);
    const liveIn = isYes(row["包住"]) || isYes(row["可住宿"]);

    let publishedAt: string | undefined;
    if (publishedDateRaw) {
      const parsed = new Date(publishedDateRaw);
      if (Number.isNaN(parsed.getTime())) {
        warnings.push(`第 ${rowNum} 行：发布日期「${publishedDateRaw}」无法解析，改用当前时间`);
      } else {
        publishedAt = parsed.toISOString();
      }
    }

    // Reads happen regardless of --dry-run (harmless, needed to report
    // what a real run would do); every write below is individually
    // guarded by `!dryRun`.
    let [owner] = await db.select().from(users).where(eq(users.phone, ownerPhone));
    if (!owner && !dryRun) {
      [owner] = await db
        .insert(users)
        .values({
          id: `u_${randomUUID()}`,
          role: "employer",
          phone: ownerPhone,
          name: ownerName || ownerPhone,
          locale: "zh",
        })
        .returning();
    }

    // Store: find-or-create by (name_zh, city).
    let [store] = await db
      .select()
      .from(stores)
      .where(and(eq(stores.name_zh, storeName), eq(stores.city, cityId)));

    if (!store) {
      const effectiveStatus = verificationStatus ?? "unverified";
      if (dryRun) {
        console.log(
          `[dry-run] 第 ${rowNum} 行：将新建门店「${storeName}」(${cityName})，认证状态=${effectiveStatus}；新建岗位「${jobTypeName}」`
        );
        continue;
      }
      warnings.push(`第 ${rowNum} 行：CSV 没有西语门店名列，name_es 暂时沿用中文名`);
      [store] = await db
        .insert(stores)
        .values({
          id: `store_${randomUUID()}`,
          owner_user_id: owner.id,
          name_zh: storeName,
          name_es: storeName,
          city: cityId,
          district,
          address,
          category,
          cover_image: "",
          verification_status: effectiveStatus,
        })
        .returning();
      storesCreated++;
    } else {
      storesReused++;

      // The one behavior WP-M (round 10) exists to fix: a reused store's
      // CSV-specified verification status used to be silently discarded.
      // Only acts when the CSV named a *recognized* status that actually
      // differs from what's already there — a blank cell or unrecognized
      // value leaves the existing status untouched, logged or not.
      if (verificationStatus && verificationStatus !== store.verification_status) {
        console.log(
          `第 ${rowNum} 行：门店「${storeName}」认证状态 ${store.verification_status} → ${verificationStatus}` +
            (dryRun ? "（--dry-run，不会写入）" : "")
        );
        if (!dryRun) {
          [store] = await db
            .update(stores)
            .set({
              verification_status: verificationStatus,
              verified_at: verificationStatus === "verified" ? new Date().toISOString() : store.verified_at,
            })
            .where(eq(stores.id, store.id))
            .returning();
        }
      }

      if (dryRun) {
        console.log(
          `[dry-run] 第 ${rowNum} 行：复用已有门店「${storeName}」；将新建岗位「${jobTypeName}」`
        );
        continue;
      }
    }

    warnings.push(`第 ${rowNum} 行：CSV 没有西语岗位描述列，description_es 暂时沿用中文描述`);

    await db.insert(jobs).values({
      id: `job_${randomUUID()}`,
      store_id: store.id,
      title_zh: jobTypeName,
      title_es: jobTypeName,
      job_type: jobTypeId,
      city: cityId,
      district,
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_period: salaryPeriod,
      headcount: Number.isFinite(headcount) && headcount > 0 ? headcount : 1,
      schedule,
      live_in: liveIn,
      meals_included: mealsIncluded,
      language_required: languageRequired,
      residence_required: residenceRequired,
      description_zh: description,
      description_es: description,
      status: "active",
      ...(publishedAt ? { published_at: publishedAt } : {}),
    });
    jobsCreated++;
  }

  console.log("");
  console.log(`共 ${rows.length} 行。`);
  if (dryRun) {
    console.log(`--dry-run：不会写入任何数据。将写入 ${rows.length - skipped.length} 行，跳过 ${skipped.length} 行。`);
  } else {
    console.log(
      `写入完成：新建门店 ${storesCreated} 家，复用已有门店 ${storesReused} 家，新建岗位 ${jobsCreated} 条，跳过 ${skipped.length} 行。`
    );
  }
  if (warnings.length > 0) {
    console.log("\n警告：");
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
  if (skipped.length > 0) {
    console.log("\n跳过的行：");
    skipped.forEach((s) => console.log(`  - 第 ${s.row} 行：${s.reason}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
