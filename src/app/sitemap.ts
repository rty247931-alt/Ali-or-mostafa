import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function getSiteUrl() {
  const configured = process.env.SITE_URL?.trim();
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return configured || (host ? `https://${host}` : "http://localhost:3000");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const [products, cats, pages] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { isVisible: true }, select: { slug: true } }),
    db.page.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    { url: site }, { url: `${site}/shop` },
    ...cats.map((c) => ({ url: `${site}/shop?category=${c.slug}` })),
    ...products.map((p) => ({ url: `${site}/product/${p.slug}`, lastModified: p.updatedAt })),
    ...pages.map((p) => ({ url: `${site}/pages/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
