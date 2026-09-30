"use client";

import type { User } from "@/lib/types";
import { LegalLinks } from "./LegalLinks";
import { useLocale } from "./LocaleProvider";
import { LogoutButton } from "./LogoutButton";

export function EmployerMeView({ user }: { user: User | null }) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{t("employer.me.title")}</h1>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-base font-medium">{user?.name ?? t("common.loading")}</p>
        {user && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {user.email ?? user.phone ?? t("me.profile.notSet")}
          </p>
        )}
      </div>

      <LogoutButton />
      <LegalLinks />
    </div>
  );
}
