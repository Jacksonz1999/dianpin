import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocaleProvider } from "@/components/LocaleProvider";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { SkipLink } from "@/components/SkipLink";
import { SessionProvider } from "@/components/SessionProvider";
import { getSession } from "@/lib/auth/session";
import { getSiteUrl } from "@/lib/site-url";
import { homeMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  ...homeMetadata(),
};

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
  // the current URL (see BottomNav.tsx/Header.tsx) — a dead-end loop
  // otherwise (an employer account parked on "/" saw seeker tabs that all
  // bounced). The session cookie is httpOnly, so this read can only
  // happen server-side; SessionProvider carries the result down to the
  // client nav components. This call to getSession() (cookies()) makes
  // every route under this layout dynamic — already true of every actual
  // page in this app (each sets `export const dynamic = "force-dynamic"`
  // itself; confirmed via grep before this change), so there's no
  // additional static->dynamic regression. The file-convention routes
  // that do stay static (robots.txt, sitemap's own icons, manifest,
  // apple-icon, opengraph-image) don't render through this layout at all,
  // so they're unaffected either way.
  const session = await getSession();

  return (
    <html lang="zh">
      <body>
        <LocaleProvider>
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
