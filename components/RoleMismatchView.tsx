"use client";

import Link from "next/link";
import type { UserRole } from "@/lib/types";
import { useLocale } from "./LocaleProvider";

function roleLabelKey(role: UserRole): string {
  return role === "employer" ? "login.roleEmployer" : "login.roleSeeker";
}

export function RoleMismatchView({
  needed,
  have,
}: {
  needed: UserRole;
  have: UserRole;
}) {
  const { t } = useLocale();
  const haveLabel = t(roleLabelKey(have));
  const neededLabel = t(roleLabelKey(needed));

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-lg font-semibold">{t("roleMismatch.title")}</h1>
      <p className="max-w-sm text-sm text-[var(--color-text-muted)]">
        {t("roleMismatch.body", { have: haveLabel, needed: neededLabel })}
      </p>
      <Link
        href={`/login?role=${needed}`}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-primary-text)]"
      >
        {t("roleMismatch.cta.register", { needed: neededLabel })}
      </Link>
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--color-border)] px-5 text-sm text-[var(--color-text-muted)]"
      >
        {t("roleMismatch.cta.backHome")}
      </Link>
    </div>
  );
}
