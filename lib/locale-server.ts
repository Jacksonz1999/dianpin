import { headers } from "next/headers";
import { defaultLocale, type Locale } from "./i18n";
import { isLocale, LOCALE_HEADER } from "./locale-routing";

/**
 * Locale as decided by `proxy.ts` from the request URL, NOT from a cookie or
 * localStorage. `proxy.ts` always overwrites the header (it never trusts a
 * client-supplied value), so this is safe to use for metadata, `<html lang>`
 * and the server-rendered dictionary.
 */
export async function getRequestLocale(): Promise<Locale> {
  const value = (await headers()).get(LOCALE_HEADER);
  return isLocale(value) ? value : defaultLocale;
}
