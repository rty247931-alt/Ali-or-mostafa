import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // SITE_URL may exist as an empty string in Vercel; normalize it and
  // always emit fully-qualified canonical URLs for search engines.
  const site = (process.env.SITE_URL?.trim() || "https://khotwa-store.vercel.app").replace(/\/$/, "");
  const [products, cats, pages] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { isVisible: true }, select: { slug: true } }),
    db.page.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    { url: site },
    { url: `${site}/shop` },
    ...cats.map((c) => ({ url: `${site}/shop?category=${encodeURIComponent(c.slug)}` })),
    ...products.map((p) => ({ url: `${site}/product/${p.slug}`, lastModified: p.updatedAt })),
    ...pages.map((p) => ({ url: `${site}/pages/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
