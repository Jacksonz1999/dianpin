/**
 * Cloudflare Turnstile — optional upgrade from the math CAPTCHA in
 * lib/auth/captcha.ts. Gated on both env vars being set, mirroring how
 * lib/auth/providers/index.ts picks a channel by env var: no keys
 * configured (e.g. local dev, or before someone creates a Turnstile site
 * in the Cloudflare dashboard) means the math CAPTCHA keeps working
 * exactly as before — this never becomes a hard dependency that breaks
 * login when unconfigured.
 */
export function isTurnstileConfigured(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET && process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY
  );
}

export function getTurnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY ?? null;
}

interface TurnstileSiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp: string | null
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret || !token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== "unknown") {
    body.set("remoteip", remoteIp);
  }

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as TurnstileSiteverifyResponse;
    return data.success === true;
  } catch (err) {
    console.error("[auth] Turnstile verification request failed:", err);
    return false;
  }
}
