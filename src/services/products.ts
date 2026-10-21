import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { discountPercent, effectiveCents, toCents } from "@/lib/core";

export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "الرابط: حروف إنجليزية وأرقام وشرطات فقط"),
    sku: z.string().trim().min(2).max(40),
    categoryId: z.string().min(1, "اختر القسم"),
    brandId: z.string().optional().nullable(),
    shortDesc: z.string().max(300).optional(),
    description: z.string().max(5000).optional(),
    material: z.string().max(60).optional(),
    shoeType: z.string().max(60).optional(),
    basePrice: z.number().positive("السعر لازم يكون أكبر من صفر").max(1_000_000),
    salePrice: z.number().positive().optional().nullable(),
    status: z.enum(["DRAFT", "ACTIVE", "HIDDEN", "PAUSED", "ARCHIVED"]).default("DRAFT"),
    variants: z.array(z.object({
      colorName: z.string().trim().min(1).max(40),
      colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      sizeLabel: z.string().trim().min(1).max(10),
      quantity: z.number().int().min(0).max(100000),
    })).min(1, "أضف مقاسًا ولونًا واحدًا على الأقل").max(200),
  })
  .refine((d) => d.salePrice == null || d.salePrice < d.basePrice, { message: "سعر البيع لازم يكون أقل من السعر الأساسي", path: ["salePrice"] });
export type ProductInput = z.infer<typeof productSchema>;

export async function addVariant(tx: Prisma.TransactionClient, productId: string, sku: string, v: ProductInput["variants"][number], idx: number, actorId: string) {
  const color = await tx.color.upsert({ where: { name: v.colorName }, update: {}, create: { name: v.colorName, hex: v.colorHex } });
  const size = await tx.size.upsert({ where: { label: v.sizeLabel }, update: {}, create: { label: v.sizeLabel, sortOrder: parseInt(v.sizeLabel) || 0 } });
  const variant = await tx.productVariant.create({
    data: { productId, colorId: color.id, sizeId: size.id, sku: `${sku}-${color.id.slice(-4)}-${size.label}-${idx}`.toUpperCase() },
  });
  const inv = await tx.inventory.create({ data: { variantId: variant.id, onHand: v.quantity } });
  if (v.quantity > 0)
    await tx.inventoryMovement.create({ data: { inventoryId: inv.id, type: "PURCHASE_IN", quantity: v.quantity, reason: "رصيد افتتاحي", actorId } });
}

export async function createProduct(tx: Prisma.TransactionClient, d: ProductInput, actorId: string) {
  const dupe = await tx.product.findFirst({ where: { OR: [{ slug: d.slug }, { sku: d.sku }] } });
  if (dupe) throw new ApiError(409, `الرابط أو كود المنتج مستخدم من قبل (${d.sku})`);
  const base = toCents(d.basePrice), sale = d.salePrice != null ? toCents(d.salePrice) : null;
  const product = await tx.product.create({
    data: {
      name: d.name, slug: d.slug, sku: d.sku, categoryId: d.categoryId, brandId: d.brandId || null,
      shortDesc: d.shortDesc, description: d.description, material: d.material, shoeType: d.shoeType,
      basePrice: (base / 100).toFixed(2), salePrice: sale != null ? (sale / 100).toFixed(2) : null,
      currentPrice: (effectiveCents(base, sale) / 100).toFixed(2), discountPercent: discountPercent(base, sale), status: d.status,
    },
  });
  for (const [i, v] of d.variants.entries()) await addVariant(tx, product.id, d.sku, v, i, actorId);
  await audit(tx, actorId, "product.create", "Product", product.id, { name: d.name, basePrice: d.basePrice, salePrice: d.salePrice });
  return product;
}
