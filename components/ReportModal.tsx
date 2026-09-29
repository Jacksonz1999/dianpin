"use client";

import { useState } from "react";
import { submitReportAction } from "@/app/actions";
import type { ReportTargetType } from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { Modal } from "./Modal";

const PRESET_REASONS = ["fake", "fraud", "duplicate", "other"] as const;

export function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
}: {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
}) {
  const { t } = useLocale();
  const [preset, setPreset] = useState<(typeof PRESET_REASONS)[number]>("fake");
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  async function handleSubmit() {
    setStatus("submitting");
    const reason = detail.trim()
      ? `${t(`report.reasonPreset.${preset}`)}: ${detail.trim()}`
      : t(`report.reasonPreset.${preset}`);
    await submitReportAction({ targetType, targetId, reason });
    setStatus("success");
  }

  return (
    <Modal open={open} onClose={onClose} title={t("report.title")}>
      {status === "success" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">{t("report.success")}</p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full bg-[var(--color-primary)] px-4 text-sm text-[var(--color-primary-text)]"
          >
            {t("common.close")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 text-sm">
            {t("report.reasonLabel")}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key)}
                  className={
                    "min-h-[36px] rounded-full px-3 text-sm " +
                    (preset === key
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
                      : "bg-[var(--color-bg)] text-[var(--color-text-muted)]")
                  }
                >
                  {t(`report.reasonPreset.${key}`)}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            {t("common.optional")}
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={t("report.reasonPlaceholder")}
              rows={3}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            disabled={status === "submitting"}
            onClick={handleSubmit}
            className="min-h-[44px] rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)] disabled:opacity-60"
          >
            {status === "submitting" ? t("report.submitting") : t("report.submit")}
          </button>
        </div>
      )}
    </Modal>
  );
}
