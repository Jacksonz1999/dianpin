import type { Metadata } from "next";
import { t, type Locale } from "./i18n";
import type { City, Job, PublicStore } from "./types";
import { absUrl, getSiteUrl } from "./site-url";
import { localePath, normalizePath } from "./locale-routing";

export const SITE_NAME = "店聘 DianPin";

/**
 * job.description_zh/es is employer-entered free text (see
 * JobFormValues), so it must be treated as untrusted when embedding into
 * a <script type="application/ld+json"> via dangerouslySetInnerHTML.
 * JSON.stringify alone doesn't escape "<", so a description containing
 * literally "</script>" would close the script tag early and let
 * whatever HTML follows it execute. Escaping "<" (and "&"/U+2028/U+2029
 * for the same class of parser-confusion reasons) as \uXXXX neutralizes
 * that without changing the JSON value itself.
 */
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

export function jsonLdScriptContent(data: unknown): string {
  return JSON.stringify(data)
    .split("<").join("\\u003c")
    .split("&").join("\\u0026")
    .split(LINE_SEPARATOR).join("\\u2028")
    .split(PARAGRAPH_SEPARATOR).join("\\u2029");
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function pick(locale: Locale, zh: string, es: string): string {
  return locale === "es" ? es || zh : zh || es;
}

/**
 * Audit P0-7: canonical + hreflang are URL-driven now. Chinese keeps the
 * original root URLs (no migration of already-ranked pages); Spanish uses
 * /es/… and points its canonical at itself, so Google no longer discards
 * the Spanish version as duplicate content.
 */
export function localeAlternates(
  path: string,
  locale: Locale
): Metadata["alternates"] {
  const zhUrl = absUrl(normalizePath(path));
  const esUrl = absUrl(localePath(path, "es"));
  return {
    canonical: locale === "es" ? esUrl : zhUrl,
    languages: {
      "zh-CN": zhUrl,
      "es-ES": esUrl,
      "x-default": zhUrl,
    },
  };
}

export function localizedMetadata(input: {
  title: string;
  description: string;
  path: string;
  locale: Locale;
  robots?: Metadata["robots"];
}): Metadata {
  const { title, description, path, locale, robots } = input;
  const url = absUrl(localePath(path, locale));
  return {
    title,
    description,
    alternates: localeAlternates(path, locale),
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: locale === "es" ? "es_ES" : "zh_CN",
    },
    twitter: { card: "summary", title, description },
    ...(robots ? { robots } : {}),
  };
}

export function homeMetadata(locale: Locale = "zh"): Metadata {
  return localizedMetadata({
    title: t(locale, "seo.home.title"),
    description: t(locale, "seo.home.description"),
    path: "/",
    locale,
  });
}

export function jobMetadata(
  job: Job,
  store: PublicStore,
  city: City,
  locale: Locale = "zh",
  options: { expired?: boolean } = {}
): Metadata {
  const title = job.title_zh || job.title_es;
  const storeName = store.name_zh || store.name_es;
  const cityName = pick(locale, city.name_zh, city.name_es);
  const localizedTitle = pick(locale, job.title_zh, job.title_es);
  const localizedStore = pick(locale, store.name_zh, store.name_es);
  const description = truncate(
    pick(locale, job.description_zh, job.description_es).trim() ||
      t(locale, "seo.job.descriptionFallback", {
        store: localizedStore,
        title: localizedTitle,
        city: cityName,
        district: job.district,
      }),
    155
  );

  return localizedMetadata({
    title: t(locale, "seo.job.title", {
      title: localizedTitle || title,
      store: localizedStore || storeName,
      city: cityName,
    }),
    description,
    path: `/job/${job.id}`,
    locale,
    // Expired JobPosting pages must not stay in the Jobs index (P0-3).
    robots: options.expired ? { index: false, follow: true } : undefined,
  });
}

export function storeMetadata(
  store: PublicStore,
  city: City,
  locale: Locale = "zh",
  options: { noindex?: boolean } = {}
): Metadata {
  const storeName = pick(locale, store.name_zh, store.name_es);
  const cityName = pick(locale, city.name_zh, city.name_es);
  return localizedMetadata({
    title: t(locale, "seo.store.title", {
      store: storeName,
      city: cityName,
    }),
    description: truncate(
      t(locale, "seo.store.description", {
        store: storeName,
        category: store.category,
        city: cityName,
        district: store.district,
      }),
      155
    ),
    path: `/store/${store.id}`,
    locale,
    // Audit P0-4 / phase-2 section 1.1: a store that failed verification must
    // not be indexable — otherwise Google keeps serving its LocalBusiness card
    // while the UI tells visitors it isn't trusted. noindex + the visual
    // downgrade keep it reachable but un-promoted.
    robots: options.noindex ? { index: false, follow: false } : undefined,
  });
}

