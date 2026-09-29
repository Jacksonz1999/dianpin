import {
  getJobTypes,
  getSeekerProfileByUserId,
  getUserById,
} from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { MeView } from "@/components/MeView";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await requireRole("seeker", "/me");
  const [user, profile, jobTypes] = await Promise.all([
    getUserById(session.userId),
    getSeekerProfileByUserId(session.userId),
    getJobTypes(),
  ]);

  return <MeView user={user} profile={profile} jobTypes={jobTypes} />;
}
