"use server";

import { randomBytes, createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  countRecentChallenges,
  createAuthChallenge,
} from "@/lib/auth/db";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { sanitizeNextPath } from "@/lib/auth/next-path";
import { clearSession } from "@/lib/auth/session";
import { getAuthProvider } from "@/lib/auth/providers";
import type { UserRole } from "@/lib/types";

const CHALLENGE_TTL_MINUTES = 15;
const MAX_PER_IDENTIFIER_PER_WINDOW = 3;
const IDENTIFIER_WINDOW_MINUTES = 15;
const MAX_PER_IP_PER_WINDOW = 10;
const IP_WINDOW_MINUTES = 60;

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
  /** Hidden field real users never fill; non-empty means a bot. */
  honeypot: string;
}): Promise<RequestLoginLinkResult> {
  if (input.honeypot.trim().length > 0) {
    // Pretend success so the bot doesn't learn the honeypot gave it away.
    return { ok: true };
  }

  if (!verifyCaptcha(input.captchaToken, input.captchaAnswer)) {
    return { ok: false, error: "captcha_failed" };
  }

  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  const ip = await getClientIp();

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const verifyUrl = `${siteUrl}/auth/callback?challenge=${challenge.id}&code=${rawCode}`;

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
