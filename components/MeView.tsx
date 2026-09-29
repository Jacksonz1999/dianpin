"use client";

import Link from "next/link";
import type { User } from "@/lib/types";
import { useLocale } from "./LocaleProvider";

export function MeView({ user }: { user: User | null }) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{t("me.title")}</h1>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-base font-medium">{user?.name ?? t("common.loading")}</p>
        {user && (
          <p className="text-sm text-[var(--color-text-muted)]">{user.phone}</p>
        )}
      </div>

      <p className="text-sm text-[var(--color-text-muted)]">{t("common.comingSoon")}</p>

      <Link
        href="/employer"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--color-border)] px-4 text-sm"
      >
        {t("me.roleSwitch")}
      </Link>
    </div>
  );
}
