"use server";

import { randomBytes, createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  countRecentChallenges,
  createAuthChallenge,
  getLatestActiveChallenge,
} from "@/lib/auth/db";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { sanitizeNextPath } from "@/lib/auth/next-path";
import { clearSession } from "@/lib/auth/session";
import { getAuthProvider } from "@/lib/auth/providers";
import { getSiteUrl } from "@/lib/site-url";
import { isTurnstileConfigured, verifyTurnstileToken } from "@/lib/auth/turnstile";
import type { UserRole } from "@/lib/types";

const CHALLENGE_TTL_MINUTES = 15;
const MAX_PER_IDENTIFIER_PER_WINDOW = 3;
const IDENTIFIER_WINDOW_MINUTES = 15;
const MAX_PER_IP_PER_WINDOW = 10;
const IP_WINDOW_MINUTES = 60;
// A double form submit, a browser back-button resend, or someone tapping
// "send link" twice shouldn't mint a second token and fire a second
// email while the first one is still fresh — cheap to dedupe and it
// protects the sending domain's reputation for free. The raw code itself
// can't be "reused" for a real resend (only its hash is ever persisted,
// by design — see createAuthChallenge), so within this window we just
// skip sending again rather than resend the same link.
const RESEND_DEDUP_SECONDS = 60;

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export type RequestLoginLinkResult =
  | { ok: true }
  | {
      ok: false;
      error: "rate_limited" | "captcha_failed" | "invalid_email" | "unknown";
    };

/**
 * Rate limiting (per identifier + per IP) and the CAPTCHA check both run
 * before anything gets sent, per AGENTS.md §4's anti SMS-pumping /
 * email-bombing requirement — this is the one place abuse would show up
 * since it's the only unauthenticated write path in the whole app.
 */
export async function requestLoginLinkAction(input: {
  email: string;
  role: UserRole;
  nextPath: string | null;
  captchaToken: string;
  captchaAnswer: string;
  /** Cloudflare Turnstile response token — only used/required when
   * TURNSTILE_SECRET + NEXT_PUBLIC_TURNSTILE_SITEKEY are both set. */
  turnstileToken?: string;
  /** Hidden field real users never fill; non-empty means a bot. */
  honeypot: string;
}): Promise<RequestLoginLinkResult> {
  if (input.honeypot.trim().length > 0) {
    // Pretend success so the bot doesn't learn the honeypot gave it away.
    return { ok: true };
  }

  const ip = await getClientIp();

  // Server decides which check applies based on its own env config, never
  // on anything the client claims — a client can't opt out of Turnstile
  // by pretending it's using the math captcha instead once Turnstile is
  // actually configured, and vice versa.
  if (isTurnstileConfigured()) {
    if (!(await verifyTurnstileToken(input.turnstileToken ?? "", ip))) {
      return { ok: false, error: "captcha_failed" };
    }
  } else if (!verifyCaptcha(input.captchaToken, input.captchaAnswer)) {
    return { ok: false, error: "captcha_failed" };
  }

  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  const recentChallenge = await getLatestActiveChallenge(email, "email");
  if (
    recentChallenge &&
    Date.now() - new Date(recentChallenge.created_at).getTime() <
      RESEND_DEDUP_SECONDS * 1000
  ) {
    // A still-valid link went out moments ago — tell the caller it
    // "succeeded" (same as a real send) without minting or emailing a
    // second one.
    return { ok: true };
  }

  const [byIdentifier, byIp] = await Promise.all([
    countRecentChallenges({
      identifier: email,
      sinceMinutesAgo: IDENTIFIER_WINDOW_MINUTES,
    }),
    countRecentChallenges({ ip, sinceMinutesAgo: IP_WINDOW_MINUTES }),
  ]);
  if (
    byIdentifier >= MAX_PER_IDENTIFIER_PER_WINDOW ||
    byIp >= MAX_PER_IP_PER_WINDOW
  ) {
    return { ok: false, error: "rate_limited" };
  }

  const rawCode = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + CHALLENGE_TTL_MINUTES * 60_000
  ).toISOString();

  const challenge = await createAuthChallenge({
    channel: "email",
    identifier: email,
    codeHash: hashCode(rawCode),
    intendedRole: input.role,
    nextPath: sanitizeNextPath(input.nextPath),
    ip,
    expiresAt,
  });

  const verifyUrl = `${getSiteUrl()}/auth/callback?challenge=${challenge.id}&code=${rawCode}`;

  try {
    await getAuthProvider().deliverCode({
      identifier: email,
      code: rawCode,
      verifyUrl,
    });
  } catch (err) {
    console.error("[auth] failed to deliver login code:", err);
    return { ok: false, error: "unknown" };
  }

  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/");
}
