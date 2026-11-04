import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "./client";

/**
 * One-off production data cleanup for the 2026-10-09 site audit (P0-1,
 * P0-3, P0-5). Code-level guards already ship in the app; this script fixes
 * rows that were written to a running database BEFORE those guards existed.
 * Idempotent — a second run reports zeros.
 *
 *   npm run db:audit-cleanup -- --dry-run   # show what would change
 *   npm run db:audit-cleanup                # actually fix production data
 *
 * Run it in Railway's Shell tab (where DATABASE_URL points at production).
 * It never touches non-demo, non-placeholder rows except for trimming
 * whitespace and closing genuinely expired jobs.
 */
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(DRY_RUN ? "DRY RUN — no writes\n" : "APPLYING CLEANUP\n");

  // --- P0-1: /seed/*.jpg files never existed in public/ -----------------
  const dirtyCovers = await db.execute<{ id: string }>(
    sql`SELECT id FROM stores WHERE cover_image LIKE '/seed/%'`
  );
  const dirtyPhotos = await db.execute<{ id: string }>(
    sql`SELECT id FROM stores WHERE EXISTS (SELECT 1 FROM unnest(photos) AS p WHERE p LIKE '/seed/%')`
  );
  console.log(
    `P0-1 broken covers: ${dirtyCovers.rowCount ?? 0}, stores with broken photos: ${dirtyPhotos.rowCount ?? 0}`
  );

  // --- P0-5: test residue, trailing whitespace -------------------------
  const dirtyStores = await db.execute<{ id: string; name_zh: string; address: string }>(
    sql`SELECT id, name_zh, address FROM stores
        WHERE address ILIKE '%testing%'
           OR address ILIKE '%test 1%'
           OR address ILIKE '%示例%'
           OR address ILIKE '%测试%'
           OR name_zh ILIKE '%示例%'
           OR name_zh ILIKE '%测试%'
           OR name_zh ~ '^百元店[[:space:]]*[0-9]+[[:space:]]*$'`
  );
  console.log(`P0-5 test stores: ${dirtyStores.rowCount ?? 0}`);
  for (const row of dirtyStores.rows) {
    console.log(`  - ${row.id} | ${row.name_zh} | ${row.address}`);
  }

  const untrimmedStores = await db.execute<{ id: string }>(
    sql`SELECT id FROM stores WHERE district <> btrim(district)`
  );
  const untrimmedJobs = await db.execute<{ id: string }>(
    sql`SELECT id FROM jobs WHERE district <> btrim(district)`
  );
  console.log(
    `P0-5 untrimmed districts: ${untrimmedStores.rowCount ?? 0} store(s), ${untrimmedJobs.rowCount ?? 0} job(s)`
  );

  // --- P0-3: auto-close expired posts ----------------------------------
  const expiredJobs = await db.execute<{ id: string }>(
    sql`SELECT id FROM jobs
        WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= now()`
  );
  console.log(`P0-3 expired-but-active jobs: ${expiredJobs.rowCount ?? 0}`);

  if (DRY_RUN) {
    console.log("\nDry run complete. Re-run without --dry-run to apply.");
    return;
  }

  await db.transaction(async (tx) => {
    await tx.execute(
      sql`UPDATE stores SET cover_image = '' WHERE cover_image LIKE '/seed/%'`
    );
    await tx.execute(sql`
      UPDATE stores
      SET photos = COALESCE(
        (SELECT array_agg(p) FROM unnest(photos) AS p WHERE p NOT LIKE '/seed/%'),
        '{}'
      )
      WHERE EXISTS (SELECT 1 FROM unnest(photos) AS p WHERE p LIKE '/seed/%')
    `);

    for (const row of dirtyStores.rows) {
      // FK-safe order: applications -> reports -> reviews -> jobs -> store.
      await tx.execute(
        sql`DELETE FROM applications WHERE job_id IN (SELECT id FROM jobs WHERE store_id = ${row.id})`
      );
      await tx.execute(
        sql`DELETE FROM reports
            WHERE (target_type = 'store' AND target_id = ${row.id})
               OR (target_type = 'job' AND target_id IN (SELECT id FROM jobs WHERE store_id = ${row.id}))`
      );
      await tx.execute(sql`DELETE FROM reviews WHERE store_id = ${row.id}`);
      await tx.execute(sql`DELETE FROM jobs WHERE store_id = ${row.id}`);
      await tx.execute(sql`DELETE FROM stores WHERE id = ${row.id}`);
    }

    await tx.execute(
      sql`UPDATE stores SET district = btrim(district) WHERE district <> btrim(district)`
    );
    await tx.execute(
      sql`UPDATE jobs SET district = btrim(district) WHERE district <> btrim(district)`
    );
    // Closed jobs leave the sitemap entirely, so lastmod doesn't matter here.
    // Don't reference updated_at: this script must also work on a database
    // where migration 0007 hasn't been applied yet.
    await tx.execute(sql`
      UPDATE jobs
      SET status = 'closed'
      WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= now()
    `);
  });

  console.log("\nCleanup applied. Verify with another --dry-run (all counts should be 0).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
