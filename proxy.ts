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

  // Space-separated list of extra origins store/job photos may load from,
  // e.g. "https://res.cloudinary.com https://*.supabase.co" — set once an
  // image CDN is picked (AGENTS.md §7: never serve images from Railway
  // itself). Unset today, so img-src stays exactly 'self' data: — this
  // only widens the policy once someone opts in, never on its own. This
  // is a plain env var (not NEXT_PUBLIC_*): it's read here in proxy.ts,
  // which runs server-side only, not shipped to the browser bundle.
  const imageCdnHosts = process.env.IMAGE_CDN_HOSTS?.trim();

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:${imageCdnHosts ? ` ${imageCdnHosts}` : ""};
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
