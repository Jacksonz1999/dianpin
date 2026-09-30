import { ImageResponse } from "next/og";
import { getStoreById } from "@/lib/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same reasoning as the rest of this app's DB-backed routes (see PR #9):
// this must never run at build time, only on demand.
export const dynamic = "force-dynamic";

export default async function StoreOpengraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await getStoreById(id);

  const title = store?.name_zh ?? "店聘 DianPin";
  const subtitle = store?.category ?? "西班牙华人门店招聘平台";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 32, opacity: 0.85, display: "flex" }}>
          店聘 DianPin
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.2, display: "flex" }}>
            {title}
          </div>
          <div style={{ fontSize: 36, opacity: 0.9, display: "flex" }}>{subtitle}</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
