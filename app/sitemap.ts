import type { MetadataRoute } from "next";
import { getJobs, getStores } from "@/lib/db";
import { absUrl, getSiteUrl } from "@/lib/site-url";

// Every other DB-backed route in this app is force-dynamic (see AGENTS.md
// history / PR #9): Railway's build stage has no live DATABASE_URL, and
// `revalidate` makes Next.js try to prerender this route *at build time*
// to seed the ISR cache — which would reintroduce exactly the build-time
// DB-touch failure PR #9 fixed. force-dynamic means it's queried fresh on
// every request instead of cached, but /sitemap.xml traffic is crawler
// volume, not user volume, so that cost is negligible.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const [activeJobs, stores] = await Promise.all([
    getJobs({ status: "active" }),
    getStores(),
  ]);

  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    ...activeJobs.map((job) => ({
      url: absUrl(`/job/${job.id}`),
      lastModified: job.published_at,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...stores.map((store) => ({
      url: absUrl(`/store/${store.id}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
