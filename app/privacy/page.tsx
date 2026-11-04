import type { Metadata } from "next";
import { LegalPageView } from "@/components/LegalPageView";
import { t } from "@/lib/i18n";
import { legalIdentityVars } from "@/lib/legal";
import { getRequestLocale } from "@/lib/locale-server";
import { localizedMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return localizedMetadata({
    title: t(locale, "seo.privacy.title"),
    description: t(locale, "seo.privacy.description"),
    path: "/privacy",
    locale,
    robots: { index: false },
  });
}

// Nonce-based CSP (proxy.ts) only injects nonces into dynamically rendered
// pages — this page has no inline scripts itself, but still needs a fresh
// per-request nonce for Next's own hydration scripts to run.
export const dynamic = "force-dynamic";

const SECTIONS = [
  "controller",
  "lssi",
  "dataCollected",
  "purposes",
  "retention",
  "recipients",
  "rights",
  "cookies",
  "minors",
  "changes",
];

export default async function PrivacyPage() {
  const locale = await getRequestLocale();
  return (
    <LegalPageView
      page="privacy"
      sections={SECTIONS}
      identity={legalIdentityVars(locale)}
    />
  );
}
