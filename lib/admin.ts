import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/db";
import type { SessionPayload } from "@/lib/auth/session";

/**
 * There is no "admin" account role (AGENTS.md §6) — access to /admin is a
 * server-side email allowlist, not a role. ADMIN_EMAILS unset means the
 * list is empty, which means /admin is unreachable for everyone,
 * including its own operator — that's the intended fail-closed default,
 * not a bug to work around.
 */
function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Not-admin and not-logged-in both end the same way: notFound(), never a
 * redirect or 403. A redirect or 403 confirms the route exists to anyone
 * who tries it; 404 doesn't (AGENTS.md §6 / round 10 WP-L L1).
 *
 * Reads email via getUserById rather than the session cookie itself —
 * SessionPayload only carries userId/role/exp (lib/auth/session.ts), not
 * email. Every real account's email is reliably set: it's the identifier
 * the one working auth provider (email magic-link, AGENTS.md §4) signs
 * in with, written on account creation in app/auth/callback/route.ts.
 * Seed/demo users predate auth and may have a null email, but they also
 * have no way to hold a live session, so that gap can't reach here.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) notFound();

  const admins = getAdminEmails();
  const user = await getUserById(session.userId);
  const email = user?.email?.toLowerCase();
  if (!email || !admins.includes(email)) notFound();

  return session;
}
