import "dotenv/config";
import {
  seedApplications,
  seedCities,
  seedJobTypes,
  seedJobs,
  seedReviews,
  seedStores,
  seedUsers,
} from "../lib/seed";
import { db } from "./client";
import { applications, cities, jobTypes, jobs, reviews, stores, users } from "./schema";

/**
 * Loads the demo data from lib/seed.ts into Postgres, in FK-safe order.
 * Idempotent: re-running it skips rows that already exist (matched by
 * primary key / unique constraint).
 *
 * seeker_profiles and reports have no rows in lib/seed.ts, so they stay
 * empty after seeding — that's expected, not a bug.
 *
 * Every store/job row is stamped is_seed: true here (not in lib/seed.ts)
 * so the flag can't drift from what this script actually inserts, and
 * every demo store's verification_status is forced to "unverified" —
 * demo data must never show a trust badge real users haven't earned
 * (see npm run db:seed:clear to wipe these rows again).
 */
async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    console.error(
      "[db:seed] Refusing to load demo data: NODE_ENV=production and ALLOW_SEED is not \"true\".\n" +
        "This is deliberate — seed data must never reach production by default.\n" +
        "Set ALLOW_SEED=true if you really mean to seed this database."
    );
    process.exit(1);
  }

  console.log("Seeding cities...");
  await db.insert(cities).values(seedCities).onConflictDoNothing();

  console.log("Seeding job types...");
  await db.insert(jobTypes).values(seedJobTypes).onConflictDoNothing();

  console.log("Seeding users...");
  await db.insert(users).values(seedUsers).onConflictDoNothing();

  console.log("Seeding stores...");
  await db
    .insert(stores)
    .values(
      seedStores.map((store) => ({
        ...store,
        is_seed: true,
        verification_status: "unverified" as const,
        verified_at: null,
      }))
    )
    .onConflictDoNothing();

  console.log("Seeding jobs...");
  await db
    .insert(jobs)
    .values(seedJobs.map((job) => ({ ...job, is_seed: true })))
    .onConflictDoNothing();

  console.log("Seeding applications...");
  await db
    .insert(applications)
    .values(seedApplications)
    .onConflictDoNothing();

  console.log("Seeding reviews...");
  await db.insert(reviews).values(seedReviews).onConflictDoNothing();

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
