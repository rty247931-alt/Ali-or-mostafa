import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "@/lib/errors";
import { getSettings } from "@/lib/settings";
import { computeDiscount, effectiveCents, shippingCents, toCents } from "@/lib/core";

type Tx = Prisma.TransactionClient;

export const lineSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
});
export type Line = z.infer<typeof lineSchema>;

export type QuoteItem = {
  variantId: string;
  productId: string;
  categoryId: string;
  slug: string;
  productName: string;
  sku: string;
  colorName: string;
  sizeLabel: string;
  imageUrl: string | null;
  unitCents: number;
  quantity: number;
  lineCents: number;
  available: number;
};

export type Quote = {
  items: QuoteItem[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number | null;
  taxCents: number;
  taxIncluded: boolean;
  totalCents: number;
  couponCode: string | null;
  couponId: string | null;
  couponError: string | null;
  shippingError: string | null;
  shippingMethodName: string | null;
  estimatedDays: string | null;
  issues: string[];
};

/**
 * Every price, discount and shipping figure is computed here, on the server, from the database.
 * Nothing the browser sends except variantId, quantity, governorate and a coupon code is trusted.
 */
export async function quote(
  tx: Tx,
  lines: Line[],
  o: { governorate?: string | null; couponCode?: string | null; userId?: string | null; lockCoupon?: boolean },
): Promise<Quote> {
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.variantId, Math.min(10, (merged.get(l.variantId) ?? 0) + l.quantity));

  const variants = await tx.productVariant.findMany({
    where: { id: { in: [...merged.keys()] } },
    include: { product: { include: { images: { orderBy: { sortOrder: "asc" } } } }, color: true, size: true, inventory: true },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const issues: string[] = [];
  const items: QuoteItem[] = [];
  for (const [variantId, quantity] of merged) {
    const v = byId.get(variantId);
    if (!v || !v.isActive || v.product.status !== "ACTIVE") {
      issues.push("أحد المنتجات في السلة لم يعد متاحًا، احذفه وأكمل الطلب");
      continue;
    }
    const available = Math.max(0, (v.inventory?.onHand ?? 0) - (v.inventory?.reserved ?? 0));
    const label = `${v.product.name} مقاس ${v.size.label} (${v.color.name})`;
    if (available <= 0) issues.push(`نفد ${label}`);
    else if (available < quantity) issues.push(`المتاح من ${label} هو ${available} فقط`);

    const base = toCents(v.product.basePrice);
    const sale = v.product.salePrice ? toCents(v.product.salePrice) : null;
    const unit = v.priceOverride ? toCents(v.priceOverride) : effectiveCents(base, sale);
    const img = v.product.images.find((i) => i.colorId === v.colorId) ?? v.product.images.find((i) => i.isPrimary) ?? v.product.images[0];
    items.push({
      variantId, productId: v.productId, categoryId: v.product.categoryId, slug: v.product.slug,
      productName: v.product.name, sku: v.sku, colorName: v.color.name, sizeLabel: v.size.label,
      imageUrl: img?.url ?? null, unitCents: unit, quantity, lineCents: unit * quantity, available,
    });
  }

  const subtotal = items.reduce((a, i) => a + i.lineCents, 0);

  let discount = 0, couponId: string | null = null, couponCode: string | null = null, couponError: string | null = null;
  if (o.couponCode?.trim()) {
    try {
      const c = await applyCoupon(tx, o.couponCode, items, subtotal, o.userId ?? null, !!o.lockCoupon);
      discount = c.discountCents; couponId = c.id; couponCode = c.code;
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      couponError = e.message;
    }
  }

  let ship: number | null = null, shippingError: string | null = null, methodName: string | null = null, eta: string | null = null;
  if (o.governorate) {
    const zone = await tx.shippingZone.findUnique({
      where: { governorate: o.governorate },
      include: { methods: { where: { isActive: true }, orderBy: { cost: "asc" } } },
    });
    const m = zone?.isActive ? zone.methods[0] : undefined;
    if (!m) shippingError = "لا يتوفر الشحن لهذه المحافظة حاليًا";
    else {
      ship = shippingCents(toCents(m.cost), m.freeOverAmount ? toCents(m.freeOverAmount) : null, subtotal - discount);
      methodName = m.name; eta = m.estimatedDays;
    }
  }

  // Tax is applied only if the owner enabled it in Settings, with the owner's own rate.
  const st = await getSettings(["tax.enabled", "tax.rate", "tax.included"]);
  const rate = Number(st["tax.rate"] ?? 0), included = st["tax.included"] === true;
  const goods = subtotal - discount;
  const tax = st["tax.enabled"] === true && rate > 0
    ? (included ? Math.round((goods * rate) / (100 + rate)) : Math.round((goods * rate) / 100))
    : 0;

  return {
    items, subtotalCents: subtotal, discountCents: discount, shippingCents: ship,
    taxCents: tax, taxIncluded: included,
    totalCents: goods + (ship ?? 0) + (included ? 0 : tax), couponCode, couponId, couponError,
    shippingError, shippingMethodName: methodName, estimatedDays: eta, issues,
  };
}

async function applyCoupon(tx: Tx, rawCode: string, items: QuoteItem[], subtotal: number, userId: string | null, lock: boolean) {
  const code = rawCode.trim().toUpperCase();
  const c = await tx.coupon.findUnique({ where: { code }, include: { products: true } });
  if (!c) throw new ApiError(400, "كود الخصم غير صحيح");
  // Serialise concurrent redemptions of the same coupon inside an order transaction.
  if (lock) await tx.$queryRaw`SELECT id FROM "Coupon" WHERE id = ${c.id} FOR UPDATE`;
  const now = new Date();
  if (!c.isActive) throw new ApiError(400, "كود الخصم غير مفعل");
  if (c.startsAt && c.startsAt > now) throw new ApiError(400, "كود الخصم لم يبدأ بعد");
  if (c.endsAt && c.endsAt < now) throw new ApiError(400, "انتهت صلاحية هذا الكود");
  if (c.minOrderValue && subtotal < toCents(c.minOrderValue))
    throw new ApiError(400, `الحد الأدنى لهذا الكود ${Number(c.minOrderValue)} ج.م`);
  if (c.maxUses != null && (await tx.couponUsage.count({ where: { couponId: c.id } })) >= c.maxUses)
    throw new ApiError(400, "تم استنفاد استخدامات هذا الكود");
  if (c.maxUsesPerUser != null && userId &&
      (await tx.couponUsage.count({ where: { couponId: c.id, userId } })) >= c.maxUsesPerUser)
    throw new ApiError(400, "استخدمت هذا الكود من قبل");

  const scoped = !!c.categoryId || c.products.length > 0;
  const eligible = items
    .filter((i) => !scoped || (c.categoryId && i.categoryId === c.categoryId) || c.products.some((p) => p.productId === i.productId))
    .reduce((a, i) => a + i.lineCents, 0);
  if (eligible <= 0) throw new ApiError(400, "هذا الكود لا ينطبق على منتجات السلة");

  const value = c.type === "PERCENT" ? Number(c.value) : toCents(c.value);
  return { id: c.id, code: c.code, discountCents: computeDiscount(c.type, value, eligible) };
}
