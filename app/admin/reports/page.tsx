import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import {
  getJobById,
  getReportsForAdmin,
  getStoreById,
  getUserById,
} from "@/lib/db";
import { getRequestLocale } from "@/lib/locale-server";
import { t } from "@/lib/i18n";
import type { ReportStatus } from "@/lib/types";
import { AdminReportsView, type AdminReportRow } from "@/components/AdminReportsView";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: t(locale, "admin.reports.title"),
    robots: { index: false, follow: false },
  };
}

function parseStatus(value: string | undefined): ReportStatus | null {
  return value === "pending" || value === "resolved" || value === "dismissed"
    ? value
    : null;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const currentStatus: ReportStatus | "all" =
    params.status === "all" ? "all" : (parseStatus(params.status) ?? "pending");
  const reports = await getReportsForAdmin(
    currentStatus === "all" ? undefined : currentStatus
  );

  const rows: AdminReportRow[] = await Promise.all(
    reports.map(async (report) => {
      const [reporter, target] = await Promise.all([
        getUserById(report.reporter_user_id),
        report.target_type === "job"
          ? getJobById(report.target_id)
          : getStoreById(report.target_id),
      ]);
      return {
        report,
        reporterName: reporter?.name ?? null,
        reporterEmail: reporter?.email ?? null,
        targetTitleZh:
          target && "title_zh" in target ? target.title_zh : target?.name_zh ?? null,
        targetTitleEs:
          target && "title_es" in target ? target.title_es : target?.name_es ?? null,
        targetHref: `/${report.target_type}/${report.target_id}`,
      };
    })
  );

  return <AdminReportsView rows={rows} currentStatus={currentStatus} />;
}
