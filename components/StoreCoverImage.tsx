"use client";

import { useEffect, useRef, useState } from "react";
import { Store as StoreIcon } from "lucide-react";

/**
 * Shared cover-image renderer for job cards, the store detail page and the
 * job detail page (C4). `stores.cover_image` is often empty — WP5b (R2
 * upload) isn't built yet, so real stores have no photo — and even a set
 * URL can 404. Either case falls back to a branded color block with a
 * store icon + name initial instead of a broken-image icon or blank gap.
 * No real storefront photo is fabricated here; the fallback is a generic
 * icon, not a sample photo.
 */
export function StoreCoverImage({
  src,
  alt,
  name,
  className,
}: {
  src: string;
  alt: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // onError alone misses a request that already 404'd before React
  // hydrated — the browser fires that event against the server-rendered
  // <img> tag, before any listener is attached, so it's lost. This catches
  // that case on mount: a real photo is still loading or already decoded
  // (img.complete && naturalWidth > 0) by the time this runs, so it never
  // false-positives on a slow-but-working image.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  // Legacy seed rows still point at /seed/*.jpg files that never existed
  // (audit P0-1). Treat them exactly like an empty cover so no 404 request
  // is ever issued, even before `npm run db:audit-cleanup` runs on prod.
  const usableSrc = src.startsWith("/seed/") ? "" : src;

  if (!usableSrc || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-[var(--color-bg)] to-[var(--color-surface)] px-3 text-[var(--color-text-muted)] ${className ?? ""}`}
      >
        {/* Show the full store name, not a single grey initial — the "首字
            灰块" look read as an unfinished prototype in the audit. */}
        <span className="flex max-w-full flex-col items-center gap-1 text-center">
          <StoreIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2 text-xs font-medium leading-tight">
            {name.trim() || "DianPin"}
          </span>
        </span>
      </div>
    );
  }

  // cover_image can be any URL (no upload pipeline yet, see WP5b);
  // next/image needs a fixed remotePatterns allowlist this project can't
  // predict yet.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={usableSrc}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
