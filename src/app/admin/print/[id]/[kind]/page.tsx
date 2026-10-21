import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/perm";
import { getSettings } from "@/lib/settings";
import { PAYMENT_AR } from "@/lib/core";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Print({ params }: { params: { id: string; kind: string } }) {
  const staff = await getStaff();
  if (!staff?.perms.has("order.view")) redirect("/admin/login");
  if (!["invoice", "pick"].includes(params.kind)) notFound();
  const o = await db.order.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!o) notFound();
  const st = await getSettings(["store.name", "contact.phone", "contact.email", "contact.address", "tax.rate", "tax.included"]);
  const m = (x: unknown) => `${Number(x).toLocaleString("ar-EG")} ج.م`;
  const pii = staff.perms.has("customer.view");
  const invoice = params.kind === "invoice";
  return (
    <div className="pg" style={{ background: "#fff", color: "#000", maxWidth: 800 }}>
      <p className="noprint" style={{ color: "#666" }}>للطباعة اضغط Ctrl+P (أو قائمة المتصفح ← طباعة).</p>
      <h1 style={{ marginBottom: 0 }}>{invoice ? "فاتورة" : "قائمة تجهيز الطلب"} — {String(st["store.name"] ?? "")}</h1>
      <div style={{ fontSize: 13 }}>{[st["contact.phone"], st["contact.email"], st["contact.address"]].filter(Boolean).join(" • ")}</div>
      <hr />
      <div>رقم الطلب: <b>{o.number}</b> • التاريخ: {o.createdAt.toLocaleString("ar-EG")}</div>
      {pii && <div>العميل: {o.customerName} — {o.customerPhone}<br />العنوان: {o.shipGovernorate}، {o.shipCity}، {o.shipAddress}{o.shipLandmark ? ` (${o.shipLandmark})` : ""}{o.deliveryNotes ? <><br />ملاحظات: {o.deliveryNotes}</> : null}</div>}
      <table className="tbl" style={{ marginTop: 10 }}>
        <thead><tr>{!invoice && <th>✓</th>}<th>المنتج</th><th>اللون / المقاس</th><th>الكمية</th>{invoice && <><th>السعر</th><th>الإجمالي</th></>}</tr></thead>
        <tbody>{o.items.map((i) => (
          <tr key={i.id}>{!invoice && <td>☐</td>}<td>{i.productName}<br /><small>{i.sku}</small></td><td>{i.colorName} / {i.sizeLabel}</td><td>{i.quantity}</td>{invoice && <><td>{m(i.unitPrice)}</td><td>{m(i.lineTotal)}</td></>}</tr>
        ))}</tbody>
      </table>
      {invoice && (
        <div className="tot" style={{ maxWidth: 320, marginInlineStart: "auto", marginTop: 10 }}>
          <div><span>المجموع</span><span>{m(o.subtotal)}</span></div>
          {Number(o.discountTotal) > 0 && <div><span>الخصم{o.couponCode ? ` (${o.couponCode})` : ""}</span><span>−{m(o.discountTotal)}</span></div>}
          <div><span>الشحن</span><span>{Number(o.shippingTotal) === 0 ? "مجاني" : m(o.shippingTotal)}</span></div>
          {Number(o.taxTotal) > 0 && <div><span>{st["tax.included"] === true ? "شامل ضريبة" : "ضريبة"} ({Number(st["tax.rate"] ?? 0)}٪)</span><span>{m(o.taxTotal)}</span></div>}
          <div className="g"><span>الإجمالي</span><span>{m(o.grandTotal)}</span></div>
          <div><span>طريقة الدفع</span><span>{o.paymentMethod === "COD" ? "عند الاستلام" : "إلكتروني"}</span></div>
          <div><span>حالة الدفع</span><span>{PAYMENT_AR[o.paymentStatus]}</span></div>
        </div>
      )}
    </div>
  );
}
