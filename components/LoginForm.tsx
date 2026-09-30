"use client";

import { useState } from "react";
import { requestLoginLinkAction } from "@/app/auth-actions";
import type { MathCaptcha } from "@/lib/auth/captcha";
import type { UserRole } from "@/lib/types";
import { LegalLinks } from "./LegalLinks";
import { useLocale } from "./LocaleProvider";

export function LoginForm({
  captcha,
  defaultRole,
  nextPath,
  error,
}: {
  captcha: MathCaptcha;
  defaultRole: UserRole;
  nextPath: string | null;
  error: string | null;
}) {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim()) {
      setFormError(t("login.emailRequired"));
      return;
    }
    setFormError(null);
    setStatus("submitting");
    const result = await requestLoginLinkAction({
      email,
      role,
      nextPath,
      captchaToken: captcha.token,
      captchaAnswer,
      honeypot,
    });
    if (result.ok) {
      setStatus("sent");
    } else {
      setStatus("idle");
      setFormError(t(`login.error.${result.error}`));
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-10">
      <h1 className="text-lg font-semibold">{t("login.title")}</h1>

      {error && (
        <p className="rounded-lg bg-[var(--color-bg)] px-3 py-2 text-sm text-red-600">
          {t(`login.error.${error}`)}
        </p>
      )}

      {status === "sent" ? (
        <p className="rounded-lg bg-[var(--color-bg)] px-3 py-2 text-sm">
          {t("login.checkEmail", { email })}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole("seeker")}
              className={
                "min-h-[44px] flex-1 rounded-full border px-3 text-sm " +
                (role === "seeker"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-text)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)]")
              }
            >
              {t("login.roleSeeker")}
            </button>
            <button
              type="button"
              onClick={() => setRole("employer")}
              className={
                "min-h-[44px] flex-1 rounded-full border px-3 text-sm " +
                (role === "employer"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-text)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)]")
              }
            >
              {t("login.roleEmployer")}
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {t("login.roleHint")}
          </p>

          <label className="flex flex-col gap-1 text-sm">
            {t("login.emailLabel")}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            {t("login.captchaLabel", { question: captcha.question })}
            <input
              type="text"
              inputMode="numeric"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
            />
          </label>

          {/* Honeypot: hidden from real users, bots that fill every visible input give themselves away. */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="pointer-events-none absolute h-0 w-0 opacity-0"
          />

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <button
            type="button"
            disabled={status === "submitting"}
            onClick={handleSubmit}
            className="min-h-[44px] rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)] disabled:opacity-60"
          >
            {status === "submitting" ? t("login.sending") : t("login.sendLink")}
          </button>
        </div>
      )}

      <LegalLinks />
    </div>
  );
}
