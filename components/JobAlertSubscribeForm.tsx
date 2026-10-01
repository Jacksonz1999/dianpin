"use client";

import { useState } from "react";
import Link from "next/link";
import { subscribeJobAlertAction } from "@/app/actions";
import { useLocale } from "./LocaleProvider";

/**
 * "有新岗位通知我" (WP-B1). Rendered twice from JobsExplorer — once as a
 * persistent CTA below the filter sidebar, once (more prominently) inside
 * the empty-results state — both times with the caller's *current* filter
 * selections so the subscription matches what the visitor was already
 * looking for.
 */
export function JobAlertSubscribeForm({
  city,
  jobType,
  mealsIncluded,
  residenceOk,
  salaryMin,
  prominent = false,
}: {
  city: string;
  jobType: string;
  mealsIncluded: boolean;
  residenceOk: boolean;
  salaryMin: string;
  prominent?: boolean;
}) {
  const { locale, t } = useLocale();
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setStatus("submitting");
    const salaryMinNum = salaryMin ? Number(salaryMin) : null;
    const result = await subscribeJobAlertAction({
      email,
      honeypot,
      city: city || null,
      jobType: jobType || null,
      salaryMin: Number.isFinite(salaryMinNum) ? salaryMinNum : null,
      mealsIncluded,
      residenceOk,
      locale,
    });
    if (result.ok) {
      setStatus("success");
    } else {
      setStatus("idle");
      setError(t(`jobAlert.error.${result.error}`));
    }
  }

  if (status === "success") {
    return (
      <p
        className={
          "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm " +
          (prominent ? "text-center" : "")
        }
      >
        {t("jobAlert.success")}
      </p>
    );
  }

  return (
    <div
      className={
        "flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 " +
        (prominent ? "text-center" : "")
      }
    >
      <p className="text-sm font-medium">{t("jobAlert.title")}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{t("jobAlert.description")}</p>

      <div className={"flex gap-2 " + (prominent ? "flex-col sm:flex-row" : "flex-col")}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("jobAlert.emailPlaceholder")}
          aria-label={t("jobAlert.emailPlaceholder")}
          className="min-h-[44px] flex-1 rounded-full border border-[var(--color-border)] px-4 text-sm"
        />
        {/* Honeypot: mirrors components/LoginForm.tsx's anti-bot field. */}
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
        <button
          type="button"
          disabled={status === "submitting" || !email.trim()}
          onClick={handleSubmit}
          className="min-h-[44px] shrink-0 rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)] disabled:opacity-60"
        >
          {status === "submitting" ? t("jobAlert.subscribing") : t("jobAlert.subscribe")}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-xs text-[var(--color-text-muted)]">
        {t("jobAlert.noticePrefix")}{" "}
        <Link href="/privacy" className="underline">
          {t("legal.footer.privacy")}
        </Link>
        {t("jobAlert.noticeSuffix")}
      </p>
    </div>
  );
}
