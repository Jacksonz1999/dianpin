"use client";

import { useLocale } from "./LocaleProvider";

/**
 * "跳到主要内容" (WP-J3, round 9). Visually hidden until focused (see
 * .skip-link in app/globals.css) — the first Tab stop lets a keyboard
 * user skip Header's nav links and jump straight to #main.
 */
export function SkipLink() {
  const { t } = useLocale();

  return (
    <a
      href="#main"
      className="skip-link rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-text)]"
    >
      {t("common.skipToContent")}
    </a>
  );
}