/**
 * schema.org JobPosting structured data for Google Jobs. Fields map only
 * to data the page actually shows — no employmentType, since the schema
 * has no field for it and guessing risks looking like cloaking/spam per
 * Google's structured-data guidelines. jobLocation.address.addressCountry
 * is hardcoded "ES": every store on this platform is in Spain (AGENTS.md
 * §1), there's no country column to read it from.
 */
export function jobPostingJsonLd(
  job: Job,
  store: PublicStore,
  city: City,
  locale: Locale = "zh"
): Record<string, unknown> {
  const url = absUrl(localePath(`/job/${job.id}`, locale));
  const storeUrl = absUrl(localePath(`/store/${store.id}`, locale));

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: pick(locale, job.title_zh, job.title_es),
    description:
      pick(locale, job.description_zh, job.description_es).trim() ||
      pick(locale, job.title_zh, job.title_es),
    identifier: {
      "@type": "PropertyValue",
      name: SITE_NAME,
      value: job.id,
    },
    datePosted: job.published_at,
    hiringOrganization: {
      "@type": "Organization",
      name: pick(locale, store.name_zh, store.name_es),
      sameAs: storeUrl,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: store.address,
        addressLocality: pick(locale, city.name_zh, city.name_es),
        addressRegion: city.region,
        addressCountry: "ES",
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "EUR",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salary_min,
        maxValue: job.salary_max,
        unitText: job.salary_period.toUpperCase(),
      },
    },
    url,
  };

  // Only include validThrough when the job actually has an expiry — the
  // UI doesn't show one when it's unset, so fabricating a date here would
  // violate Google's "must match visible content" requirement.
  if (job.expires_at) {
    jsonLd.validThrough = job.expires_at;
  }

  return jsonLd;
}

/**
 * Audit P1-2: the home page is the most important entity page and had zero
 * structured data. SearchAction targets the real `?q=` filter parameter
 * that components/JobsExplorer.tsx already reads, so it isn't a fabricated
 * endpoint. ItemList links to every live job URL currently rendered.
 */
export function homeStructuredData(
  locale: Locale,
  jobs: Job[]
): Record<string, unknown> {
  const homeUrl = absUrl(localePath("/", locale));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${getSiteUrl()}/#organization`,
        name: SITE_NAME,
        url: getSiteUrl(),
        logo: absUrl("/icon.svg"),
      },
      {
        "@type": "WebSite",
        "@id": `${getSiteUrl()}/#website`,
        url: getSiteUrl(),
        name: SITE_NAME,
        inLanguage: locale === "es" ? "es-ES" : "zh-CN",
        publisher: { "@id": `${getSiteUrl()}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${homeUrl}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "ItemList",
        name: t(locale, "seo.itemList.name"),
        numberOfItems: jobs.length,
        itemListElement: jobs.map((job, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: pick(locale, job.title_zh, job.title_es),
          url: absUrl(localePath(`/job/${job.id}`, locale)),
        })),
      },
    ],
  };
}

/** Audit P0-7 follow-up: /jobs/<city> landing pages for local search intent. */
export function cityMetadata(
  city: City,
  locale: Locale = "zh"
): Metadata {
  const cityName = pick(locale, city.name_zh, city.name_es);
  return localizedMetadata({
    title: t(locale, "seo.city.title", { city: cityName }),
    description: t(locale, "seo.city.description", { city: cityName }),
    path: `/jobs/${city.id}`,
    locale,
  });
}

export function cityStructuredData(
  city: City,
  locale: Locale,
  jobs: Job[]
): Record<string, unknown> {
  const cityName = pick(locale, city.name_zh, city.name_es);
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t(locale, "seo.city.itemList", { city: cityName }),
    numberOfItems: jobs.length,
    itemListElement: jobs.map((job, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: pick(locale, job.title_zh, job.title_es),
      url: absUrl(localePath(`/job/${job.id}`, locale)),
    })),
  };
}

/** Audit P1-2: store pages get LocalBusiness, with ratings only when visible. */
export function storeStructuredData(
  store: PublicStore,
  city: City,
  locale: Locale
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: pick(locale, store.name_zh, store.name_es),
    url: absUrl(localePath(`/store/${store.id}`, locale)),
    address: {
      "@type": "PostalAddress",
      streetAddress: store.address,
      addressLocality: pick(locale, city.name_zh, city.name_es),
      addressRegion: city.region,
      addressCountry: "ES",
    },
  };
  if (store.cover_image) data.image = store.cover_image;
  // Rejected/unverified stores no longer show ratings in the UI, so
  // emitting aggregateRating for them would be invisible-content spam.
  if (store.verification_status === "verified" && store.rating_count > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: store.rating_avg,
      reviewCount: store.rating_count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return data;
}
