import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { getSetting } from "@/lib/settings";
import { GOVERNORATES } from "@/lib/geo";
import { EG_PHONE, STATUS_AR, canTransition, fromCents, normalizeDigits, type OrderStatus } from "@/lib/core";
import { lineSchema, quote } from "./pricing";
import { notifyCustomer } from "./notify";

export const orderInputSchema = z.object({
  idempotencyKey: z.string().min(16).max(100),
  items: z.array(lineSchema).min(1).max(30),
  couponCode: z.string().max(40).optional().nullable(),
  paymentMethod: z.enum(["COD", "ONLINE", "WALLET"]),
  walletProvider: z.enum(["vodafone", "orange", "etisalat"]).optional(),
  paymentReceiptUrl: z.string().url().max(1000).optional(),
  customer: z.object({
    name: z.string().trim().min(3, "اكتب الاسم الأول والأخير").max(100),
    phone: z.string().transform(normalizeDigits).pipe(z.string().regex(EG_PHONE, "رقم موبايل مصري غير صحيح")),
    email: z.string().email("بريد غير صحيح").max(150).optional().or(z.literal("")),
  }),
  address: z.object({
    governorate: z.enum(GOVERNORATES, { errorMap: () => ({ message: "اختر المحافظة" }) }),
    city: z.string().trim().min(2, "اكتب المدينة أو المركز").max(100),
    area: z.string().trim().max(100).optional(),
    addressLine: z.string().trim().min(6, "اكتب العنوان بالتفصيل").max(300),
    landmark: z.string().trim().max(150).optional(),
  }),
  notes: z.string().trim().max(300).optional(),
});
export type OrderInput = z.infer<typeof orderInputSchema>;

