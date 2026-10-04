import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocaleProvider } from "@/components/LocaleProvider";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { SkipLink } from "@/components/SkipLink";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        <LocaleProvider>
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
        </LocaleProvider>
      </body>
    </html>
  );
}
