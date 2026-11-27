import { getCities, getJobTypes } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { getRequestLocale } from "@/lib/locale-server";
import { t } from "@/lib/i18n";
import { localePath } from "@/lib/locale-routing";
import { PosterForm } from "@/components/PosterForm";

export const dynamic = "force-dynamic";

export default async function NewPosterPage() {
  // Guards wrong-role / logged-out (redirects to /login or /role-mismatch).
  await requireRole("employer");

  const [jobTypes, cities, locale] = await Promise.all([
    getJobTypes(),
    getCities(),
    getRequestLocale(),
  ]);

  const isZh = locale === "zh";
  const isEs = locale === "es";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-6">
      {/* Language entry (prompt 1.0): the owner picks their mother tongue. The
          rest of the flow is rendered entirely in that language — zero foreign
          text for the owner. */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--color-text-muted)]">
          {t(locale, "poster.langPrompt")}:
        </span>
        {/* Full-page locale navigation is intentional: the server must render
            URL, metadata and dictionary together. */}
        <a
          href={localePath("/employer/poster/new", "zh")}
          className={
            "rounded-full px-4 py-1.5 text-sm font-medium " +
            (isZh
              ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
              : "border border-[var(--color-border)]")
          }
        >
          {t(locale, "poster.langZh")}
        </a>
        <a
          href={localePath("/employer/poster/new", "es")}
          className={
            "rounded-full px-4 py-1.5 text-sm font-medium " +
            (isEs
              ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
              : "border border-[var(--color-border)]")
          }
        >
          Español
        </a>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">
          {t(locale, "poster.publish")}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {t(locale, "poster.pageSubtitle")}
        </p>
      </div>

      <PosterForm jobTypes={jobTypes} cities={cities} locale={locale} />
    </div>
  );
}
