import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "店聘 DianPin",
    short_name: "店聘",
    description:
      "西班牙华人门店招聘平台 · Empleo para la comunidad china en España",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
