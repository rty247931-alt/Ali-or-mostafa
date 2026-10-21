import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";

export const catalogQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().max(80).optional(),
  brand: z.string().max(80).optional(),
  size: z.string().max(10).optional(),
  color: z.string().max(40).optional(),
  material: z.string().max(60).optional(),
  min: z.coerce.number().min(0).optional(),
  max: z.coerce.number().min(0).optional(),
  inStock: z.enum(["1"]).optional(),
  discount: z.enum(["1"]).optional(),
  isNew: z.enum(["1"]).optional(),
  sort: z.enum(["new", "price_asc", "price_desc", "best", "discount"]).default("new"),
  page: z.coerce.number().int().min(1).max(500).default(1),
});
export type CatalogQuery = z.infer<typeof catalogQuery>;
export const PAGE_SIZE = 12;

export const cardSelect = {
  id: true, slug: true, name: true, currentPrice: true, basePrice: true, discountPercent: true,
  soldCount: true, createdAt: true,
  brand: { select: { name: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 2, select: { url: true, alt: true } },
  variants: { where: { isActive: true }, select: { size: { select: { label: true } }, inventory: { select: { onHand: true, reserved: true } } } },
} satisfies Prisma.ProductSelect;

export async function listProducts(raw: unknown) {
  const p = catalogQuery.parse(raw);
  const stockOk = { inventory: { is: { onHand: { gt: 0 } } } };
  const and: Prisma.ProductWhereInput[] = [{ status: "ACTIVE" }];
  if (p.category) and.push({ OR: [{ category: { slug: p.category } }, { extraCategories: { some: { category: { slug: p.category } } } }] });
  if (p.brand) and.push({ brand: { slug: p.brand } });
  if (p.material) and.push({ material: p.material });
  if (p.min != null) and.push({ currentPrice: { gte: p.min } });
  if (p.max != null) and.push({ currentPrice: { lte: p.max } });
  if (p.discount) and.push({ discountPercent: { gt: 0 } });
  if (p.isNew) and.push({ createdAt: { gte: new Date(Date.now() - 30 * 864e5) } });
  if (p.q)
    and.push({ OR: [
      { name: { contains: p.q, mode: "insensitive" } }, { sku: { contains: p.q, mode: "insensitive" } },
      { searchKeywords: { contains: p.q, mode: "insensitive" } }, { brand: { name: { contains: p.q, mode: "insensitive" } } },
      { category: { name: { contains: p.q, mode: "insensitive" } } },
    ] });
  // size / color / in-stock must all be satisfied by the SAME variant
  if (p.size || p.color || p.inStock)
    and.push({ variants: { some: { isActive: true, ...stockOk, ...(p.size ? { size: { label: p.size } } : {}), ...(p.color ? { color: { name: p.color } } : {}) } } });
  const where: Prisma.ProductWhereInput = { AND: and };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    p.sort === "price_asc" ? [{ currentPrice: "asc" }]
    : p.sort === "price_desc" ? [{ currentPrice: "desc" }]
    : p.sort === "best" ? [{ soldCount: "desc" }, { createdAt: "desc" }]
    : p.sort === "discount" ? [{ discountPercent: "desc" }]
    : [{ createdAt: "desc" }];

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy, skip: (p.page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: cardSelect }),
  ]);
  return { total, page: p.page, pageSize: PAGE_SIZE, items: rows.map(toCard) };
}

export type Card = ReturnType<typeof toCard>;
export function toCard(r: Prisma.ProductGetPayload<{ select: typeof cardSelect }>) {
  const inStock = r.variants.some((v) => (v.inventory?.onHand ?? 0) - (v.inventory?.reserved ?? 0) > 0);
  return {
    id: r.id, slug: r.slug, name: r.name, brand: r.brand?.name ?? null,
    price: Number(r.currentPrice), oldPrice: r.discountPercent > 0 ? Number(r.basePrice) : null,
    discountPercent: r.discountPercent, inStock,
    image: r.images[0]?.url ?? null, altImage: r.images[1]?.url ?? null,
    isNew: Date.now() - r.createdAt.getTime() < 30 * 864e5,
    bestSeller: r.soldCount >= 10,
    sizes: [...new Set(r.variants.filter((v) => (v.inventory?.onHand ?? 0) - (v.inventory?.reserved ?? 0) > 0).map((v) => v.size.label))],
  };
}
