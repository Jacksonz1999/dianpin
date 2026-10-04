import { NotFoundView } from "@/components/NotFoundView";

/**
 * Branded 404 (WP-I, round 9) — replaces Next's default English
 * "This page could not be found." (serif font, no site shell styling,
 * no i18n). The actual UI lives in NotFoundView ("use client", needs
 * useLocale()); this file stays a Server Component so the route segment
 * config below can force dynamic rendering, same pattern as every other
 * page in this app (app/page.tsx, app/job/[id]/page.tsx, etc.).
 *
 * That force is not optional here: proxy.ts's CSP uses a fresh nonce per
 * request. Next can only inject a matching nonce into framework/
 * hydration scripts on a dynamically rendered page — a statically
 * prerendered one bakes in a build-time nonce that can never match a
 * later request's CSP header, so the browser blocks every script on it.
 * Without this line, not-found.tsx builds as a static route (confirmed:
 * `next build` marks it ○ instead of ƒ without it) and the page loads as
 * inert HTML — no language switch, no nav, nothing clickable. See
 * node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md's
 * "Forcing dynamic rendering" section.
 */
export const dynamic = "force-dynamic";

export default function NotFound() {
  return <NotFoundView />;
}
