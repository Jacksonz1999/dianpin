"use client";

import { logoutAction } from "@/app/auth-actions";
import { useLocale } from "./LocaleProvider";

export function LogoutButton() {
  const { t } = useLocale();

  return (
    <button
      type="button"
      onClick={() => logoutAction()}
      className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--color-border)] px-4 text-sm text-[var(--color-text-muted)]"
    >
      {t("me.logout")}
    </button>
  );
}
