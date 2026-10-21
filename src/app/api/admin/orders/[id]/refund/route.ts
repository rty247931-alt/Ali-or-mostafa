import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { requirePerm } from "@/lib/perm";
import { fromCents, toCents } from "@/lib/core";

const schema = z.object({ amount: z.number().positive().max(1_000_000), reason: z.string().trim().min(3).max(200) });

// Records a refund that has ALREADY been paid back to the customer. It never moves money by itself.
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { userId } = await requirePerm("order.status");
  const d = schema.parse(await req.json());
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${params.id} FOR UPDATE`;
    const o = await tx.order.findUnique({ where: { id: params.id }, include: { payments: { include: { refunds: true } } } });
    if (!o) throw new ApiError(404, "الطلب غير موجود");
    const pay = o.payments.find((p) => toCents(p.amountPaid) > 0);
    if (!pay) throw new ApiError(409, "لا توجد دفعة مسجلة على هذا الطلب لاسترداد جزء منها");
    const refunded = pay.refunds.reduce((a, r) => a + toCents(r.amount), 0);
    const cents = toCents(d.amount);
    if (cents > toCents(pay.amountPaid) - refunded) throw new ApiError(400, "المبلغ أكبر من المتاح للاسترداد");
    await tx.refund.create({ data: { paymentId: pay.id, amount: fromCents(cents), reason: d.reason } });
    const full = refunded + cents >= toCents(pay.amountPaid);
    const status = full ? "REFUNDED" : "PARTIALLY_REFUNDED";
    await tx.payment.update({ where: { id: pay.id }, data: { status } });
    await tx.order.update({ where: { id: o.id }, data: { paymentStatus: status } });
    await tx.orderStatusHistory.create({ data: { orderId: o.id, actorId: userId, field: "paymentStatus", fromValue: o.paymentStatus, toValue: status, note: d.reason } });
    await audit(tx, userId, "refund.record", "Order", o.id, { amount: d.amount, reason: d.reason });
  });
  return json({ ok: true });
});
