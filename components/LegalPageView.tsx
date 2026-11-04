"use client";

import type { LegalIdentityVars } from "@/lib/legal";
import { useLocale } from "./LocaleProvider";

// Fixed build-time constant, not `new Date()` — that call resolves the
// runtime's default Intl locale, which differs between the Node SSR
// process and the browser (e.g. "en-US" vs "zh-CN"), producing two
// different strings for the same render and triggering React hydration
// error #418. Bump this date by hand whenever these pages' copy changes.
const LAST_UPDATED = "2026-11-04";

function SectionBody({ text }: { text: string }) {
  return (
    <>
      {text.split("\n\n").map((paragraph, i) => (
        <p key={i} className="text-sm leading-relaxed text-[var(--color-text-muted)]">
          {paragraph}
        </p>
      ))}
    </>
  );
}

/**
 * Shared renderer for /privacy, /terms and /legal. `page` picks the
 * `legal.<page>.*` keys in lib/i18n.ts; `sections` lists which
 * `legal.<page>.section.<id>.{heading,body}` pairs to render, in order.
 *
 * Audit P0-2: the "⚠️ 本页为合规草稿" banner has been removed. Telling every
 * visitor the privacy policy is a draft is worse than an unfilled field.
 * Real entity data is supplied by the operator via LEGAL_* env vars
 * (lib/legal.ts); nothing here is invented on their behalf.
 */
export function LegalPageView({
  page,
  sections,
  identity,
}: {
  page: "privacy" | "terms" | "legal";
  sections: string[];
  /** Resolved server-side — non-NEXT_PUBLIC env vars are unavailable in the client bundle. */
  identity: LegalIdentityVars;
}) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{t(`legal.${page}.title`)}</h1>
      <p className="text-xs text-[var(--color-text-muted)]">
        {t("legal.lastUpdated", { date: LAST_UPDATED })}
      </p>

      {sections.map((id) => (
        <section key={id} className="flex flex-col gap-1.5">
          <h2 className="text-base font-medium">
            {t(`legal.${page}.section.${id}.heading`)}
          </h2>
          <SectionBody
            text={t(`legal.${page}.section.${id}.body`, identity)}
          />
        </section>
      ))}
    </div>
  );
}
