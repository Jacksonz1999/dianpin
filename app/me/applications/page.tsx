"use client";

import { useEffect, useState } from "react";
import {
  getApplicationsBySeeker,
  getDemoSeekerId,
  getJobById,
  getStoreById,
} from "@/lib/db";
import type { Application, Job, Store } from "@/lib/types";
import { useLocale } from "@/components/LocaleProvider";

type Row = { application: Application; job: Job | null; store: Store | null };

export default function ApplicationsPage() {
  const { locale, t } = useLocale();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const seekerId = await getDemoSeekerId();
      const applications = await getApplicationsBySeeker(seekerId);
      const enriched = await Promise.all(
        applications.map(async (application) => {
          const job = await getJobById(application.job_id);
          const store = job ? await getStoreById(job.store_id) : null;
          return { application, job, store };
        })
      );
      if (!cancelled) setRows(enriched);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{t("applications.title")}</h1>

      {!rows ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
          {t("applications.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(({ application, job, store }) => (
            <div
              key={application.id}
              className="flex flex-col gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold">
                  {job ? (locale === "es" ? job.title_es : job.title_zh) : "—"}
                </h3>
                <span className="shrink-0 rounded-full bg-[var(--color-bg)] px-2 py-1 text-xs">
                  {t(`applicationStatus.${application.status}`)}
                </span>
              </div>
              {store && (
                <p className="text-sm text-[var(--color-text-muted)]">
                  {locale === "es" ? store.name_es : store.name_zh}
                </p>
              )}
              <p className="text-sm">{application.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
