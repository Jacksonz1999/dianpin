/**
 * Same fallback app/auth-actions.ts already uses for magic links: only
 * needs to be set in production (see AGENTS.md §7 / .env.example).
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
