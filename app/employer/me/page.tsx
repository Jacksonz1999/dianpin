import { getUserById } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { EmployerMeView } from "@/components/EmployerMeView";

export const dynamic = "force-dynamic";

export default async function EmployerMePage() {
  const session = await requireRole("employer", "/employer/me");
  const user = await getUserById(session.userId);

  return <EmployerMeView user={user} />;
}
