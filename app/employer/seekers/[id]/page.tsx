import { notFound } from "next/navigation";
import {
  getCityById,
  getJobTypeById,
  getSeekerPostById,
  incrementSeekerPostViews,
} from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { SeekerPostDetailView } from "@/components/SeekerPostDetailView";

export const dynamic = "force-dynamic";

export default async function SeekerPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const isEmployer = session?.role === "employer";

  const post = await getSeekerPostById(id, { revealContact: isEmployer });
  if (!post) notFound();

  void incrementSeekerPostViews(post.id).catch((err) => {
    console.error(`[employer/seekers/${post.id}] failed to increment views:`, err);
  });

  const [city, jobType] = await Promise.all([
    getCityById(post.city),
    getJobTypeById(post.job_type),
  ]);
  if (!city || !jobType) notFound();

  return (
    <SeekerPostDetailView
      post={post}
      city={city}
      jobType={jobType}
      isLoggedInEmployer={isEmployer}
    />
  );
}
