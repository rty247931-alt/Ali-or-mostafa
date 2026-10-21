import { db } from "@/lib/db";
import { ApiError, route } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { permsOf, requirePerm } from "@/lib/perm";
import { toCsv } from "@/lib/csv";
import { unsubUrl } from "@/lib/unsub";
import { cairoEnd, cairoStart, validDay } from "@/lib/dates";
import { PAYMENT_AR, SHIPPING_AR, STATUS_AR, type OrderStatus } from "@/lib/core";

const csvResponse = (name: string, rows: unknown[][]) =>
  new Response(toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` } });

export const GET = route(async (req) => {
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type");
  const from = sp.get("from") ?? undefined, to = sp.get("to") ?? undefined;
  if (type === "orders") {
    const { userId } = await requirePerm("order.view");
    const perms = await permsOf(userId);
    const range = validDay(from) && validDay(to) ? { createdAt: { gte: cairoStart(from), lte: cairoEnd(to) } } : {};
    const rows = await db.order.findMany({ where: range, orderBy: { createdAt: "desc" }, take: 20000 });
    const pii = perms.has("customer.view");
    await audit(db, userId, "export.orders", "Order", null, { rows: rows.length, from, to });
    return csvResponse("orders.csv", [
      ["رقم الطلب", "التاريخ", "الحالة", "حالة الدفع", "حالة الشحن", "طريقة الدفع", "المحافظة", ...(pii ? ["الاسم", "الهاتف"] : []), "المجموع", "الخصم", "الشحن", "الضريبة", "الإجمالي", "الكوبون"],
      ...rows.map((o) => [o.number, o.createdAt, STATUS_AR[o.status as OrderStatus], PAYMENT_AR[o.paymentStatus], SHIPPING_AR[o.shippingStatus], o.paymentMethod === "COD" ? "عند الاستلام" : "إلكتروني", o.shipGovernorate, ...(pii ? [o.customerName, o.customerPhone] : []), Number(o.subtotal), Number(o.discountTotal), Number(o.shippingTotal), Number(o.taxTotal), Number(o.grandTotal), o.couponCode ?? ""]),
    ]);
  }
  if (type === "customers") {
    const { userId } = await requirePerm("customer.view");
    const users = await db.user.findMany({ where: { kind: "CUSTOMER" }, orderBy: { createdAt: "desc" }, take: 20000, include: { orders: { where: { status: { not: "CANCELLED" } }, select: { grandTotal: true, createdAt: true } } } });
    await audit(db, userId, "export.customers", "User", null, { rows: users.length });
    return csvResponse("customers.csv", [
      ["الاسم", "الهاتف", "البريد", "تاريخ التسجيل", "عدد الطلبات", "إجمالي المشتريات", "آخر طلب"],
      ...users.map((u) => [u.fullName, u.phone ?? "", u.email ?? "", u.createdAt, u.orders.length, u.orders.reduce((a, o) => a + Number(o.grandTotal), 0), u.orders.length ? new Date(Math.max(...u.orders.map((o) => o.createdAt.getTime()))) : ""]),
    ]);
  }
  if (type === "subscribers") {
    const { userId } = await requirePerm("customer.view");
    const subs = await db.newsletterSubscriber.findMany({ where: { unsubscribedAt: null }, orderBy: { consentAt: "desc" }, take: 50000 });
    await audit(db, userId, "export.subscribers", "NewsletterSubscriber", null, { rows: subs.length });
    return csvResponse("subscribers.csv", [["البريد", "تاريخ الموافقة", "رابط إلغاء الاشتراك (ضعه في كل رسالة)"], ...subs.map((x) => [x.email, x.consentAt, unsubUrl(x.email)])]);
  }
  throw new ApiError(400, "نوع التقرير غير معروف");
});
