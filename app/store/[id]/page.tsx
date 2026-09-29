import { notFound } from "next/navigation";
import {
  getCityById,
  getJobTypes,
  getJobsByStore,
  getReviewsByStore,
  getStoreById,
  getUserById,
} from "@/lib/db";
import { StoreDetailView } from "@/components/StoreDetailView";

export const dynamic = "force-dynamic";

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await getStoreById(id);
  if (!store) notFound();

  const [city, allJobs, reviews, jobTypes] = await Promise.all([
    getCityById(store.city),
    getJobsByStore(store.id),
    getReviewsByStore(store.id),
    getJobTypes(),
  ]);
  if (!city) notFound();

  const activeJobs = allJobs.filter((job) => job.status === "active");

  const reviewRows = await Promise.all(
    reviews.map(async (review) => ({
      review,
      reviewerName: (await getUserById(review.seeker_user_id))?.name ?? "—",
    }))
  );

  return (
    <StoreDetailView
      store={store}
      city={city}
      jobs={activeJobs}
      jobTypes={jobTypes}
      reviewRows={reviewRows}
    />
  );
}
