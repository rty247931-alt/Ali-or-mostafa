import type { MetadataRoute } from "next";

/** Installable shortcut for the authenticated admin UI; no offline caching of private data. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/admin/",
    name: "خُطوة — لوحة الإدارة",
    short_name: "خُطوة إدارة",
    description: "لوحة الإدارة الخاصة بمتجر خُطوة",
    lang: "ar",
    dir: "rtl",
    start_url: "/admin/",
    scope: "/admin/",
    display: "standalone",
    background_color: "#f8f7f4",
    theme_color: "#ff4a1c",
    icons: [{ src: "/khotwa-admin.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
