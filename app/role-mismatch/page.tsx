import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/types";
import { RoleMismatchView } from "@/components/RoleMismatchView";

export const dynamic = "force-dynamic";

function parseRole(value: string | undefined): UserRole | null {
  return value === "seeker" || value === "employer" ? value : null;
}

/**
 * Landing page for lib/auth/session.ts's requireRole when a logged-in
 * account hits a page meant for the other role (WP-K, round 10 —
 * replaces the old home-page banner, which a user could miss and then
 * just click the same dead-end link again). No requireSession() here:
 * without a live session there's nothing to explain, so that case just
 * goes home instead of showing a confusing page about an account that
 * doesn't exist.
 */
export default async function RoleMismatchPage({
  searchParams,
}: {
  searchParams: Promise<{ needed?: string; have?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const needed = parseRole(params.needed);
  const have = session?.role ?? parseRole(params.have);

  if (!session || !needed || !have) {
    redirect("/");
  }

  return <RoleMismatchView needed={needed} have={have} />;
}
