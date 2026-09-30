import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Nonce-based CSP: Next.js's own framework/hydration scripts are inline and
// need a per-request nonce to run under an enforced (non-report-only) CSP —
// see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
// ("Adding a nonce with Proxy"). This project has no other inline scripts —
// the only inline <script> in app/ is type="application/ld+json" (exempt,
// not a JS MIME type) and the Turnstile widget loads via next/script, which
// picks up the nonce explicitly passed as a prop (see app/login/page.tsx).
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
    connect-src 'self';
    frame-src https://challenges.cloudflare.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `;
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
