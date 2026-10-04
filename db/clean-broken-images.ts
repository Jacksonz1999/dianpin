import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "./client";

/**
 * One-off production cleanup (round 9 / WP-G): `lib/seed.ts` used to point
 * `stores.cover_image`/`photos` at `/seed/*.jpg` files that were never
 * actually committed to `public/` — every load 404'd. The component-level
 * fix (StoreCoverImage.tsx) and the seed-data fix (lib/seed.ts, now ""/[])
 * both ship in this same round, but neither touches rows already written
 * to a running database — this script is that one-time data fix. Safe to
 * run more than once (idempotent: a second run matches zero rows).
 *
 * Run in Railway's Shell: `npm run db:clean-images`
 */
async function main() {
  const coverResult = await db.execute(
    sql`UPDATE stores SET cover_image = '' WHERE cover_image LIKE '/seed/%'`
  );

  const photosResult = await db.execute(sql`
    UPDATE stores
    SET photos = COALESCE(
      (SELECT array_agg(p) FROM unnest(photos) AS p WHERE p NOT LIKE '/seed/%'),
      '{}'
    )
    WHERE EXISTS (SELECT 1 FROM unnest(photos) AS p WHERE p LIKE '/seed/%')
  `);

  console.log(`cover_image cleared on ${coverResult.rowCount ?? 0} store(s).`);
  console.log(`photos cleaned on ${photosResult.rowCount ?? 0} store(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
