import { ImageResponse } from "next/og";
import { brandIconJsx } from "@/lib/brand-icon";

/**
 * A plain Route Handler (not the special Next.js "icon" file convention)
 * so it has a stable URL app/manifest.ts can point PWA install icons at —
 * that convention's generated URL carries a query suffix that isn't
 * suitable for a manifest icon src.
 */
export async function GET() {
  return new ImageResponse(brandIconJsx(), { width: 192, height: 192 });
}
