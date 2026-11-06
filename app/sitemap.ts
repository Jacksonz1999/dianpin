import type { MetadataRoute } from "next";
import { getCities, getJobUpdatedAtMap, getJobs, getStores } from "@/lib/db";
import { absUrl, getSiteUrl } from "@/lib/site-url";
import { localePath } from "@/lib/locale-routing";
import { looksLikeTestStore } from "@/lib/public-store";
import { locales, type Locale } from "@/lib/i18n";

// Every other DB-backed route in this app is force-dynamic (see AGENTS.md
// history / PR #9): Railway's build stage has no live DATABASE_URL, and
// `revalidate` makes Next.js try to prerender this route *at build time*
// to seed the ISR cache — which would reintroduce exactly the build-time
// DB-touch failure PR #9 fixed. force-dynamic means it's queried fresh on
// every request instead of cached, but /sitemap.xml traffic is crawler
// volume, not user volume, so that cost is negligible.
export const dynamic = "force-dynamic";

function languageAlternates(path: string) {
  const zhUrl = path === "/" ? `${getSiteUrl()}/` : absUrl(path);
  const esUrl = absUrl(localePath(path, "es"));
  const enUrl = absUrl(localePath(path, "en"));
  return {
    "zh-CN": zhUrl,
    "es-ES": esUrl,
    "en-US": enUrl,
    "x-default": zhUrl,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [activeJobs, allStores, cities, updatedAtById] = await Promise.all([
    // getJobs({status:"active"}) already excludes expired rows (audit P0-3).
    getJobs({ status: "active" }),
    getStores(),
    getCities(),
    // Guarded: returns {} when migration 0007 hasn't been applied yet, so a
    // skipped preDeploy can never 500 the sitemap (or the pages behind it).
    getJobUpdatedAtMap(),
  ]);
  const stores = allStores.filter(
    (store) => !looksLikeTestStore(store) && store.verification_status !== "rejected"
  );
  // A rejected/test store must not have its jobs indexed either — exclude any
  // active job whose store is rejected or a test row, even though getJobs()
  // already drops rejected stores (this catches the test-store case that
  // relies only on name/address heuristics).
  const excludedStoreIds = new Set(
    allStores
      .filter(
        (store) =>
          store.verification_status === "rejected" || looksLikeTestStore(store)
      )
      .map((store) => store.id)
  );
  const indexedJobs = activeJobs.filter(
    (job) => !excludedStoreIds.has(job.store_id)
  );
  const cityIdsWithJobs = new Set(indexedJobs.map((job) => job.city));
  const today = new Date();

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales as Locale[]) {
    entries.push({
      // Chinese keeps the bare root (no trailing slash) — the exact URL
      // every canonical/OG tag already points at.
      url: locale === "zh" ? siteUrl : absUrl(localePath("/", locale)),
      lastModified: today,
      changeFrequency: "daily",
      priority: locale === "zh" ? 1 : 0.9,
      alternates: { languages: languageAlternates("/") },
    });
  }

  for (const city of cities) {
    if (!cityIdsWithJobs.has(city.id)) continue;
    const path = `/jobs/${city.id}`;
    for (const locale of locales as Locale[]) {
      entries.push({
        url: absUrl(localePath(path, locale)),
        lastModified: today,
        changeFrequency: "daily",
        priority: 0.7,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  for (const locale of locales as Locale[]) {
    entries.push({
      url: absUrl(localePath("/about", locale)),
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.4,
      alternates: { languages: languageAlternates("/about") },
    });
  }

  for (const job of indexedJobs) {
    const path = `/job/${job.id}`;
    // Audit P1-6: lastmod used to be the hardcoded seed published_at.
    // Falls back to published_at only on databases still missing 0007.
    const lastModified = updatedAtById[job.id] ?? job.published_at;
    for (const locale of locales as Locale[]) {
      entries.push({
        url: absUrl(localePath(path, locale)),
        lastModified,
        changeFrequency: "daily",
        priority: 0.8,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  for (const store of stores) {
    const path = `/store/${store.id}`;
    for (const locale of locales as Locale[]) {
      entries.push({
        url: absUrl(localePath(path, locale)),
        lastModified: store.created_at,
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  return entries;
}
