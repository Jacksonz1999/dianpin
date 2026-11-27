import { getApplicationRowsBySeeker } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { ApplicationsView } from "@/components/ApplicationsView";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const session = await requireRole("seeker", "/me/applications");
  const rows = await getApplicationRowsBySeeker(session.userId);

  return <ApplicationsView rows={rows} />;
}
