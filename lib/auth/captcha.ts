import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getAuthSecret } from "./session";

/**
 * Stateless math CAPTCHA: no server-side storage needed. `token` is an
 * HMAC of the correct answer (never the answer itself), so it can't be
 * read off the page — a client can only pass verification by submitting
 * the number that actually solves `question`.
 *
 * This is a deliberately lightweight v1 check (AGENTS.md §4 allows either
 * "图形验证码或 hCaptcha"); swap in hCaptcha/Turnstile before scaling if
 * abuse shows up.
 */
export interface MathCaptcha {
  question: string;
  token: string;
}

function signAnswer(answer: string): string {
  return createHmac("sha256", getAuthSecret())
    .update(answer.trim())
    .digest("base64url");
}

export function generateCaptcha(): MathCaptcha {
  const a = randomInt(1, 10);
  const b = randomInt(1, 10);
  return {
    question: `${a} + ${b}`,
    token: signAnswer(String(a + b)),
  };
}

export function verifyCaptcha(token: string, submittedAnswer: string): boolean {
  const expected = signAnswer(submittedAnswer);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
