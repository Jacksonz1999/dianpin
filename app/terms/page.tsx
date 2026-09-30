import type { Metadata } from "next";
import { LegalPageView } from "@/components/LegalPageView";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "服务条款 | 店聘 DianPin",
  description: "店聘 DianPin 服务条款：使用规范、账号规则、责任限制与适用法律。",
  alternates: { canonical: `${getSiteUrl()}/terms` },
  robots: { index: false },
};

// Nonce-based CSP (proxy.ts) only injects nonces into dynamically rendered
// pages — this page has no inline scripts itself, but still needs a fresh
// per-request nonce for Next's own hydration scripts to run.
export const dynamic = "force-dynamic";

const SECTIONS = [
  "acceptance",
  "service",
  "account",
  "conduct",
  "verification",
  "liability",
  "termination",
  "law",
];

export default function TermsPage() {
  return <LegalPageView page="terms" sections={SECTIONS} />;
}
