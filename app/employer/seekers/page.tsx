import { getCities, getJobTypes, getSeekerPosts } from "@/lib/db";
import { SeekerPostsExplorer } from "@/components/SeekerPostsExplorer";

export const dynamic = "force-dynamic";

// No requireRole here, by design: browsing stays login-free for
// conversion/SEO, same as /job/[id] (AGENTS.md §6) — only the detail
// page's contact fields are gated, see app/employer/seekers/[id]/page.tsx.
export default async function EmployerSeekersPage() {
  const [posts, cities, jobTypes] = await Promise.all([
    getSeekerPosts({ status: "active" }),
    getCities(),
    getJobTypes(),
  ]);

  return <SeekerPostsExplorer initialPosts={posts} cities={cities} jobTypes={jobTypes} />;
}
