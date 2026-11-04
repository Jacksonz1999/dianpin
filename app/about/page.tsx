import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { localizedMetadata } from "@/lib/seo";

// Nonce-based CSP needs this page rendered per request.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return localizedMetadata({
    title: `${t(locale, "about.title")} | 店聘 DianPin`,
    description: t(locale, "about.body1"),
    path: "/about",
    locale,
  });
}

export default async function AboutPage() {
  const locale = await getRequestLocale();
  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{t(locale, "about.title")}</h1>
      <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
        {t(locale, "about.body1")}
      </p>
      <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
        {t(locale, "about.body2")}
      </p>
    </div>
  );
}
