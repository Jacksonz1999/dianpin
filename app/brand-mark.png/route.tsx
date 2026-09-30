import { ImageResponse } from "next/og";

/**
 * Transparent-background, brand-color-only mark (no rounded-square badge)
 * for contexts that supply their own background — currently the magic-link
 * email header (lib/auth/providers/email.ts), where a plain wordmark makes
 * the email look less like a phishing attempt than raw text alone.
 */
export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <g fill="#2563eb">
            <rect x="14" y="14" width="36" height="6" rx="1.5" />
            <circle cx="18.5" cy="20" r="4.5" />
            <circle cx="27.5" cy="20" r="4.5" />
            <circle cx="36.5" cy="20" r="4.5" />
            <circle cx="45.5" cy="20" r="4.5" />
          </g>
          <path
            d="M22 41 29 48 42 34.5"
            fill="none"
            stroke="#2563eb"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: 256, height: 256 }
  );
}
