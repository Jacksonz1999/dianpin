import {
  getDemoSeekerId,
  getJobTypes,
  getSeekerProfileByUserId,
  getUserById,
} from "@/lib/db";
import { MeView } from "@/components/MeView";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const seekerId = await getDemoSeekerId();
  const [user, profile, jobTypes] = await Promise.all([
    getUserById(seekerId),
    getSeekerProfileByUserId(seekerId),
    getJobTypes(),
  ]);

  return <MeView user={user} profile={profile} jobTypes={jobTypes} />;
}
