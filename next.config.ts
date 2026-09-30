import type { NextConfig } from "next";

// Report-only for now (per the security audit's own recommendation): logs
// violations in supporting browsers' devtools/reporting endpoint without
// blocking anything, so it's safe to ship immediately. Watch real traffic
// for a while, then switch the header name to "Content-Security-Policy"
// (dropping "-Report-Only") to start enforcing.
//
// challenges.cloudflare.com is allowed in script-src/frame-src for the
// optional Turnstile widget (lib/auth/turnstile.ts) — it loads its own
// script and renders in an iframe. Harmless to allow even when Turnstile
// is unconfigured (no keys means the widget never loads, so nothing ever
// actually calls out to that host).
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Stop leaking "x-powered-by: Next.js" (trivial recon info for attackers).
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
