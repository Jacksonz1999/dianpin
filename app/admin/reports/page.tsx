import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getReportRowsForAdmin } from "@/lib/db";
import { getRequestLocale } from "@/lib/locale-server";
import { t } from "@/lib/i18n";
import type { ReportStatus } from "@/lib/types";
import { AdminReportsView } from "@/components/AdminReportsView";

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
  const rows = await getReportRowsForAdmin(
    currentStatus === "all" ? undefined : currentStatus
  );

  return <AdminReportsView rows={rows} currentStatus={currentStatus} />;
}
