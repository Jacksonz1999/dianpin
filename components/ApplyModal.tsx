"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { applyToJob, type ApplyToJobResult } from "@/app/actions";
import type { Job, JobType, SeekerProfileFormValues } from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { Modal } from "./Modal";
import { SeekerProfileForm } from "./SeekerProfileForm";

export function ApplyModal({
  open,
  onClose,
  job,
  jobTypes,
  hasProfile,
  initialProfileValues,
}: {
  open: boolean;
  onClose: () => void;
  job: Job;
  jobTypes: JobType[];
  hasProfile: boolean;
  initialProfileValues: SeekerProfileFormValues;
}) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfileValues);
  const [editingProfile, setEditingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const jobTitle = locale === "es" ? job.title_es : job.title_zh;
  // hasProfile prefills from seeker_profiles so a returning seeker never
  // has to re-type it (B2) — editingProfile lets them still change it for
  // this one application without forcing that on every applicant.
  const showProfileForm = !hasProfile || editingProfile;

  async function handleSubmit() {
    if (showProfileForm) {
      if (!profile.name.trim() || !profile.phone.trim()) {
        setError(`${t("profile.name")} / ${t("profile.contact")}`);
        return;
      }
      if (profile.jobTypes.length === 0) {
        setError(t("profile.selectAtLeastOneJobType"));
        return;
      }
    }

    setError(null);
    setStatus("submitting");
    const result: ApplyToJobResult = await applyToJob({
      jobId: job.id,
      message,
      profile: showProfileForm ? profile : undefined,
    });

    if (result.ok) {
      setStatus("success");
      router.refresh();
    } else {
      setStatus("idle");
      setError(t(`apply.error.${result.error}`));
    }
  }

  // Soft nudge after a successful apply if the profile submitted (or
  // already on file) is still missing fields beyond the bare minimum —
  // never blocks anything, just a one-line suggestion (B2).
  const profileIncomplete =
    !profile.experienceYears &&
    !profile.availableFrom &&
    !profile.residenceStatus &&
    !profile.expectedSalaryMin;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t("apply.title")} · ${jobTitle}`}
    >
      {status === "success" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">{t("apply.success")}</p>
          {profileIncomplete && (
            <p className="rounded-lg bg-[var(--color-bg)] p-2 text-xs text-[var(--color-text-muted)]">
              {t("apply.completeProfileNudge")}{" "}
              <Link href="/me" className="underline">
                {t("apply.completeProfileCta")}
              </Link>
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full bg-[var(--color-primary)] px-4 text-sm text-[var(--color-primary-text)]"
          >
            {t("apply.close")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {!hasProfile ? (
            <>
              <p className="rounded-lg bg-[var(--color-bg)] p-2 text-xs text-[var(--color-text-muted)]">
                {t("apply.firstTimeNotice")}
              </p>
              <SeekerProfileForm
                jobTypes={jobTypes}
                value={profile}
                onChange={setProfile}
              />
            </>
          ) : editingProfile ? (
            <SeekerProfileForm
              jobTypes={jobTypes}
              value={profile}
              onChange={setProfile}
            />
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-bg)] p-2 text-xs text-[var(--color-text-muted)]">
              <span>
                {t("apply.profileSummary", { name: profile.name, phone: profile.phone })}
              </span>
              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                className="shrink-0 underline"
              >
                {t("apply.editProfileCta")}
              </button>
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm">
            {t("apply.messageLabel")}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("apply.messagePlaceholder")}
              rows={3}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            disabled={status === "submitting"}
            onClick={handleSubmit}
            className="min-h-[44px] rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)] disabled:opacity-60"
          >
            {status === "submitting" ? t("apply.submitting") : t("apply.submit")}
          </button>
        </div>
      )}
    </Modal>
  );
}
