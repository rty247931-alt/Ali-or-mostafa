import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { getSession } from "@/lib/session";
import PayNowButton from "@/components/PayNowButton";
import ReorderButton from "@/components/ReorderButton";
import { PAYMENT_AR, SHIPPING_AR, STATUS_AR, type OrderStatus } from "@/lib/core";

export const metadata: Metadata = { title: "تفاصيل الطلب", robots: { index: false, follow: false } };
const FLOW: OrderStatus[] = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

export default async function OrderPage({ params, searchParams }: { params: { number: string }; searchParams: { phone?: string } }) {
  const order = await db.order.findUnique({ where: { number: params.number }, include: { shipments: true, items: true, history: { orderBy: { createdAt: "asc" } } } });
  const s = await getSession();
  // Ownership check: the logged-in owner, or a guest who knows the order number AND the phone used on it.
  const allowed = !!order && ((s && order.customerId === s.uid) || (searchParams.phone && searchParams.phone === order.customerPhone));
  if (!order || !allowed) return <div className="pg"><h1>الطلب غير موجود</h1><p>تأكد من رقم الطلب أو سجّل الدخول بحسابك.</p></div>;

  const tpl = await getSetting<string>("shipping.trackingUrl", "");
  const idx = FLOW.indexOf(order.status as OrderStatus);
  return (
    <div className="pg">
      <h1>طلب {order.number}</h1>
      <p className="ok">تم استلام طلبك بنجاح.</p>
      <div className="box">
        <div>حالة الطلب: <b>{STATUS_AR[order.status as OrderStatus]}</b></div>
        <div>حالة الدفع: <b>{PAYMENT_AR[order.paymentStatus]}</b></div>
        <div>حالة الشحن: <b>{SHIPPING_AR[order.shippingStatus]}</b></div>
        {order.status !== "CANCELLED" && idx >= 0 && (
          <ul className="tl">{FLOW.map((s, i) => <li key={s} className={i <= idx ? "d" : ""}>{STATUS_AR[s]}</li>)}</ul>
        )}
      </div>
      {order.paymentMethod === "ONLINE" && order.paymentStatus === "PENDING" && order.status !== "CANCELLED" && <p><PayNowButton number={order.number} phone={order.customerPhone} /></p>}
      <p><ReorderButton items={order.items.filter((i) => i.variantId).map((i) => ({ variantId: i.variantId!, quantity: i.quantity }))} /></p>
      {order.shipments.length > 0 && <div className="box" style={{ marginTop: 10 }}>{order.shipments.map((sh) => (
        <div key={sh.id}>شركة الشحن: <b>{sh.carrier}</b>{sh.trackingNo && <> — رقم التتبع: <b>{sh.trackingNo}</b>{tpl.startsWith("https://") && tpl.includes("{tracking}") && <> — <a style={{ color: "var(--ac)" }} href={tpl.replace("{tracking}", encodeURIComponent(sh.trackingNo))} target="_blank" rel="noopener noreferrer">تتبع الشحنة</a></>}</>}</div>
      ))}</div>}
      <h2>المنتجات</h2>
      <table className="tbl"><tbody>{order.items.map((i) => (
        <tr key={i.id}><td>{i.productName}<br /><small>{i.colorName} • مقاس {i.sizeLabel} × {i.quantity}</small></td><td>{Number(i.lineTotal).toLocaleString("ar-EG")} ج.م</td></tr>
      ))}</tbody></table>
      <div className="box tot" style={{ marginTop: 10 }}>
        <div><span>المجموع</span><span>{Number(order.subtotal).toLocaleString("ar-EG")} ج.م</span></div>
        {Number(order.discountTotal) > 0 && <div><span>الخصم</span><span>−{Number(order.discountTotal).toLocaleString("ar-EG")} ج.م</span></div>}
        <div><span>الشحن</span><span>{Number(order.shippingTotal) === 0 ? "مجاني" : `${Number(order.shippingTotal).toLocaleString("ar-EG")} ج.م`}</span></div>
        <div className="g"><span>الإجمالي</span><span>{Number(order.grandTotal).toLocaleString("ar-EG")} ج.م</span></div>
      </div>
      <h2>سجل الطلب</h2>
      <ul className="tl">{order.history.map((h) => <li key={h.id} className="d">{h.field === "status" ? STATUS_AR[h.toValue as OrderStatus] ?? h.toValue : h.field === "paymentStatus" ? `الدفع: ${PAYMENT_AR[h.toValue] ?? h.toValue}` : `الشحن: ${SHIPPING_AR[h.toValue] ?? h.toValue}`} — {h.createdAt.toLocaleString("ar-EG")}</li>)}</ul>
    </div>
  );
}
