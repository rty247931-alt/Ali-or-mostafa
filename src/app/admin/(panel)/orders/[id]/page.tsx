import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import OrderActions from "@/components/OrderActions";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/perm";
import { PAYMENT_AR, SHIPPING_AR, STATUS_AR, nextStatuses, toCents, type OrderStatus } from "@/lib/core";

export default async function OrderDetail({ params }: { params: { id: string } }) {
  const staff = await getStaff();
  if (!staff?.perms.has("order.view")) redirect("/admin");
  const o = await db.order.findUnique({
    where: { id: params.id },
    include: { items: true, history: { orderBy: { createdAt: "asc" }, include: { actor: { select: { fullName: true } } } }, payments: { include: { refunds: true } }, shipments: true },
  });
  if (!o) notFound();
  const pii = staff.perms.has("customer.view");
  const paid = o.payments.reduce((a, p) => a + toCents(p.amountPaid), 0);
  const refunded = o.payments.flatMap((p) => p.refunds).reduce((a, r) => a + toCents(r.amount), 0);
  const m = (x: unknown) => `${Number(x).toLocaleString("ar-EG")} ج.م`;
  return (
    <>
      <h1>طلب {o.number}</h1>
      <p><Link className="btn o sm" href={`/admin/print/${o.id}/invoice`} target="_blank">طباعة الفاتورة</Link> <Link className="btn o sm" href={`/admin/print/${o.id}/pick`} target="_blank">قائمة التجهيز</Link></p>
      <div className="box">
        <div>الحالة: <b>{STATUS_AR[o.status as OrderStatus]}</b> • الدفع: <b>{PAYMENT_AR[o.paymentStatus]}</b> • الشحن: <b>{SHIPPING_AR[o.shippingStatus]}</b></div>
        <div>طريقة الدفع: {o.paymentMethod === "COD" ? "عند الاستلام" : "إلكتروني"}{o.couponCode ? ` • كوبون ${o.couponCode}` : ""}</div>
        {pii ? <div>العميل: {o.customerName} — {o.customerPhone}{o.customerEmail ? ` — ${o.customerEmail}` : ""}<br />العنوان: {o.shipGovernorate}، {o.shipCity}{o.shipArea ? `، ${o.shipArea}` : ""}، {o.shipAddress}{o.shipLandmark ? ` (${o.shipLandmark})` : ""}{o.deliveryNotes ? <><br />ملاحظات التوصيل: {o.deliveryNotes}</> : null}</div> : <div style={{ color: "var(--mu)" }}>بيانات العميل مخفية لصلاحياتك.</div>}
      </div>
      <h2>المنتجات</h2>
      <table className="tbl"><tbody>{o.items.map((i) => <tr key={i.id}><td>{i.productName}<br /><small>{i.colorName} • مقاس {i.sizeLabel} • {i.sku}</small></td><td>{i.quantity} × {m(i.unitPrice)}</td><td>{m(i.lineTotal)}</td></tr>)}</tbody></table>
      <div className="box tot" style={{ marginTop: 8 }}>
        <div><span>المجموع</span><span>{m(o.subtotal)}</span></div><div><span>الخصم</span><span>−{m(o.discountTotal)}</span></div>
        <div><span>الشحن</span><span>{m(o.shippingTotal)}</span></div>{Number(o.taxTotal) > 0 && <div><span>الضريبة</span><span>{m(o.taxTotal)}</span></div>}
        <div className="g"><span>الإجمالي</span><span>{m(o.grandTotal)}</span></div>
        <div><span>المدفوع</span><span>{(paid / 100).toLocaleString("ar-EG")} ج.م</span></div><div><span>المسترد</span><span>{(refunded / 100).toLocaleString("ar-EG")} ج.م</span></div>
      </div>
      {o.shipments.length > 0 && <><h2>الشحنات</h2><ul>{o.shipments.map((s) => <li key={s.id}>{s.carrier} — {s.trackingNo ?? "بدون رقم تتبع"} — {s.shippedAt?.toLocaleString("ar-EG")}</li>)}</ul></>}
      {o.internalNotes && <><h2>ملاحظات داخلية</h2><div className="box" style={{ whiteSpace: "pre-wrap" }}>{o.internalNotes}</div></>}
      <h2>سجل الطلب</h2>
      <ul className="tl">{o.history.map((h) => <li key={h.id} className="d">{h.field === "status" ? STATUS_AR[h.toValue as OrderStatus] ?? h.toValue : h.field === "paymentStatus" ? `الدفع: ${PAYMENT_AR[h.toValue] ?? h.toValue}` : `الشحن: ${SHIPPING_AR[h.toValue] ?? h.toValue}`} — {h.createdAt.toLocaleString("ar-EG")}{h.actor ? ` — ${h.actor.fullName}` : ""}{h.note ? ` (${h.note})` : ""}</li>)}</ul>
      <OrderActions id={o.id} canChange={staff.perms.has("order.status")} options={nextStatuses(o.status as OrderStatus).map((s) => ({ value: s, label: STATUS_AR[s] }))} refundable={Math.max(0, (paid - refunded) / 100)} />
    </>
  );
}
