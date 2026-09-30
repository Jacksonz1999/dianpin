import type { Metadata } from "next";
import { LegalPageView } from "@/components/LegalPageView";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "法律声明 | 店聘 DianPin",
  description: "店聘 DianPin 法律声明（依西班牙 LSSI-CE）：运营者信息、知识产权与适用法律。",
  alternates: { canonical: `${getSiteUrl()}/legal` },
  robots: { index: false },
};

// Nonce-based CSP (proxy.ts) only injects nonces into dynamically rendered
// pages — this page has no inline scripts itself, but still needs a fresh
// per-request nonce for Next's own hydration scripts to run.
export const dynamic = "force-dynamic";

const SECTIONS = ["identity", "purpose", "ip", "disclaimer", "law"];

export default function LegalNoticePage() {
  return <LegalPageView page="legal" sections={SECTIONS} />;
}
