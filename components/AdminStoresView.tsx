"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminReviewStoreAction } from "@/app/actions";
import type { City, Store, StoreVerificationStatus, User } from "@/lib/types";
import { useLocale } from "./LocaleProvider";

export type AdminStoreRow = {
  store: Store;
  owner: User | null;
};

const FILTER_VALUES: (StoreVerificationStatus | "all")[] = [
  "pending",
  "unverified",
  "verified",
  "rejected",
  "all",
];

function StoreRow({ row, cityName }: { row: AdminStoreRow; cityName: string }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const { store, owner } = row;
  const [acting, setActing] = useState<"verified" | "rejected" | null>(null);

  async function handleReview(next: "verified" | "rejected") {
    setActing(next);
    await adminReviewStoreAction(store.id, next);
    setActing(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold">
          {locale === "es" ? store.name_es : store.name_zh}
        </span>
        <span className="shrink-0 rounded-full bg-[var(--color-bg)] px-2 py-1 text-xs">
          {t(`verificationStatus.${store.verification_status}`)}
        </span>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        {cityName} {store.district} · {store.category}
      </p>
      <p className="text-xs text-[var(--color-text-muted)]">{store.address}</p>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--color-bg)] p-3 text-xs">
        <div>
          <span className="text-[var(--color-text-muted)]">
            {t("admin.stores.ownerLabel")}
          </span>
          <p className="font-medium">{owner?.name ?? t("admin.stores.notSet")}</p>
        </div>
        <div>
          <span className="text-[var(--color-text-muted)]">
            {t("admin.stores.phoneLabel")}
          </span>
          <p className="font-medium">{owner?.phone ?? t("admin.stores.notSet")}</p>
        </div>
        <div className="col-span-2">
          <span className="text-[var(--color-text-muted)]">
            {t("admin.stores.createdAtLabel")}
          </span>
          <p className="font-medium">{store.created_at.slice(0, 10)}</p>
        </div>
      </div>

      {store.verification_status === "pending" && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={acting !== null}
            onClick={() => handleReview("verified")}
            className="min-h-[44px] flex-1 rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)] disabled:opacity-60"
          >
            {t("admin.stores.approve")}
          </button>
          <button
            type="button"
            disabled={acting !== null}
            onClick={() => handleReview("rejected")}
            className="min-h-[44px] flex-1 rounded-full border border-[var(--color-border)] px-4 text-sm disabled:opacity-60"
          >
            {t("admin.stores.reject")}
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminStoresView({
  rows,
  cities,
  currentStatus,
}: {
  rows: AdminStoreRow[];
  cities: City[];
  currentStatus: StoreVerificationStatus | "all";
}) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const citiesById = new Map(cities.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{t("admin.stores.title")}</h1>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.stores.filterLabel")}
        <select
          value={currentStatus}
          onChange={(e) => router.push(`/admin/stores?status=${e.target.value}`)}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        >
          {FILTER_VALUES.map((value) => (
            <option key={value} value={value}>
              {value === "all" ? t("admin.stores.statusAll") : t(`verificationStatus.${value}`)}
            </option>
          ))}
        </select>
      </label>

      <p className="text-sm text-[var(--color-text-muted)]">
        {t("admin.stores.resultsCount", { count: rows.length })}
      </p>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("admin.stores.empty")}
          </p>
        </div>
      ) : (
        rows.map((row) => {
          const city = citiesById.get(row.store.city);
          const cityName = city ? (locale === "es" ? city.name_es : city.name_zh) : row.store.city;
          return <StoreRow key={row.store.id} row={row} cityName={cityName} />;
        })
      )}
    </div>
  );
}
