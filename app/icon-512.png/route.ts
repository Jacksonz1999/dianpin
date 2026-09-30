import { ImageResponse } from "next/og";
import { brandIconJsx } from "@/lib/brand-icon";

// See app/icon-192.png/route.ts for why this isn't the icon.* convention.
export async function GET() {
  return new ImageResponse(brandIconJsx(), { width: 512, height: 512 });
}
