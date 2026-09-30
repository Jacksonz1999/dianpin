import type { Metadata } from "next";
import { LegalPageView } from "@/components/LegalPageView";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "隐私政策 | 店聘 DianPin",
  description: "店聘 DianPin 隐私政策：我们收集哪些数据、处理目的、保留期限与您的权利。",
  alternates: { canonical: `${getSiteUrl()}/privacy` },
  robots: { index: false },
};

// Nonce-based CSP (proxy.ts) only injects nonces into dynamically rendered
// pages — this page has no inline scripts itself, but still needs a fresh
// per-request nonce for Next's own hydration scripts to run.
export const dynamic = "force-dynamic";

const SECTIONS = [
  "controller",
  "dataCollected",
  "purposes",
  "retention",
  "recipients",
  "rights",
  "cookies",
  "minors",
  "changes",
];

export default function PrivacyPage() {
  return <LegalPageView page="privacy" sections={SECTIONS} />;
}
