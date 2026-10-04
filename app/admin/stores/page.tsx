import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getCities, getStoresForAdmin, getUserById } from "@/lib/db";
import type { StoreVerificationStatus } from "@/lib/types";
import { AdminStoresView, type AdminStoreRow } from "@/components/AdminStoresView";

export const metadata: Metadata = {
  title: "门店认证审批 | 店聘 DianPin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const VALID_STATUSES: StoreVerificationStatus[] = [
  "unverified",
  "pending",
  "verified",
  "rejected",
];

function parseStatus(value: string | undefined): StoreVerificationStatus | null {
  return VALID_STATUSES.includes(value as StoreVerificationStatus)
    ? (value as StoreVerificationStatus)
    : null;
}

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  // Default (no query param at all) is the actual queue — pending only.
  // "status=all" (the filter's "全部" option, L2's after-the-fact review
  // list) is the one explicit way to see every store regardless of
  // status; anything else that doesn't parse falls back to pending too.
  const currentStatus: StoreVerificationStatus | "all" =
    params.status === "all" ? "all" : (parseStatus(params.status) ?? "pending");
  const filterStatus = currentStatus === "all" ? undefined : currentStatus;

  const [stores, cities] = await Promise.all([
    getStoresForAdmin(filterStatus),
    getCities(),
  ]);

  const rows: AdminStoreRow[] = await Promise.all(
    stores.map(async (store) => ({
      store,
      owner: await getUserById(store.owner_user_id),
    }))
  );

  return (
    <AdminStoresView rows={rows} cities={cities} currentStatus={currentStatus} />
  );
}
