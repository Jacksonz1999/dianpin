"use client";

import { useLocale } from "./LocaleProvider";

// Fixed build-time constant, not `new Date()` — that call resolves the
// runtime's default Intl locale, which differs between the Node SSR
// process and the browser (e.g. "en-US" vs "zh-CN"), producing two
// different strings for the same render and triggering React hydration
// error #418. Bump this date by hand whenever these pages' copy changes.
const LAST_UPDATED = "2026-10-01";

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
 */
export function LegalPageView({
  page,
  sections,
}: {
  page: "privacy" | "terms" | "legal";
  sections: string[];
}) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{t(`legal.${page}.title`)}</h1>
      <p className="text-xs text-[var(--color-text-muted)]">
        {t("legal.lastUpdated", { date: LAST_UPDATED })}
      </p>
      <p className="rounded-lg bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
        {t("legal.placeholderNotice")}
      </p>

      {sections.map((id) => (
        <section key={id} className="flex flex-col gap-1.5">
          <h2 className="text-base font-medium">
            {t(`legal.${page}.section.${id}.heading`)}
          </h2>
          <SectionBody text={t(`legal.${page}.section.${id}.body`)} />
        </section>
      ))}
    </div>
  );
}
