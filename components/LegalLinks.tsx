"use client";

import Link from "next/link";
import { useLocale } from "./LocaleProvider";

/**
 * Compact legal-page link row. This app has no traditional page footer
 * (the bottom tab bar occupies that space on a mobile-first layout), so
 * this goes wherever a footer link would otherwise live: below the login
 * form, and on the /me "profile/settings" screens.
 */
export function LegalLinks() {
  const { t } = useLocale();

  return (
    <nav className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-2 text-center text-xs text-[var(--color-text-muted)]">
      <Link href="/privacy" className="underline underline-offset-2">
        {t("legal.footer.privacy")}
      </Link>
      <Link href="/terms" className="underline underline-offset-2">
        {t("legal.footer.terms")}
      </Link>
      <Link href="/legal" className="underline underline-offset-2">
        {t("legal.footer.legal")}
      </Link>
    </nav>
  );
}