const newNumber = () => {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `ST-${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
};

export async function createOrder(input: OrderInput, userId: string | null) {
  if (input.paymentMethod === "ONLINE" && !(await getSetting("payments.online.enabled", false)))
    throw new ApiError(400, "الدفع الإلكتروني غير مفعل حاليًا، اختر الدفع عند الاستلام");
  if (input.paymentMethod === "WALLET") {
    if (!(await getSetting("payments.wallet.enabled", false))) throw new ApiError(400, "الدفع بالمحفظة الإلكترونية غير مفعل حاليًا");
    if (!input.walletProvider || !input.paymentReceiptUrl) throw new ApiError(400, "اختر المحفظة وارفق صورة إيصال التحويل");
    const key = input.walletProvider === "vodafone" ? "payments.wallet.vodafone" : input.walletProvider === "orange" ? "payments.wallet.orange" : "payments.wallet.etisalat";
    if (!(await getSetting<string>(key, ""))) throw new ApiError(400, "المحفظة المختارة غير مجهزة من إدارة المتجر");
  }
  if (!userId && !(await getSetting("checkout.guest.enabled", true)))
    throw new ApiError(401, "سجّل الدخول لإتمام الطلب");

  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return summary(existing);

  try {
    const order = await db.$transaction(
      async (tx) => {
        const q = await quote(tx, input.items, {
          governorate: input.address.governorate, couponCode: input.couponCode, userId, lockCoupon: true,
        });
        if (q.issues.length) throw new ApiError(409, q.issues[0]);
        if (q.couponError) throw new ApiError(400, q.couponError);
        if (q.shippingError || q.shippingCents == null) throw new ApiError(400, q.shippingError ?? "اختر المحافظة");
        const minTotal = await getSetting<number>("order.minTotal", 0);
        if (minTotal && q.subtotalCents < minTotal * 100) throw new ApiError(400, `الحد الأدنى للطلب ${minTotal} ج.م`);

        // Atomic stock deduction: the WHERE clause makes overselling impossible under concurrent orders.
        for (const it of q.items) {
          const n = await tx.$executeRaw`UPDATE "Inventory" SET "onHand" = "onHand" - ${it.quantity}::int, "updatedAt" = NOW()
            WHERE "variantId" = ${it.variantId} AND "onHand" - "reserved" >= ${it.quantity}::int`;
          if (n !== 1) throw new ApiError(409, `نفدت الكمية المطلوبة من ${it.productName} مقاس ${it.sizeLabel}`);
        }

        const created = await tx.order.create({
          data: {
            number: newNumber(),
            idempotencyKey: input.idempotencyKey,
            customerId: userId,
            customerName: input.customer.name,
            customerPhone: input.customer.phone,
            customerEmail: input.customer.email || null,
            shipGovernorate: input.address.governorate,
            shipCity: input.address.city,
            shipArea: input.address.area || null,
            shipAddress: input.address.addressLine,
            shipLandmark: input.address.landmark || null,
            deliveryNotes: input.notes || null,
            subtotal: fromCents(q.subtotalCents),
            discountTotal: fromCents(q.discountCents),
            shippingTotal: fromCents(q.shippingCents),
            taxTotal: fromCents(q.taxCents),
            grandTotal: fromCents(q.totalCents),
            couponCode: q.couponCode,
            paymentMethod: input.paymentMethod,
            paymentReceiptUrl: input.paymentMethod === "WALLET" ? input.paymentReceiptUrl : null,
            walletProvider: input.paymentMethod === "WALLET" ? input.walletProvider : null,
            status: "NEW",
            paymentStatus: input.paymentMethod === "COD" ? "UNPAID" : "PENDING",
            shippingStatus: "NOT_SHIPPED",
            inventoryDeducted: true,
            items: {
              create: q.items.map((i) => ({
                variantId: i.variantId, productName: i.productName, sku: i.sku, colorName: i.colorName,
                sizeLabel: i.sizeLabel, imageUrl: i.imageUrl, unitPrice: fromCents(i.unitCents),
                quantity: i.quantity, lineDiscount: "0.00", lineTotal: fromCents(i.lineCents),
              })),
            },
            history: { create: [{ field: "status", toValue: "NEW", note: "تم إنشاء الطلب" }] },
            payments: {
              create: {
                method: input.paymentMethod,
                provider: input.paymentMethod === "WALLET" ? input.walletProvider : null,
                status: input.paymentMethod === "COD" ? "UNPAID" : "PENDING",
                amountDue: fromCents(q.totalCents),
              },
            },
          },
        });

        if (q.couponId)
          await tx.couponUsage.create({ data: { couponId: q.couponId, orderId: created.id, userId, discount: fromCents(q.discountCents) } });

        for (const it of q.items) {
          const inv = await tx.inventory.findUniqueOrThrow({ where: { variantId: it.variantId } });
          await tx.inventoryMovement.create({
            data: { inventoryId: inv.id, type: "SALE", quantity: -it.quantity, orderId: created.id, reason: `طلب ${created.number}` },
          });
          await tx.product.update({ where: { id: it.productId }, data: { soldCount: { increment: it.quantity } } });
          if (inv.onHand <= 0)
            await tx.notification.create({ data: { type: "OUT_OF_STOCK", message: `نفد ${it.productName} مقاس ${it.sizeLabel}`, refId: it.variantId } });
          else if (inv.onHand <= inv.lowStockAt)
            await tx.notification.create({ data: { type: "LOW_STOCK", message: `مخزون منخفض: ${it.productName} مقاس ${it.sizeLabel} (${inv.onHand})`, refId: it.variantId } });
        }
        await tx.notification.create({ data: { type: "NEW_ORDER", message: `طلب جديد ${created.number}`, refId: created.id } });
        return created;
      },
      { timeout: 20000 },
    );
    void notifyCustomer(order.customerEmail, order.customerId, `تم استلام طلبك ${order.number}`, `شكرًا لك. تم استلام طلبك رقم ${order.number} بإجمالي ${order.grandTotal} ج.م وسنتواصل معك لتأكيده.`);
    return summary(order);
  } catch (e) {
    // Same idempotency key submitted twice at once: return the order that won.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (again) return summary(again);
    }
    throw e;
  }
}

const summary = (o: { number: string; grandTotal: Prisma.Decimal; customerPhone: string }) => ({
  number: o.number,
  total: o.grandTotal.toString(),
  phone: o.customerPhone,
});

const SHIP_MAP: Partial<Record<OrderStatus, "PREPARING" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "RETURNED">> = {
  PROCESSING: "PREPARING", SHIPPED: "SHIPPED", OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY", DELIVERED: "DELIVERED", RETURNED: "RETURNED",
};

export async function changeOrderStatus(orderId: string, to: OrderStatus, actorId: string, note?: string) {
  const result = await db.$transaction(async (tx) => {
    // Row lock: two staff members clicking at once cannot both restore stock.
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const o = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, payments: true } });
    if (!o) throw new ApiError(404, "الطلب غير موجود");
    const from = o.status as OrderStatus;
    if (from === to) throw new ApiError(409, "الطلب بهذه الحالة بالفعل");
    if (!canTransition(from, to))
      throw new ApiError(409, `لا يمكن تحويل الطلب من «${STATUS_AR[from]}» إلى «${STATUS_AR[to]}»`);

    const data: Prisma.OrderUncheckedUpdateInput = { status: to };
    const history: { field: string; fromValue: string; toValue: string; note?: string }[] = [
      { field: "status", fromValue: from, toValue: to, note },
    ];

    const ship = SHIP_MAP[to];
    if (ship && ship !== o.shippingStatus) {
      data.shippingStatus = ship;
      history.push({ field: "shippingStatus", fromValue: o.shippingStatus, toValue: ship });
    }

    if (to === "CANCELLED") {
      if (o.inventoryDeducted && !o.inventoryRestored) {
        for (const it of o.items) {
          if (!it.variantId) continue;
          await tx.$executeRaw`UPDATE "Inventory" SET "onHand" = "onHand" + ${it.quantity}::int, "updatedAt" = NOW() WHERE "variantId" = ${it.variantId}`;
          const inv = await tx.inventory.findUnique({ where: { variantId: it.variantId } });
          if (inv)
            await tx.inventoryMovement.create({
              data: { inventoryId: inv.id, type: "RETURN_RESTOCK", quantity: it.quantity, orderId: o.id, actorId, reason: `إلغاء الطلب ${o.number}` },
            });
          const v = await tx.productVariant.findUnique({ where: { id: it.variantId }, select: { productId: true } });
          if (v) await tx.product.update({ where: { id: v.productId }, data: { soldCount: { decrement: it.quantity } } });
        }
        data.inventoryRestored = true;
      }
      await tx.couponUsage.deleteMany({ where: { orderId: o.id } });
    }

    if (to === "DELIVERED" && o.paymentMethod === "COD" && o.paymentStatus !== "PAID") {
      data.paymentStatus = "PAID";
      history.push({ field: "paymentStatus", fromValue: o.paymentStatus, toValue: "PAID", note: "تحصيل عند الاستلام" });
      for (const p of o.payments)
        await tx.payment.update({ where: { id: p.id }, data: { status: "PAID", amountPaid: p.amountDue, paidAt: new Date() } });
    }

    await tx.order.update({ where: { id: o.id }, data });
    await tx.orderStatusHistory.createMany({ data: history.map((h) => ({ orderId: o.id, actorId, ...h })) });
    await audit(tx, actorId, "order.status", "Order", o.id, { from, to, note });
    return { id: o.id, status: to, number: o.number, email: o.customerEmail, userId: o.customerId };
  });
  void notifyCustomer(result.email, result.userId, `تحديث طلبك ${result.number}`, `أصبحت حالة طلبك رقم ${result.number}: ${STATUS_AR[to]}.`);
  return { id: result.id, status: result.status };
}
