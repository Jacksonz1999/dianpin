import { getDemoEmployerId, getUserById } from "@/lib/db";
import { EmployerMeView } from "@/components/EmployerMeView";

export const dynamic = "force-dynamic";

export default async function EmployerMePage() {
  const employerId = await getDemoEmployerId();
  const user = await getUserById(employerId);

  return <EmployerMeView user={user} />;
}
