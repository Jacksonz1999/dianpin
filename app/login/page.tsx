import { generateCaptcha } from "@/lib/auth/captcha";
import { getTurnstileSiteKey, isTurnstileConfigured } from "@/lib/auth/turnstile";
import { LoginForm } from "@/components/LoginForm";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; next?: string; error?: string }>;
}) {
  const params = await searchParams;
  // Generated either way: if Turnstile isn't configured (no keys set yet —
  // e.g. local dev), the page falls back to the math captcha with zero
  // behavior change from before this env var existed.
  const captcha = generateCaptcha();
  const defaultRole: UserRole = params.role === "employer" ? "employer" : "seeker";

  return (
    <LoginForm
      captcha={captcha}
      defaultRole={defaultRole}
      nextPath={params.next ?? null}
      error={params.error ?? null}
      turnstileSiteKey={isTurnstileConfigured() ? getTurnstileSiteKey() : null}
    />
  );
}
