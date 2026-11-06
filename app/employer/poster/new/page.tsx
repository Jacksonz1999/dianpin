import { getCities, getJobTypes } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { getRequestLocale } from "@/lib/locale-server";
import { type Locale } from "@/lib/i18n";
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

  const isEs = locale === "es";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-6">
      {/* Language entry (prompt 1.0): the owner picks their mother tongue. The
          rest of the flow is rendered entirely in that language — zero foreign
          text for the owner. */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--color-text-muted)]">
          {isEs ? "Idioma:" : "语言:"}
        </span>
        <a
          href="/employer/poster/new"
          className={
            "rounded-full px-4 py-1.5 text-sm font-medium " +
            (!isEs
              ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
              : "border border-[var(--color-border)]")
          }
        >
          中文
        </a>
        <a
          href="/es/employer/poster/new"
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
          {isEs ? "Crear anuncio de empleo" : "生成招聘告示"}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {isEs
            ? "Escribe como si fuera un papel en la puerta. Nosotros hacemos el resto."
            : "像平时写纸条一样写几句招人话，剩下的交给系统。"}
        </p>
      </div>

      <PosterForm jobTypes={jobTypes} cities={cities} locale={locale as Locale} />
    </div>
  );
}
