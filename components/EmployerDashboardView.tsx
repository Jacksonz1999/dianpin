"use client";

import type { Job, Store } from "@/lib/types";
import { useLocale } from "./LocaleProvider";

export type StoreWithJobs = { store: Store; jobs: Job[] };

export function EmployerDashboardView({ groups }: { groups: StoreWithJobs[] }) {
  const { locale, t } = useLocale();

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{t("employer.dashboard.title")}</h1>

      {groups.map(({ store, jobs }) => (
        <div key={store.id} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">
              {locale === "es" ? store.name_es : store.name_zh}
            </h2>
            <span className="rounded-full bg-[var(--color-bg)] px-2 py-1 text-xs">
              {t(`verificationStatus.${store.verification_status}`)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <span className="text-sm">
                  {locale === "es" ? job.title_es : job.title_zh}
                </span>
                <span className="rounded-full bg-[var(--color-bg)] px-2 py-1 text-xs">
                  {t(`jobStatus.${job.status}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-sm text-[var(--color-text-muted)]">{t("common.comingSoon")}</p>
    </div>
  );
}
