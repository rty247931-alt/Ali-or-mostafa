import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/cart", "/checkout", "/account", "/order"] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
