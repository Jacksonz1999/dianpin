import { Suspense } from "react";
import Link from "next/link";
import { getCities, getJobTypes, getJobs, getStores } from "@/lib/db";
import { JobsExplorer } from "@/components/JobsExplorer";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { localePath } from "@/lib/locale-routing";
import { sanitizePublicStore } from "@/lib/public-store";
import {
  homeStructuredData,
  jsonLdScriptContent,
} from "@/lib/seo";

// Job listings change at runtime (new posts, status changes) — render on
// every request instead of freezing a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [locale, cities, jobTypes, jobs, allStores] = await Promise.all([
    getRequestLocale(),
    getCities(),
    getJobTypes(),
    getJobs({ status: "active" }),
    getStores(),
  ]);

  // Audit P1-1: only public store fields reach the RSC payload. No
  // owner_user_id / verified_at / is_seed / created_at on a public page.
  const stores = allStores.map(sanitizePublicStore);

  return (
    <>
      {/* Audit P1-2: Organization + WebSite/SearchAction + ItemList. The
          SearchAction target uses the real ?q= filter parameter. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScriptContent(homeStructuredData(locale, jobs)),
        }}
      />
      {/* JobsExplorer reads useSearchParams() (J4, round 9: filters sync to
          the URL so a filtered view is shareable) — Next requires a Suspense
          boundary around any client component that does, even under
          force-dynamic. No fallback UI needed: this resolves in the same
          tick on the client, nothing is actually suspended. */}
      {/* Internal links into the city landing pages (audit P0-7 follow-up):
          "马德里中餐馆招聘" style queries now have a crawlable destination. */}
      <nav className="flex flex-wrap gap-2 px-4 pt-3">
        {cities
          .filter((c) => jobs.some((j) => j.city === c.id))
          .map((c) => (
            <Link
              key={c.id}
              href={localePath(`/jobs/${c.id}`, locale)}
              className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]"
            >
              {t(locale, "cityPage.title", {
                city: locale === "es" ? c.name_es : c.name_zh,
              })}
            </Link>
          ))}
      </nav>
      <Suspense>
        <JobsExplorer
          initialJobs={jobs}
          cities={cities}
          jobTypes={jobTypes}
          stores={stores}
        />
      </Suspense>
    </>
  );
}
