import { getCities, getJobTypes } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PosterForm } from "@/components/PosterForm";

export const dynamic = "force-dynamic";

export default async function NewPosterPage() {
  // Guards wrong-role / logged-out (redirects to /login or /role-mismatch).
  await requireRole("employer");

  const [jobTypes, cities] = await Promise.all([getJobTypes(), getCities()]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">生成招聘告示</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          填写以下信息，一键生成可打印的招聘海报与扫码落地页（西班牙语 / 英语）。
        </p>
      </div>
      <PosterForm jobTypes={jobTypes} cities={cities} />
    </div>
  );
}
