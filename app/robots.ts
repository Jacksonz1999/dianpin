import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth-gated or purely functional routes — nothing worth indexing,
      // and /login in particular shouldn't show up in search results.
      disallow: ["/me", "/employer", "/login", "/auth", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
