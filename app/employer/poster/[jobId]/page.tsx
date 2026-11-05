import { notFound } from "next/navigation";
import { getCityById, getJobById, getJobPosterMeta, getStoreById } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { sanitizePublicStore } from "@/lib/public-store";
import { PosterGenerator } from "@/components/PosterGenerator";

export const dynamic = "force-dynamic";

export default async function PosterPreviewPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  // Only the owning employer (or any employer) may preview the poster.
  await requireRole("employer");

  const { jobId } = await params;
  const job = await getJobById(jobId);
  if (!job) notFound();

  const posterMeta = await getJobPosterMeta(jobId);
  if (!posterMeta || posterMeta.source !== "poster") notFound();

  const [storeRow, city] = await Promise.all([
    getStoreById(job.store_id),
    getCityById(job.city),
  ]);
  if (!storeRow || !city) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">招聘告示已生成</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          点击「打印 / 保存为 PDF」导出 A4 海报，或将下方手机分享图长按保存后发到
          WhatsApp / 微信朋友圈。
        </p>
      </div>
      <PosterGenerator
        job={job}
        store={sanitizePublicStore(storeRow)}
        city={city}
        posterMeta={posterMeta}
      />
    </div>
  );
}
