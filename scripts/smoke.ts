// Acceptance smoke test against a DEVELOPMENT database:   SMOKE_OK=1 npm run smoke
// Exercises the real services: concurrency, idempotency, coupons, stock restore, status rules.
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { changeOrderStatus, createOrder, orderInputSchema } from "../src/services/orders";

if (process.env.NODE_ENV === "production" || process.env.SMOKE_OK !== "1") {
  console.error("Refusing to run. Use a DEV database and set SMOKE_OK=1 (it creates and deletes test data).");
  process.exit(1);
}
const db = new PrismaClient();
const results: [string, boolean][] = [];
const check = (name: string, ok: boolean) => { results.push([name, ok]); console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); };
const TAG = { name: "اختبار نظام", phone: "01012345678" };
const tag = randomUUID().slice(0, 6);

const input = (variantId: string, extra: Record<string, unknown> = {}) =>
  orderInputSchema.parse({
    idempotencyKey: randomUUID() + randomUUID(), items: [{ variantId, quantity: 1 }], paymentMethod: "COD",
    customer: { name: TAG.name, phone: TAG.phone }, address: { governorate: "القاهرة", city: "مدينة اختبار", addressLine: "عنوان اختبار طويل" }, ...extra,
  });
const stock = async (variantId: string) => (await db.inventory.findUniqueOrThrow({ where: { variantId } })).onHand;
const rejects = async (p: Promise<unknown>) => { try { await p; return false; } catch { return true; } };

async function main() {
  const cat = await db.category.findFirstOrThrow();
  const color = await db.color.upsert({ where: { name: "SMOKE" }, update: {}, create: { name: "SMOKE" } });
  const size = await db.size.upsert({ where: { label: "99" }, update: {}, create: { label: "99", sortOrder: 99 } });
  const product = await db.product.create({
    data: { name: `SMOKE ${tag}`, slug: `smoke-${tag}`, sku: `SMOKE-${tag}`, categoryId: cat.id, basePrice: "100.00", currentPrice: "100.00", status: "ACTIVE" },
  });
  const variant = await db.productVariant.create({ data: { productId: product.id, colorId: color.id, sizeId: size.id, sku: `SMOKE-${tag}-V` } });
  await db.inventory.create({ data: { variantId: variant.id, onHand: 3 } });
  const staff = await db.user.create({ data: { kind: "STAFF", fullName: "Smoke Staff", email: `smoke-${tag}@example.test`, passwordHash: "x" } });
  const orderBy = (n: string) => db.order.findUniqueOrThrow({ where: { number: n } });

  try {
    // 1. concurrency: 5 buyers, 3 pieces
    const r = await Promise.allSettled(Array.from({ length: 5 }, () => createOrder(input(variant.id), null)));
    check("5 concurrent orders for 3 pieces: exactly 3 succeed", r.filter((x) => x.status === "fulfilled").length === 3);
    check("stock never goes negative (ends at 0)", (await stock(variant.id)) === 0);
    check("ordering an out-of-stock size is rejected", await rejects(createOrder(input(variant.id), null)));

    // 2. idempotency
    await db.inventory.update({ where: { variantId: variant.id }, data: { onHand: 2 } });
    const key = randomUUID() + randomUUID();
    const dup = await Promise.allSettled([createOrder(input(variant.id, { idempotencyKey: key }), null), createOrder(input(variant.id, { idempotencyKey: key }), null)]);
    const nums = new Set(dup.filter((x): x is PromiseFulfilledResult<{ number: string }> => x.status === "fulfilled").map((x) => x.value.number));
    check("same idempotency key twice creates ONE order", nums.size === 1);
    check("stock deducted once for the duplicate submit", (await stock(variant.id)) === 1);

    // 3. coupons
    await db.coupon.create({ data: { code: `SMOKEEXP${tag}`.toUpperCase(), type: "PERCENT", value: "10", endsAt: new Date(Date.now() - 86_400_000) } });
    await db.coupon.create({ data: { code: `SMOKEOK${tag}`.toUpperCase(), type: "PERCENT", value: "10" } });
    check("expired coupon is rejected", await rejects(createOrder(input(variant.id, { couponCode: `SMOKEEXP${tag}` }), null)));
    const withC = await createOrder(input(variant.id, { couponCode: `SMOKEOK${tag}` }), null);
    check("valid 10% coupon gives 10.00 discount on a 100.00 item", Number((await orderBy(withC.number)).discountTotal) === 10);

    // 4. cancel restores stock exactly once
    await db.inventory.update({ where: { variantId: variant.id }, data: { onHand: 2 } });
    const o1 = await createOrder(input(variant.id), null);
    const before = await stock(variant.id);
    const row = await orderBy(o1.number);
    await changeOrderStatus(row.id, "CANCELLED", staff.id, "smoke");
    check("cancel restores the piece", (await stock(variant.id)) === before + 1);
    check("cancelling again is rejected", await rejects(changeOrderStatus(row.id, "CANCELLED", staff.id)));
    check("stock not restored twice", (await stock(variant.id)) === before + 1);

    // 5. status rules + COD payment on delivery
    await db.inventory.update({ where: { variantId: variant.id }, data: { onHand: 2 } });
    const o2 = await orderBy((await createOrder(input(variant.id), null)).number);
    check("NEW → DELIVERED (skipping steps) is rejected", await rejects(changeOrderStatus(o2.id, "DELIVERED", staff.id)));
    for (const s of ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const) await changeOrderStatus(o2.id, s, staff.id);
    const done = await db.order.findUniqueOrThrow({ where: { id: o2.id } });
    check("COD order becomes PAID only when delivered", done.paymentStatus === "PAID" && done.shippingStatus === "DELIVERED");
    check("a delivered order cannot be cancelled", await rejects(changeOrderStatus(o2.id, "CANCELLED", staff.id)));
  } finally {
    const ids = (await db.order.findMany({ where: { customerName: TAG.name, customerPhone: TAG.phone }, select: { id: true } })).map((o) => o.id);
    await db.notification.deleteMany({ where: { OR: [{ refId: { in: ids } }, { refId: variant.id }] } });
    await db.couponUsage.deleteMany({ where: { orderId: { in: ids } } });
    await db.refund.deleteMany({ where: { payment: { orderId: { in: ids } } } });
    await db.payment.deleteMany({ where: { orderId: { in: ids } } });
    await db.order.deleteMany({ where: { id: { in: ids } } });
    await db.inventoryMovement.deleteMany({ where: { inventory: { variantId: variant.id } } });
    await db.product.delete({ where: { id: product.id } });
    await db.coupon.deleteMany({ where: { code: { in: [`SMOKEEXP${tag}`.toUpperCase(), `SMOKEOK${tag}`.toUpperCase()] } } });
    await db.auditLog.deleteMany({ where: { actorId: staff.id } });
    await db.orderStatusHistory.deleteMany({ where: { actorId: staff.id } });
    await db.user.delete({ where: { id: staff.id } });
  }
  const failed = results.filter(([, ok]) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
