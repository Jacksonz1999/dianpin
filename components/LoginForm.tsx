"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { requestLoginLinkAction } from "@/app/auth-actions";
import type { MathCaptcha } from "@/lib/auth/captcha";
import type { UserRole } from "@/lib/types";
import { LegalLinks } from "./LegalLinks";
import { useLocale } from "./LocaleProvider";

const RESEND_COOLDOWN_SECONDS = 30;
// Turnstile calls this by name once a visitor solves the challenge (see
// data-callback below) — has to be a real global, Turnstile's script
// invokes it outside React.
const TURNSTILE_CALLBACK_NAME = "__dianpinTurnstileCallback";

declare global {
  interface Window {
    [TURNSTILE_CALLBACK_NAME]?: (token: string) => void;
  }
}

export function LoginForm({
  captcha,
  defaultRole,
  nextPath,
  error,
  turnstileSiteKey,
  nonce,
}: {
  captcha: MathCaptcha;
  defaultRole: UserRole;
  nextPath: string | null;
  error: string | null;
  /** null when Turnstile isn't configured — falls back to the math captcha. */
  turnstileSiteKey: string | null;
  /** CSP nonce stamped by proxy.ts, needed for the Turnstile <Script> to run. */
  nonce: string | null;
}) {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    window[TURNSTILE_CALLBACK_NAME] = (token: string) => setTurnstileToken(token);
    return () => {
      delete window[TURNSTILE_CALLBACK_NAME];
    };
  }, [turnstileSiteKey]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  async function submit() {
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
      turnstileToken: turnstileSiteKey ? turnstileToken : undefined,
      honeypot,
    });
    if (result.ok) {
      setStatus("sent");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setStatus("idle");
      setFormError(t(`login.error.${result.error}`));
    }
  }

  function changeEmail() {
    setStatus("idle");
    setEmail("");
    setCaptchaAnswer("");
    setTurnstileToken("");
    setResendCooldown(0);
  }

  return (
    // This is a short form, not a content page — on desktop it should stay
    // a centered card instead of stretching to the page's full 3xl/6xl
    // width like the content-heavy pages (home/job/store) do.
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10">
      {turnstileSiteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          nonce={nonce ?? undefined}
        />
      )}

      <h1 className="text-lg font-semibold">{t("login.title")}</h1>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-[var(--color-bg)] px-3 py-2 text-sm text-red-600"
        >
          {t(`login.error.${error}`)}
        </p>
      )}

      {status === "sent" ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-lg bg-[var(--color-bg)] px-3 py-2 text-sm">
            {t("login.checkEmail", { email })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={resendCooldown > 0}
              onClick={submit}
              className="min-h-[44px] flex-1 rounded-full border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-muted)] disabled:opacity-60"
            >
              {resendCooldown > 0
                ? t("login.resendCountdown", { seconds: resendCooldown })
                : t("login.resend")}
            </button>
            <button
              type="button"
              onClick={changeEmail}
              className="min-h-[44px] flex-1 rounded-full border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-muted)]"
            >
              {t("login.changeEmail")}
            </button>
          </div>
        </div>
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
              aria-label={t("login.emailLabel")}
              className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
            />
          </label>

          {turnstileSiteKey ? (
            <div
              className="cf-turnstile"
              data-sitekey={turnstileSiteKey}
              data-callback={TURNSTILE_CALLBACK_NAME}
            />
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              {t("login.captchaLabel", { question: captcha.question })}
              <input
                type="text"
                inputMode="numeric"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                aria-label={t("login.captchaLabel", { question: captcha.question })}
                className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
              />
            </label>
          )}

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

          {formError && (
            <p role="alert" aria-live="polite" className="text-sm text-red-600">
              {formError}
            </p>
          )}

          <button
            type="button"
            disabled={status === "submitting"}
            onClick={submit}
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
