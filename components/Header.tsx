"use client";

import { useLocale } from "./LocaleProvider";

export function Header() {
  const { locale, setLocale, t } = useLocale();

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-[560px] items-center justify-between px-4 py-3">
        <span className="text-base font-semibold">{t("app.name")}</span>
        <button
          type="button"
          onClick={() => setLocale(locale === "zh" ? "es" : "zh")}
          className="min-h-[44px] rounded-full border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-muted)]"
        >
          {t("common.languageSwitch")}
        </button>
      </div>
    </header>
  );
}
