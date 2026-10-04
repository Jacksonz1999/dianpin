"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavTabs } from "@/lib/nav-tabs";
import { useLocale } from "./LocaleProvider";
import { useSessionRole } from "./SessionProvider";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();
  // WP-K (round 10): which Tab set to show is the account's role, not the
  // current path — pathname-based used to show an employer account
  // seeker tabs (and vice versa) whenever they weren't already under
  // /employer, and every one of those tabs bounced via requireRole. null
  // (not logged in) renders seeker tabs, same as before.
  const role = useSessionRole();
  const isEmployer = role === "employer";
  const tabs = getNavTabs(isEmployer, t);

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface)] md:hidden"
    >
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
