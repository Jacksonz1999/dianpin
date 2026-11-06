import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCities,
  getCityById,
  getJobTypes,
  getJobs,
  getStores,
} from "@/lib/db";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { localePath } from "@/lib/locale-routing";
import { sanitizePublicStore } from "@/lib/public-store";
import {
  breadcrumbJsonLd,
  cityMetadata,
  cityStructuredData,
  jsonLdScriptContent,
} from "@/lib/seo";
import { JobsExplorer } from "@/components/JobsExplorer";

// Same build-time-DB constraint as every other DB-backed route here.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: cityId } = await params;
  const [locale, city, cityJobs] = await Promise.all([
    getRequestLocale(),
    getCityById(cityId),
    getJobs({ status: "active", city: cityId }),
  ]);
  if (!city) return {};
  // A city landing with no live jobs is a thin page — don't let it into the
  // index (SEO denoise, phase-2 section 3).
  return cityMetadata(city, locale, { noindex: cityJobs.length === 0 });
}

export default async function CityJobsPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: cityId } = await params;
  const [locale, city, cities, jobTypes, jobs, allStores] = await Promise.all([
    getRequestLocale(),
    getCityById(cityId),
    getCities(),
    getJobTypes(),
    getJobs({ status: "active", city: cityId }),
    getStores(),
  ]);
  if (!city) notFound();

  const cityName = locale === "es" ? city.name_es : city.name_zh;
  const stores = allStores.map(sanitizePublicStore);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScriptContent(
            cityStructuredData(city, locale, jobs)
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScriptContent(
            breadcrumbJsonLd([
              { name: t(locale, "breadcrumb.home"), url: localePath("/", locale) },
              {
                name: t(locale, "cityPage.title", { city: cityName }),
                url: localePath(`/jobs/${city.id}`, locale),
              },
            ])
          ),
        }}
      />
      <div className="flex flex-col gap-1 px-4 pt-4">
        <h1 className="text-lg font-semibold">
          {t(locale, "cityPage.title", { city: cityName })}
        </h1>
        <Link
          href={localePath("/", locale)}
          className="text-xs text-[var(--color-text-muted)] underline underline-offset-2"
        >
          {t(locale, "cityPage.backHome")}
        </Link>
      </div>
      <Suspense>
        <JobsExplorer
          initialJobs={jobs}
          cities={cities}
          jobTypes={jobTypes}
          stores={stores}
          initialCity={cityId}
          basePath={`/jobs/${cityId}`}
        />
      </Suspense>
    </>
  );
}
