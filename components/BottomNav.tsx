"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { ClipboardIcon, PlusIcon, SearchIcon, SendIcon, UserIcon } from "./icons";
import { useLocale } from "./LocaleProvider";

type Tab = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const isEmployer = pathname.startsWith("/employer");

  const tabs: Tab[] = isEmployer
    ? [
        { href: "/employer", label: t("nav.employer.dashboard"), Icon: ClipboardIcon },
        { href: "/employer/new", label: t("nav.employer.post"), Icon: PlusIcon },
        { href: "/employer/me", label: t("nav.employer.me"), Icon: UserIcon },
      ]
    : [
        { href: "/", label: t("nav.seeker.jobs"), Icon: SearchIcon },
        { href: "/me/applications", label: t("nav.seeker.applications"), Icon: SendIcon },
        { href: "/me", label: t("nav.seeker.me"), Icon: UserIcon },
      ];

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-[560px] items-stretch justify-around">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.Icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs"
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span
                className={
                  active
                    ? "font-medium text-[var(--color-primary)]"
                    : "text-[var(--color-text-muted)]"
                }
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
