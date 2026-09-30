import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 700, display: "flex" }}>
          店聘 DianPin
        </div>
        <div style={{ fontSize: 42, marginTop: 24, opacity: 0.9, display: "flex" }}>
          西班牙华人门店招聘平台 · Empleo para la comunidad china en España
        </div>
      </div>
    ),
    { ...size }
  );
}
