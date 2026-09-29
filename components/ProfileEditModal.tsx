"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveProfileAction } from "@/app/actions";
import type { JobType, SeekerProfileFormValues } from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { Modal } from "./Modal";
import { SeekerProfileForm } from "./SeekerProfileForm";

export function ProfileEditModal({
  open,
  onClose,
  jobTypes,
  initialValues,
}: {
  open: boolean;
  onClose: () => void;
  jobTypes: JobType[];
  initialValues: SeekerProfileFormValues;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!value.name.trim() || !value.phone.trim()) {
      setError(`${t("profile.name")} / ${t("profile.contact")}`);
      return;
    }
    if (value.jobTypes.length === 0) {
      setError(t("profile.selectAtLeastOneJobType"));
      return;
    }
    setError(null);
    setSaving(true);
    await saveProfileAction(value);
    setSaving(false);
    router.refresh();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("me.profile.editCta")}>
      <div className="flex flex-col gap-3">
        <SeekerProfileForm jobTypes={jobTypes} value={value} onChange={setValue} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="min-h-[44px] rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)] disabled:opacity-60"
        >
          {saving ? t("profile.saving") : t("profile.save")}
        </button>
      </div>
    </Modal>
  );
}
