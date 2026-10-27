import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { permsOf, requirePerm } from "@/lib/perm";
import { discountPercent, effectiveCents, toCents } from "@/lib/core";

const opt = (n: number) => z.string().trim().max(n).nullish().transform((v) => (v === undefined ? undefined : v ? v : null));
const schema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  shortDesc: opt(300), videoUrl: opt(2048), description: opt(5000), material: opt(60), shoeType: opt(60), originCountry: opt(60), careInfo: opt(300),
  searchKeywords: opt(300), seoTitle: opt(120), seoDescription: opt(250),
  categoryId: z.string().min(1).optional(), brandId: z.string().nullish().transform((v) => (v === undefined ? undefined : v || null)),
  status: z.enum(["DRAFT", "ACTIVE", "HIDDEN", "PAUSED", "ARCHIVED"]).optional(),
  basePrice: z.number().positive().max(1_000_000).optional(),
  salePrice: z.number().positive().nullable().optional(),
});

export const PATCH = route<{ params: { id: string } }>(async (req, { params }) => {
  const { userId } = await requirePerm("product.update");
  const d = schema.parse(await req.json());
  const { basePrice, salePrice, ...rest } = d;
  const touchesPrice = basePrice !== undefined || salePrice !== undefined;
  if (touchesPrice && !(await permsOf(userId)).has("price.update")) throw new ApiError(403, "ليس لديك صلاحية تعديل الأسعار");

  const out = await db.$transaction(async (tx) => {
    const p = await tx.product.findUnique({ where: { id: params.id } });
    if (!p) throw new ApiError(404, "المنتج غير موجود");
    const data: Record<string, unknown> = { ...rest };
    if (touchesPrice) {
      const base = basePrice !== undefined ? toCents(basePrice) : toCents(p.basePrice);
      const sale = salePrice !== undefined ? (salePrice === null ? null : toCents(salePrice)) : p.salePrice ? toCents(p.salePrice) : null;
      if (sale != null && sale >= base) throw new ApiError(400, "سعر البيع لازم يكون أقل من السعر الأساسي");
      Object.assign(data, {
        basePrice: (base / 100).toFixed(2), salePrice: sale != null ? (sale / 100).toFixed(2) : null,
        currentPrice: (effectiveCents(base, sale) / 100).toFixed(2), discountPercent: discountPercent(base, sale),
      });
    }
    const updated = await tx.product.update({ where: { id: p.id }, data });
    await audit(tx, userId, touchesPrice ? "price.update" : "product.update", "Product", p.id, {
      before: { basePrice: p.basePrice.toString(), salePrice: p.salePrice?.toString() ?? null, status: p.status }, after: data,
    });
    return updated;
  });
  return json({ id: out.id });
});

// Products that appear in past orders are archived, never deleted, so old orders stay intact.
export const DELETE = route<{ params: { id: string } }>(async (_req, { params }) => {
  const { userId } = await requirePerm("product.update");
  const used = await db.orderItem.count({ where: { variant: { productId: params.id } } });
  if (used > 0) {
    await db.product.update({ where: { id: params.id }, data: { status: "ARCHIVED" } });
    await audit(db, userId, "product.archive", "Product", params.id);
    return json({ archived: true });
  }
  await db.product.delete({ where: { id: params.id } });
  await audit(db, userId, "product.delete", "Product", params.id);
  return json({ deleted: true });
});
