import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  consumeAuthChallenge,
  getAuthChallengeById,
  incrementChallengeAttempts,
} from "@/lib/auth/db";
import { sanitizeNextPath } from "@/lib/auth/next-path";
import { createSession } from "@/lib/auth/session";
import { createUser, getUserByEmail } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";

const MAX_VERIFY_ATTEMPTS = 5;

/**
 * The magic link the seeker/employer clicks from their email. GET because
 * it's a plain link, not a form submit — Route Handler (not a page) so we
 * can set the session cookie and redirect in one response.
 *
 * Every redirect target here is built from getSiteUrl(), never from
 * request.nextUrl.origin: on Railway, standalone Next.js sees the raw
 * socket it's bound to (0.0.0.0:8080 inside the container) rather than
 * the public Host header the edge proxy received, so origin-derived
 * redirects sent real users to http://0.0.0.0:8080/... instead of
 * https://dianpin.eu/... — confirmed in production once email delivery
 * actually started working (see the Resend migration PR). getSiteUrl()
 * reads NEXT_PUBLIC_SITE_URL instead, which is how every other absolute
 * URL in this app (the magic link itself, canonical/og tags, sitemap) is
 * already built — see lib/site-url.ts.
 */
export async function GET(request: NextRequest) {
  const challengeId = request.nextUrl.searchParams.get("challenge");
  const code = request.nextUrl.searchParams.get("code");
  const origin = getSiteUrl();

  if (!challengeId || !code) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", origin));
  }

  const challenge = await getAuthChallengeById(challengeId);
  if (!challenge) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", origin));
  }
  if (challenge.consumed_at) {
    return NextResponse.redirect(new URL("/login?error=already_used", origin));
  }
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/login?error=expired", origin));
  }
  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    return NextResponse.redirect(
      new URL("/login?error=too_many_attempts", origin)
    );
  }

  const codeHash = createHash("sha256").update(code).digest("hex");
  if (codeHash !== challenge.code_hash) {
    await incrementChallengeAttempts(challengeId);
    return NextResponse.redirect(new URL("/login?error=invalid_link", origin));
  }

  await consumeAuthChallenge(challengeId);

  // Existing identifier -> log in as whatever role they actually have,
  // never the role requested this time (that's only for brand-new
  // accounts). New identifier -> create the account with the role picked
  // on /login, captured server-side in the challenge at request time.
  let user = await getUserByEmail(challenge.identifier);
  if (!user) {
    user = await createUser({
      role: challenge.intended_role,
      email: challenge.identifier,
      name: challenge.identifier.split("@")[0],
      locale: "zh",
    });
  }

  await createSession(user.id, user.role);

  const nextPath =
    sanitizeNextPath(challenge.next_path) ??
    (user.role === "employer" ? "/employer" : "/me");
  return NextResponse.redirect(new URL(nextPath, origin));
}
