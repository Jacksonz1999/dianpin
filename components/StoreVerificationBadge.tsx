"use client";

import type { StoreVerificationStatus } from "@/lib/types";
import { useLocale } from "./LocaleProvider";

const STATUS_STYLE: Record<StoreVerificationStatus, string> = {
  verified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  unverified: "bg-[var(--color-bg)] text-[var(--color-text-muted)] ring-[var(--color-border)]",
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
