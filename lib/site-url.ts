/**
 * Single source of truth for the site's own absolute URL — every
 * canonical/og:url/sitemap/robots/JSON-LD reference in the app goes
 * through this function (see lib/seo.ts, app/sitemap.ts, app/robots.ts,
 * app/layout.tsx's metadataBase).
 *
 * In production, a missing NEXT_PUBLIC_SITE_URL throws instead of
 * silently falling back — a wrong-but-plausible value (the old Railway
 * domain, an empty string) is exactly how the site can end up telling
 * Google the wrong canonical domain for weeks without anyone noticing,
 * which is what happened before this check existed. `next build` always
 * runs with NODE_ENV=production, so this fails the Railway build loudly
 * if the variable isn't set there — see .github/workflows/ci.yml for the
 * placeholder value that keeps CI (which never talks to production) green.
 *
 * Outside production (local dev, this repo's own scripts), it still
 * falls back to localhost:3000 for convenience — nobody sets this var
 * for `npm run dev`.
 */
export function getSiteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL is not set. Every canonical/og:url/sitemap/JSON-LD " +
          "URL depends on it — set it to the real production domain " +
          "(e.g. https://dianpin.eu) in Railway's service Variables, then trigger " +
          "an actual rebuild (this is a NEXT_PUBLIC_ var, inlined at build time, " +
          "not read at runtime — see AGENTS.md / README's deployment notes)."
      );
    }
    return "http://localhost:3000";
  }
  // Strip a trailing slash so callers can always safely do `${getSiteUrl()}/path`
  // without risking a double slash.
  return value.replace(/\/$/, "");
}

/** Joins the site URL with a path, e.g. absUrl("/job/123") -> "https://dianpin.eu/job/123". */
export function absUrl(path: string): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
