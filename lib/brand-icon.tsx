/**
 * Shared JSX for the ImageResponse-based icon routes (apple-icon.tsx,
 * icon-192.png, icon-512.png) — same badge as app/icon.svg (brand-color
 * rounded square + white store-awning/checkmark mark), just rasterized at
 * whatever size each route needs. Kept in one place so the three routes
 * can't drift from each other or from the static favicon.
 */
export function brandIconJsx() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#2563eb",
      }}
    >
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        <g fill="#ffffff">
          <rect x="14" y="14" width="36" height="6" rx="1.5" />
          <circle cx="18.5" cy="20" r="4.5" />
          <circle cx="27.5" cy="20" r="4.5" />
          <circle cx="36.5" cy="20" r="4.5" />
          <circle cx="45.5" cy="20" r="4.5" />
        </g>
        <path
          d="M22 41 29 48 42 34.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
