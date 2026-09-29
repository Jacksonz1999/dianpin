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
 */
async function main() {
  console.log("Seeding cities...");
  await db.insert(cities).values(seedCities).onConflictDoNothing();

  console.log("Seeding job types...");
  await db.insert(jobTypes).values(seedJobTypes).onConflictDoNothing();

  console.log("Seeding users...");
  await db.insert(users).values(seedUsers).onConflictDoNothing();

  console.log("Seeding stores...");
  await db.insert(stores).values(seedStores).onConflictDoNothing();

  console.log("Seeding jobs...");
  await db.insert(jobs).values(seedJobs).onConflictDoNothing();

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
