"use client";

import { useLocale } from "@/components/LocaleProvider";

export default function EmployerNewJobPage() {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{t("employer.post.title")}</h1>
      <p className="text-sm text-[var(--color-text-muted)]">{t("common.comingSoon")}</p>
    </div>
  );
}
