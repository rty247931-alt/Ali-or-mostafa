import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Keep robots.txt and sitemap.xml on the same canonical production origin.
  const site = (process.env.SITE_URL?.trim() || "https://khotwa-store.vercel.app").replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/cart", "/checkout", "/account", "/order"] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
