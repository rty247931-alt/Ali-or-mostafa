import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const configured = process.env.SITE_URL?.trim();
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const site = configured || (host ? `https://${host}` : "http://localhost:3000");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/cart", "/checkout", "/account", "/order"] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
