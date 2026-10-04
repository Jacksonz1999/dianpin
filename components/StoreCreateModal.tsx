"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createStoreAction } from "@/app/actions";
import type { City, StoreFormValues } from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { Modal } from "./Modal";

export function StoreCreateModal({
  open,
  onClose,
  cities,
}: {
  open: boolean;
  onClose: () => void;
  cities: City[];
}) {
  const { locale, t } = useLocale();
  const router = useRouter();

  const [value, setValue] = useState<StoreFormValues>({
    nameZh: "",
    nameEs: "",
    city: cities[0]?.id ?? "",
    district: "",
    address: "",
    category: "",
    coverImage: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (
      !value.nameZh.trim() ||
      !value.nameEs.trim() ||
      !value.city ||
      !value.district.trim() ||
      !value.address.trim() ||
      !value.category.trim()
    ) {
      setError(t("common.fillRequiredFields"));
      return;
    }
    setError(null);
    setSaving(true);
    // Empty is the honest state when no real photo exists yet (no upload
    // pipeline — WP5b) — StoreCoverImage.tsx renders a branded icon
    // fallback for "", never a broken-image icon. Do not default this to
    // a placeholder path; one that pointed at a file nobody ever added
    // was exactly how every seed store's cover image 404'd (see
    // lib/seed.ts's matching fix in this same round).
    const result = await createStoreAction({
      ...value,
      coverImage: value.coverImage.trim(),
    });
    setSaving(false);
    if (result.ok) {
      router.refresh();
      onClose();
    } else {
      setError(t(`store.error.${result.error}`));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("store.form.title")}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          {t("store.form.nameZh")}
          <input
            type="text"
            value={value.nameZh}
            onChange={(e) => setValue({ ...value, nameZh: e.target.value })}
            className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("store.form.nameEs")}
          <input
            type="text"
            value={value.nameEs}
            onChange={(e) => setValue({ ...value, nameEs: e.target.value })}
            className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("store.form.city")}
          <select
            value={value.city}
            onChange={(e) => setValue({ ...value, city: e.target.value })}
            className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === "es" ? c.name_es : c.name_zh}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("store.form.district")}
          <input
            type="text"
            value={value.district}
            onChange={(e) => setValue({ ...value, district: e.target.value })}
            className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("store.form.address")}
          <input
            type="text"
            value={value.address}
            onChange={(e) => setValue({ ...value, address: e.target.value })}
            className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("store.form.category")}
          <input
            type="text"
            value={value.category}
            onChange={(e) => setValue({ ...value, category: e.target.value })}
            placeholder={t("store.form.categoryPlaceholder")}
            className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("store.form.coverImage")}
          <input
            type="text"
            value={value.coverImage}
            onChange={(e) => setValue({ ...value, coverImage: e.target.value })}
            placeholder={t("store.form.coverImagePlaceholder")}
            className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="min-h-[44px] rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)] disabled:opacity-60"
        >
          {saving ? t("store.form.submitting") : t("store.form.submit")}
        </button>
      </div>
    </Modal>
  );
}
