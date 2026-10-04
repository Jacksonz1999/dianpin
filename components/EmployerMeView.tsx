"use client";

import Link from "next/link";
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

      {/* Symmetric to MeView.tsx's "我是店主" entry — an employer account
          can't actually apply as a seeker (single role per account, see
          AGENTS.md §6's note on this), but can still browse /job listings
          signed out of the employer section. */}
      <Link
        href="/"
        className="flex min-h-[44px] items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm"
      >
        <span className="font-medium">{t("employer.me.seekerExitTitle")}</span>
        <span className="shrink-0 text-[var(--color-primary)]">
          {t("nav.seekerExit")} →
        </span>
      </Link>

      <LogoutButton />
      <LegalLinks />
    </div>
  );
}
