"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { defaultLocale, Locale, t as translate } from "@/lib/i18n";
import { localePath, switchLocaleHref } from "@/lib/locale-routing";

const STORAGE_KEY = "dianpin_locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Prefix an internal path with /es when the visitor is on the Spanish site. */
  href: (path: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  // The server decides this from the URL via proxy.ts -> getRequestLocale(),
  // so the very first (SSR) render is already in the right language —
  // crawlers never need JS or localStorage to see the Spanish version.
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // A returning Spanish-speaking visitor landing on a Chinese URL is
      // moved to its /es equivalent, so URL, canonical and UI never disagree.
      if (saved === "es" && initialLocale !== "es") {
        window.location.replace(
          switchLocaleHref(pathname ?? "/", window.location.search, "es")
        );
        return;
      }
      if (saved === "zh" && initialLocale !== "zh") {
        window.location.replace(
          switchLocaleHref(pathname ?? "/", window.location.search, "zh")
        );
        return;
      }
      if (saved === "zh" || saved === "es") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocaleState(saved);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — keep URL locale
    }
  }, [initialLocale, pathname]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore write failures
      }
      // A full navigation is intentional: the URL must change for Google,
      // and that means the server has to re-render <html lang>, canonical,
      // hreflang and metadata in the target language (audit P0-7).
      window.location.assign(
        switchLocaleHref(pathname ?? "/", window.location.search, next)
      );
    },
    [pathname]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      href: (path) => localePath(path, locale),
    }),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
