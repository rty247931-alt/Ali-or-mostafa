import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Khotwa Store",
    short_name: "Khotwa",
    description: "متجر خُطوة للأحذية",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f5f0",
    theme_color: "#263b2b",
    icons: [
      { src: "/api/pwa-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ]
  };
}
