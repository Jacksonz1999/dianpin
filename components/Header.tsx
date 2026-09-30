"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavTabs } from "@/lib/nav-tabs";
import { useLocale } from "./LocaleProvider";

export function Header() {
  const { locale, setLocale, t } = useLocale();
  const pathname = usePathname();
  const isEmployer = pathname.startsWith("/employer");
  const tabs = getNavTabs(isEmployer, t);

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Matches the outer wrapper's breakpoints in app/layout.tsx so this
          bar's content lines up with the page content below it. */}
      <div className="mx-auto flex max-w-[560px] items-center justify-between px-4 py-3 md:max-w-3xl lg:max-w-6xl lg:px-6">
        <Link
          href={isEmployer ? "/employer" : "/"}
          className="flex items-center gap-2.5"
        >
          <svg
            viewBox="0 0 64 64"
            className="h-7 w-7 shrink-0 text-[var(--color-primary)]"
            aria-hidden="true"
          >
            <g fill="currentColor">
              <rect x="14" y="14" width="36" height="6" rx="1.5" />
              <circle cx="18.5" cy="20" r="4.5" />
              <circle cx="27.5" cy="20" r="4.5" />
              <circle cx="36.5" cy="20" r="4.5" />
              <circle cx="45.5" cy="20" r="4.5" />
            </g>
            <path
              d="M22 41 29 48 42 34.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-base font-semibold">{t("app.name")}</span>
          <span
            className="hidden border-l border-[var(--color-border)] pl-2.5 text-[10px] tracking-[0.14em] text-[var(--color-text-muted)] md:inline"
          >
            DIANPIN
          </span>
        </Link>

        {/* Below md, BottomNav (components/BottomNav.tsx) is the nav surface. */}
        <nav className="hidden items-center gap-1 md:flex">
          {tabs.map((tab) => {
            const active =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={
                  "rounded-full px-3 py-2 text-sm " +
                  (active
                    ? "font-medium text-[var(--color-primary)]"
                    : "text-[var(--color-text-muted)]")
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

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
