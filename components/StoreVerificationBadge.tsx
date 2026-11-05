"use client";

import type { StoreVerificationStatus } from "@/lib/types";
import { useLocale } from "./LocaleProvider";

const STATUS_STYLE: Record<StoreVerificationStatus, string> = {
  // Audy phase-1 UI3: 已认证 = 绿勾；认证中 / 未认证 = 灰蓝（进行中）；
  // 认证未通过 = 红。杜绝「橙=认证中」与「红/橙=未通过」混淆——所以
  // pending 与 unverified 统一用灰蓝，绝不出现橙色。
  verified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-sky-50 text-sky-700 ring-sky-200",
  unverified: "bg-sky-50 text-sky-700 ring-sky-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
};

/**
 * Audit P0-4: unverified/rejected stores used to render no label at all, so
 * they looked identical to a verified one and the badge lost all meaning.
 * Every store now gets an explicit status; the rating/review sections are
 * additionally hidden for rejected stores at the page level.
 */
export function StoreVerificationBadge({
  status,
  className = "",
}: {
  status: StoreVerificationStatus;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ${STATUS_STYLE[status]} ${className}`}
    >
      {status === "verified" ? `✓ ${t(`verificationStatus.${status}`)}` : t(`verificationStatus.${status}`)}
    </span>
  );
}
