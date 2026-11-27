"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "./LocaleProvider";
import { LocaleLink } from "./LocaleLink";

export function AdminNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const items = [
    { href: "/admin/stores", label: t("admin.nav.stores") },
    { href: "/admin/reports", label: t("admin.nav.reports") },
  ];

  return (
    <nav className="flex gap-2" aria-label={t("admin.nav.label")}>
      {items.map((item) => {
        const active = pathname.endsWith(item.href);
        return (
          <LocaleLink
            key={item.href}
            href={item.href}
            className={
              "inline-flex min-h-[44px] items-center rounded-full px-4 text-sm " +
              (active
                ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
                : "border border-[var(--color-border)] text-[var(--color-text-muted)]")
            }
          >
            {item.label}
          </LocaleLink>
        );
      })}
    </nav>
  );
}
