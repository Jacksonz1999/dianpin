import { defaultLocale, type Locale } from "./i18n";

/**
 * URL-level locale routing (audit P0-7).
 *
 * Chinese stays on the existing root URLs (`/`, `/job/…`, `/store/…`) so
 * nothing that already ranks in Google changes address. Spanish lives under
 * `/es/…` and is rewritten to the same App Router pages by `proxy.ts`,
 * which injects `x-dianpin-locale: es` into the request headers. Server
 * components read that header (lib/locale-server.ts) so `<html lang>`,
 * titles, canonical, hreflang and JSON-LD are all Spanish on a cold load —
 * a crawler never has to run client JS to see the Spanish version.
 *
 * Keep this module free of `next/headers` and `process.env` so client
 * components can import the pure path helpers.
 */

export const ES_PREFIX = "/es";
export const LOCALE_HEADER = "x-dianpin-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "zh" || value === "es";
}

/** `/` -> `/es/`, `/job/1` -> `/es/job/1`; zh paths are returned unchanged. */
export function localePath(path: string, locale: Locale): string {
  const normalized = normalizePath(path);
  if (locale !== "es") return normalized;
  return normalized === "/" ? `${ES_PREFIX}/` : `${ES_PREFIX}${normalized}`;
}

export function normalizePath(path: string): string {
  if (!path) return "/";
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : "/";
}

export function localeFromPathname(pathname: string): Locale {
  return pathname === ES_PREFIX ||
    pathname.startsWith(`${ES_PREFIX}/`) ||
    pathname.startsWith(`${ES_PREFIX}?`)
    ? "es"
    : defaultLocale;
}

/** `/es/job/1` -> `/job/1`; `/job/1` -> `/job/1`. */
export function stripLocalePrefix(pathname: string): string {
  if (pathname === ES_PREFIX) return "/";
  if (pathname.startsWith(`${ES_PREFIX}/`)) {
    return normalizePath(pathname.slice(ES_PREFIX.length));
  }
  return pathname || "/";
}

/** Full URL path (incl. query) for the language switcher. */
export function switchLocaleHref(
  pathname: string,
  search: string,
  next: Locale
): string {
  return `${localePath(stripLocalePrefix(pathname), next)}${search ?? ""}`;
}
