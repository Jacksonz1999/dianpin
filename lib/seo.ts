import type { Metadata } from "next";
import type { City, Job, Store } from "./types";
import { getSiteUrl } from "./site-url";

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

/**
 * Metadata generated server-side has no access to the visitor's locale —
 * unlike the rest of the UI, it isn't stored in a cookie the server can
 * read, only in localStorage (see components/LocaleProvider). Search
 * engines and social crawlers get the primary language (AGENTS.md §1:
 * "界面中文为主"), matching <html lang="zh"> in app/layout.tsx. Proper
 * per-locale metadata needs locale-prefixed routes (AGENTS.md's own P2-6
 * territory), not a small fix here.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function jobMetadata(job: Job, store: Store, city: City): Metadata {
  const url = `${getSiteUrl()}/job/${job.id}`;
  const title = `${job.title_zh} - ${store.name_zh} · ${city.name_zh} | ${SITE_NAME}`;
  const description = truncate(
    job.description_zh.trim() ||
      `${store.name_zh}招聘${job.title_zh}，${city.name_zh}${job.district}，欢迎投递`,
    155
  );

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "zh_CN",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export function storeMetadata(store: Store, city: City): Metadata {
  const url = `${getSiteUrl()}/store/${store.id}`;
  const title = `${store.name_zh} · ${city.name_zh} | ${SITE_NAME}`;
  const description = truncate(
    `${store.name_zh}（${store.category}）· ${city.name_zh}${store.district} · 在店聘查看该店招聘信息与真实评价`,
    155
  );

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "zh_CN",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
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
  store: Store,
  city: City
): Record<string, unknown> {
  const url = `${getSiteUrl()}/job/${job.id}`;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title_zh,
    description: job.description_zh.trim() || job.title_zh,
    identifier: {
      "@type": "PropertyValue",
      name: SITE_NAME,
      value: job.id,
    },
    datePosted: job.published_at,
    hiringOrganization: {
      "@type": "Organization",
      name: store.name_zh,
      sameAs: `${getSiteUrl()}/store/${store.id}`,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: store.address,
        addressLocality: city.name_zh,
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

export function homeMetadata(): Metadata {
  const url = getSiteUrl();
  const title = `${SITE_NAME} — 西班牙华人门店招聘平台`;
  const description =
    "面向西班牙华人的门店招聘平台：百元店、酒吧、服装店、自助寿司、超市、中餐馆等岗位，结构化筛选、门店认证、投递状态清晰可追踪。";

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "zh_CN",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
