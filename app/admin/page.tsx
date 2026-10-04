import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** /admin has nothing of its own — requireAdmin() 404s a non-admin here too, before the redirect ever reveals /admin/stores exists. */
export default async function AdminPage() {
  await requireAdmin();
  redirect("/admin/stores");
}
