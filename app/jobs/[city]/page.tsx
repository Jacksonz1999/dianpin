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
  const [locale, city] = await Promise.all([
    getRequestLocale(),
    getCityById(cityId),
  ]);
  if (!city) return {};
  return cityMetadata(city, locale);
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
