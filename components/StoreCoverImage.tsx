"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Store as StoreIcon,
  UtensilsCrossed,
  Wine,
} from "lucide-react";

/**
 * Shared cover-image renderer for job cards, the store detail page and the
 * job detail page (C4). `stores.cover_image` is often empty — WP5b (R2
 * upload) isn't built yet, so real stores have no photo — and even a set
 * URL can 404. Either case falls back to a branded, category-tinted color
 * block with a large category icon + the store name, instead of a
 * broken-image icon or a blank gap. No real storefront photo is fabricated
 * here; the fallback is a generic icon, not a sample photo.
 */

type CategoryStyle = { gradient: string; Icon: ComponentType<{ className?: string }> };

// Audit phase-1 UI1: the grey "first-letter block" read as an unfinished
// prototype. The fallback is now a category-colored gradient with a big
// category icon + the full store name. Order matters: most specific first.
const CATEGORY_STYLES: { test: RegExp; style: CategoryStyle }[] = [
  {
    // 中餐 / 西餐 / 寿司 / 自助 / 咖啡 / 酒吧
    test: /中餐|西餐|餐厅|restaurante|comida|寿司|sushi|buffet|咖啡|coffee|cafeter|bar|酒吧|餐/i,
    style: {
      gradient: "from-rose-400 to-red-500",
      Icon: UtensilsCrossed,
    },
  },
  {
    // 超市 / 便利店
    test: /超市|supermercado|super|mercado|conveniencia|便利店/i,
    style: {
      gradient: "from-emerald-400 to-green-500",
      Icon: ShoppingCart,
    },
  },
  {
    // 百元店 / 杂货 / 小商品 (bazares)
    test: /百元店|bazar|todo a cien|杂货|almacén|almacen|tienda|小商品/i,
    style: {
      gradient: "from-amber-400 to-orange-500",
      Icon: ShoppingBag,
    },
  },
  {
    // 酒吧 / 酒馆（未命中餐饮的情况）
    test: /酒吧|wine|vino|copas|pub/i,
    style: { gradient: "from-violet-400 to-purple-500", Icon: Wine },
  },
  {
    // 服装 / 鞋帽
    test: /服装|ropa|moda|clothing|vestimenta|鞋|zapato/i,
    style: { gradient: "from-sky-400 to-blue-500", Icon: Shirt },
  },
];

const DEFAULT_STYLE: CategoryStyle = {
  gradient: "from-slate-300 to-slate-400",
  Icon: StoreIcon,
};

function categoryStyle(category: string): CategoryStyle {
  for (const { test, style } of CATEGORY_STYLES) {
    if (test.test(category)) return style;
  }
  return DEFAULT_STYLE;
}

export function StoreCoverImage({
  src,
  alt,
  name,
  category = "",
  className,
}: {
  src: string;
  alt: string;
  name: string;
  category?: string;
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
    const { gradient, Icon } = categoryStyle(category);
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br ${gradient} px-3 text-white ${className ?? ""}`}
      >
        <span className="flex max-w-full flex-col items-center gap-1 text-center">
          <Icon className="h-9 w-9 shrink-0 drop-shadow" aria-hidden="true" />
          <span className="line-clamp-2 text-xs font-semibold leading-tight drop-shadow">
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
