import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCityById,
  getJobTypes,
  getJobsByStore,
  getReviewsByStore,
  getStoreById,
  getUserById,
} from "@/lib/db";
import { isJobLive } from "@/lib/job-utils";
import { getRequestLocale } from "@/lib/locale-server";
import { sanitizePublicStore, looksLikeTestStore } from "@/lib/public-store";
import {
  jsonLdScriptContent,
  storeMetadata,
  storeStructuredData,
} from "@/lib/seo";
import { StoreDetailView } from "@/components/StoreDetailView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [locale, store] = await Promise.all([
    getRequestLocale(),
    getStoreById(id),
  ]);
  if (!store) return {};

  const city = await getCityById(store.city);
  if (!city) return {};

  return storeMetadata(sanitizePublicStore(store), city, locale, {
    noindex:
      store.verification_status === "rejected" || looksLikeTestStore(store),
  });
}

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [locale, storeRow] = await Promise.all([
    getRequestLocale(),
    getStoreById(id),
  ]);
  if (!storeRow) notFound();

  const [city, allJobs, reviews, jobTypes] = await Promise.all([
    getCityById(storeRow.city),
    getJobsByStore(storeRow.id),
    getReviewsByStore(storeRow.id),
    getJobTypes(),
  ]);
  if (!city) notFound();

  const store = sanitizePublicStore(storeRow);
  // Audit P0-3: the store page used to filter only on status, so an expired
  // job stayed visible and clickable here too.
  const activeJobs = allJobs.filter(isJobLive);
  // Audit P0-4: a rejected store keeps its (real) job supply but loses the
  // trust signals it failed to earn — no rating, no reviews, no
  // aggregateRating in structured data.
  const showReviews = store.verification_status !== "rejected";

  const reviewRows = showReviews
    ? await Promise.all(
        reviews.map(async (review) => ({
          review,
          reviewerName: (await getUserById(review.seeker_user_id))?.name ?? "—",
        }))
      )
    : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScriptContent(
            storeStructuredData(store, city, locale)
          ),
        }}
      />
      <StoreDetailView
        store={store}
        city={city}
        jobs={activeJobs}
        jobTypes={jobTypes}
        reviewRows={reviewRows}
        showReviews={showReviews}
      />
    </>
  );
}
