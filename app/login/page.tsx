import { generateCaptcha } from "@/lib/auth/captcha";
import { LoginForm } from "@/components/LoginForm";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const captcha = generateCaptcha();
  const defaultRole: UserRole = params.role === "employer" ? "employer" : "seeker";

  return (
    <LoginForm
      captcha={captcha}
      defaultRole={defaultRole}
      nextPath={params.next ?? null}
      error={params.error ?? null}
    />
  );
}
