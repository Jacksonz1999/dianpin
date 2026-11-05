import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocaleProvider } from "@/components/LocaleProvider";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { SkipLink } from "@/components/SkipLink";
import { SessionProvider } from "@/components/SessionProvider";
import { getSession } from "@/lib/auth/session";
import { getRequestLocale } from "@/lib/locale-server";
import { getSiteUrl } from "@/lib/site-url";
import { homeMetadata } from "@/lib/seo";

// Audit P0-7: metadata is locale-driven now (title/description/canonical/
// og:locale/hreflang), so it must be generated per request rather than
// exported as a static object.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    metadataBase: new URL(getSiteUrl()),
    ...homeMetadata(locale),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // WP-K (round 10): nav tabs must reflect the account's actual role, not
  // the current URL. The session cookie is httpOnly, so this read can only
  // happen server-side; SessionProvider carries the result down to the
  // client nav components.
  const [session, locale] = await Promise.all([
    getSession(),
    getRequestLocale(),
  ]);

  return (
    // `locale-intl` swaps the font stack to a Western sans (see globals.css)
    // so Spanish/English copy doesn't fall back to a CJK font; `locale-zh`
    // keeps the existing CJK-friendly stack.
    <html lang={locale} className={locale === "zh" ? "locale-zh" : "locale-intl"}>
      <body>
        <LocaleProvider initialLocale={locale}>
          <SessionProvider role={session?.role ?? null}>
            <SkipLink />
            <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col md:max-w-3xl lg:max-w-6xl">
              <Header />
              {/* pb-20 reserves space for the fixed BottomNav, which only
                  renders below md — no longer needed once it's hidden. */}
              <main id="main" className="flex-1 pb-20 md:pb-6">
                {children}
              </main>
              <BottomNav />
            </div>
          </SessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
