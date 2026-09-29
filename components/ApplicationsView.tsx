"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { withdrawApplicationAction } from "@/app/actions";
import { canTransitionApplication } from "@/lib/status-machine";
import type { Application, ApplicationStatus, Job, Store } from "@/lib/types";
import { useLocale } from "./LocaleProvider";

export type ApplicationRow = {
  application: Application;
  job: Job | null;
  store: Store | null;
};

const STEP_KEYS: ApplicationStatus[] = ["submitted", "viewed", "contacted"];

function ApplicationTimeline({
  status,
  t,
}: {
  status: ApplicationStatus;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  if (status === "withdrawn") {
    return (
      <p className="rounded-lg bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
        {t("applications.withdrawnNotice")}
      </p>
    );
  }

  const isRejected = status === "rejected";
  const isFinal = status === "hired" || isRejected;
  const reachedIndex = isFinal ? STEP_KEYS.length : STEP_KEYS.indexOf(status);

  const nodes: { label: string; reached: boolean; isRejected: boolean }[] = [
    ...STEP_KEYS.map((key, i) => ({
      label: t(`applicationStatus.${key}`),
      reached: i <= reachedIndex,
      isRejected: false,
    })),
    {
      label: isFinal
        ? t(`applicationStatus.${status}`)
        : `${t("applicationStatus.hired")} / ${t("applicationStatus.rejected")}`,
      reached: isFinal,
      isRejected,
    },
  ];

  return (
    <div className="flex items-start">
      {nodes.map((node, i) => (
        <div
          key={i}
          className={
            "flex flex-col items-center gap-1 " +
            (i < nodes.length - 1 ? "flex-1" : "shrink-0")
          }
        >
          <div className="flex w-full items-center">
            <div
              className={
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium " +
                (node.reached
                  ? node.isRejected
                    ? "bg-red-500 text-white"
                    : "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
                  : "bg-[var(--color-bg)] text-[var(--color-text-muted)]")
              }
            >
              {i + 1}
            </div>
            {i < nodes.length - 1 && (
              <div
                className={
                  "h-0.5 flex-1 " +
                  (nodes[i + 1].reached
                    ? "bg-[var(--color-primary)]"
                    : "bg-[var(--color-border)]")
                }
              />
            )}
          </div>
          <span className="max-w-[64px] text-center text-[10px] leading-tight text-[var(--color-text-muted)]">
            {node.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ApplicationsView({ rows }: { rows: ApplicationRow[] }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  async function handleWithdraw(applicationId: string) {
    setWithdrawingId(applicationId);
    await withdrawApplicationAction(applicationId);
    setWithdrawingId(null);
    setConfirmingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{t("applications.title")}</h1>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
          {t("applications.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(({ application, job, store }) => {
            const canWithdraw = canTransitionApplication(
              application.status,
              "withdrawn"
            );
            return (
              <div
                key={application.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold">
                    {job ? (locale === "es" ? job.title_es : job.title_zh) : "—"}
                  </h3>
                </div>
                {store && (
                  <p className="-mt-2 text-sm text-[var(--color-text-muted)]">
                    {locale === "es" ? store.name_es : store.name_zh}
                  </p>
                )}

                <ApplicationTimeline status={application.status} t={t} />

                {application.message && (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {application.message}
                  </p>
                )}

                {canWithdraw && (
                  <div className="flex items-center justify-end gap-2">
                    {confirmingId === application.id ? (
                      <>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {t("applications.withdrawConfirm")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="min-h-[36px] rounded-full border border-[var(--color-border)] px-3 text-xs"
                        >
                          {t("common.cancel")}
                        </button>
                        <button
                          type="button"
                          disabled={withdrawingId === application.id}
                          onClick={() => handleWithdraw(application.id)}
                          className="min-h-[36px] rounded-full bg-red-500 px-3 text-xs text-white disabled:opacity-60"
                        >
                          {withdrawingId === application.id
                            ? t("applications.withdrawing")
                            : t("common.confirm")}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(application.id)}
                        className="min-h-[36px] rounded-full border border-[var(--color-border)] px-3 text-xs text-[var(--color-text-muted)]"
                      >
                        {t("applications.withdraw")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
