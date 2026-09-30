import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocaleProvider } from "@/components/LocaleProvider";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
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
          <div className="mx-auto flex min-h-screen max-w-[560px] flex-col">
            <Header />
            <main className="flex-1 pb-20">{children}</main>
            <BottomNav />
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
