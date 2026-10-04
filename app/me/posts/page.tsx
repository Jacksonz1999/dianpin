import { getCities, getJobTypes, getSeekerPostsByUser } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { MyPostsView } from "@/components/MyPostsView";

export const dynamic = "force-dynamic";

export default async function MyPostsPage() {
  const session = await requireRole("seeker", "/me/posts");
  const [posts, jobTypes, cities] = await Promise.all([
    getSeekerPostsByUser(session.userId),
    getJobTypes(),
    getCities(),
  ]);

  return <MyPostsView posts={posts} jobTypes={jobTypes} cities={cities} />;
}
