"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";
import { useLocale } from "./LocaleProvider";

export function NotFoundView() {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <SearchX
        className="h-12 w-12 text-[var(--color-text-muted)]"
        aria-hidden="true"
      />
      <h1 className="text-lg font-semibold">{t("notFound.title")}</h1>
      <p className="text-sm text-[var(--color-text-muted)]">
        {t("notFound.description")}
      </p>
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-primary-text)]"
      >
        {t("notFound.backHome")}
      </Link>
    </div>
  );
}
