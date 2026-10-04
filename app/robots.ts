import type { MetadataRoute } from "next";
import { absUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth-gated or purely functional routes — nothing worth indexing,
      // and /login in particular shouldn't show up in search results.
      // /admin additionally 404s for anyone not on ADMIN_EMAILS (lib/
      // admin.ts) — this entry is belt-and-suspenders, not the real gate.
      disallow: ["/me", "/employer", "/login", "/auth", "/api", "/admin"],
    },
    sitemap: absUrl("/sitemap.xml"),
  };
}
