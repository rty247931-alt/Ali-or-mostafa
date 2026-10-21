import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPaymobHmac } from "@/lib/paymob";
import { fromCents, toCents } from "@/lib/core";

// The redirect back to the site proves nothing. ONLY this signed server-to-server callback marks an order as paid.
export async function POST(req: Request) {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  const received = new URL(req.url).searchParams.get("hmac") ?? "";
  let body: { obj?: Record<string, any> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad body" }, { status: 400 }); }
  const obj = body.obj;
  if (!secret || !obj || !verifyPaymobHmac(obj, received, secret)) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  const number = String(obj.order?.merchant_order_id ?? "").split("~")[0];
  const order = await db.order.findUnique({ where: { number }, include: { payments: true } });
  if (!order) return NextResponse.json({ ok: true });
  if (obj.is_refunded === true || obj.is_voided === true) return NextResponse.json({ ok: true }); // refunds are recorded by staff

  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
    const fresh = await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    const pay = fresh.payments[0];
    if (!pay || fresh.paymentStatus === "PAID") return; // duplicate callback: nothing to do
    if (obj.pending === true) return;
    if (obj.success === true) {
      if (obj.amount_cents !== toCents(fresh.grandTotal) || obj.currency !== "EGP") {
        await tx.notification.create({ data: { type: "SYSTEM_ERROR", message: `مبلغ دفع غير مطابق للطلب ${fresh.number}`, refId: fresh.id } });
        return;
      }
      await tx.payment.update({ where: { id: pay.id }, data: { status: "PAID", provider: "paymob", providerRef: String(obj.id), amountPaid: fromCents(toCents(fresh.grandTotal)), paidAt: new Date() } });
      await tx.order.update({ where: { id: fresh.id }, data: { paymentStatus: "PAID" } });
      await tx.orderStatusHistory.create({ data: { orderId: fresh.id, field: "paymentStatus", fromValue: fresh.paymentStatus, toValue: "PAID", note: "تأكيد من بوابة الدفع" } });
    } else {
      await tx.payment.update({ where: { id: pay.id }, data: { status: "FAILED", provider: "paymob" } });
      await tx.order.update({ where: { id: fresh.id }, data: { paymentStatus: "FAILED" } });
      await tx.orderStatusHistory.create({ data: { orderId: fresh.id, field: "paymentStatus", fromValue: fresh.paymentStatus, toValue: "FAILED", note: "فشل الدفع" } });
      await tx.notification.create({ data: { type: "PAYMENT_FAILED", message: `فشل دفع الطلب ${fresh.number}`, refId: fresh.id } });
    }
  });
  return NextResponse.json({ ok: true });
}
