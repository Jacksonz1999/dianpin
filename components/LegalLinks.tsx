"use client";

import { useLocale } from "./LocaleProvider";
import { LocaleLink } from "./LocaleLink";

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
      <LocaleLink href="/about" className="underline underline-offset-2">
        {t("legal.footer.about")}
      </LocaleLink>
      <LocaleLink href="/privacy" className="underline underline-offset-2">
        {t("legal.footer.privacy")}
      </LocaleLink>
      <LocaleLink href="/terms" className="underline underline-offset-2">
        {t("legal.footer.terms")}
      </LocaleLink>
      <LocaleLink href="/legal" className="underline underline-offset-2">
        {t("legal.footer.legal")}
      </LocaleLink>
    </nav>
  );
}
