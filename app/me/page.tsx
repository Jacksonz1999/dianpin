import { getDemoSeekerId, getUserById } from "@/lib/db";
import { MeView } from "@/components/MeView";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const seekerId = await getDemoSeekerId();
  const user = await getUserById(seekerId);

  return <MeView user={user} />;
}
