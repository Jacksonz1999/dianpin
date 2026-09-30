import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "./client";
import { applications, jobs, reports, reviews, stores } from "./schema";

/**
 * Wipes every row db/seed.ts loaded (is_seed = true on stores/jobs) plus
 * the applications/reviews/reports that point at them, in FK-safe order.
 * Real stores/jobs (is_seed = false, the default for anything created
 * through the app) are never touched. Seed users/cities/job_types are
 * left alone too — they're reference data the app needs to keep working,
 * not demo content.
 */
async function main() {
  const seedJobs = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.is_seed, true));
  const seedStores = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.is_seed, true));

  const seedJobIds = seedJobs.map((j) => j.id);
  const seedStoreIds = seedStores.map((s) => s.id);

  if (seedJobIds.length === 0 && seedStoreIds.length === 0) {
    console.log("No seed rows found (is_seed = true) — nothing to clear.");
    process.exit(0);
  }

  console.log(
    `Clearing ${seedJobIds.length} seed jobs and ${seedStoreIds.length} seed stores...`
  );

  if (seedJobIds.length > 0) {
    await db.delete(applications).where(inArray(applications.job_id, seedJobIds));
    await db.delete(reports).where(inArray(reports.target_id, seedJobIds));
  }
  if (seedStoreIds.length > 0) {
    await db.delete(reviews).where(inArray(reviews.store_id, seedStoreIds));
    await db.delete(reports).where(inArray(reports.target_id, seedStoreIds));
  }

  if (seedJobIds.length > 0) {
    await db.delete(jobs).where(eq(jobs.is_seed, true));
  }
  if (seedStoreIds.length > 0) {
    await db.delete(stores).where(eq(stores.is_seed, true));
  }

  console.log("Seed data cleared.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
