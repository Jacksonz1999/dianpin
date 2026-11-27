"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminReviewReportAction } from "@/app/actions";
import type { AdminReportRow, ReportStatus } from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { LocaleLink } from "./LocaleLink";
import { AdminNav } from "./AdminNav";

const FILTER_VALUES: (ReportStatus | "all")[] = [
  "pending",
  "resolved",
  "dismissed",
  "all",
];

function ReportRow({ row }: { row: AdminReportRow }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [acting, setActing] = useState<"resolved" | "dismissed" | null>(null);
  const { report } = row;
  const targetTitle = locale === "es" ? row.targetTitleEs : row.targetTitleZh;

  async function handleReview(nextStatus: "resolved" | "dismissed") {
    setActing(nextStatus);
    await adminReviewReportAction(report.id, nextStatus);
    setActing(null);
    router.refresh();
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {t(`report.targetType.${report.target_type}`)}
          </p>
          <LocaleLink href={row.targetHref} className="text-sm font-semibold underline underline-offset-2">
            {targetTitle ?? t("admin.reports.targetMissing")}
          </LocaleLink>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-bg)] px-2 py-1 text-xs">
          {t(`reportStatus.${report.status}`)}
        </span>
      </div>

      <div className="rounded-lg bg-[var(--color-bg)] p-3 text-sm">
        <span className="text-xs text-[var(--color-text-muted)]">
          {t("admin.reports.reasonLabel")}
        </span>
        <p className="mt-1 whitespace-pre-wrap">{report.reason}</p>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        {t("admin.reports.reporterLabel")}：{row.reporterName ?? "—"}
        {row.reporterEmail ? ` · ${row.reporterEmail}` : ""}
      </p>

      {report.status === "pending" && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={acting !== null}
            onClick={() => handleReview("resolved")}
            className="min-h-[44px] flex-1 rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)] disabled:opacity-60"
          >
            {t("admin.reports.markResolved")}
          </button>
          <button
            type="button"
            disabled={acting !== null}
            onClick={() => handleReview("dismissed")}
            className="min-h-[44px] flex-1 rounded-full border border-[var(--color-border)] px-4 text-sm disabled:opacity-60"
          >
            {t("admin.reports.markDismissed")}
          </button>
        </div>
      )}
    </article>
  );
}

export function AdminReportsView({
  rows,
  currentStatus,
}: {
  rows: AdminReportRow[];
  currentStatus: ReportStatus | "all";
}) {
  const { t, href } = useLocale();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <AdminNav />
      <h1 className="text-lg font-semibold">{t("admin.reports.title")}</h1>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.reports.filterLabel")}
        <select
          value={currentStatus}
          onChange={(event) =>
            router.push(href(`/admin/reports?status=${event.target.value}`))
          }
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        >
          {FILTER_VALUES.map((value) => (
            <option key={value} value={value}>
              {value === "all" ? t("admin.reports.statusAll") : t(`reportStatus.${value}`)}
            </option>
          ))}
        </select>
      </label>

      <p className="text-sm text-[var(--color-text-muted)]">
        {t("admin.reports.resultsCount", { count: rows.length })}
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
          {t("admin.reports.empty")}
        </div>
      ) : (
        rows.map((row) => <ReportRow key={row.report.id} row={row} />)
      )}
    </div>
  );
}
