import type { NextConfig } from "next";

// Content-Security-Policy is enforced per-request from proxy.ts instead of
// here: Next.js's own framework/hydration scripts are inline, and an
// enforced (non-report-only) CSP needs a per-request nonce for those to
// keep running — see proxy.ts and
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md.
// A static header here can't carry a nonce, so it would either block those
// scripts (bare 'self') or have to fall back to 'unsafe-inline' — both
// worse than generating the header per-request in proxy.ts.
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
