import type { MetadataRoute } from "next";
import { absUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth-gated or purely functional routes — nothing worth indexing,
      // and /login in particular shouldn't show up in search results.
      disallow: ["/me", "/employer", "/login", "/auth", "/api"],
    },
    sitemap: absUrl("/sitemap.xml"),
  };
}
