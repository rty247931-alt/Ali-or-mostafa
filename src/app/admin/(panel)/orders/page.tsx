import { redirect } from "next/navigation";
import OrderStatusSelect from "@/components/OrderStatusSelect";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/perm";
import { PAYMENT_AR, SHIPPING_AR, STATUS_AR, nextStatuses, type OrderStatus } from "@/lib/core";

export default async function AdminOrders({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const staff = await getStaff();
  if (!staff?.perms.has("order.view")) redirect("/admin");
  const canChange = staff.perms.has("order.status");
  const q = searchParams.q?.trim();
  const status = Object.keys(STATUS_AR).includes(searchParams.status ?? "") ? (searchParams.status as OrderStatus) : undefined;
  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { customerPhone: { contains: q } }, { customerName: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" }, take: 100, include: { items: true },
  });
  return (
    <>
      <h1>الطلبات</h1>
      <form className="tools" method="get">
        <input className="in" name="q" defaultValue={q} placeholder="رقم الطلب أو الاسم أو الهاتف" aria-label="بحث" />
        <select className="in" name="status" defaultValue={status ?? ""} aria-label="الحالة"><option value="">كل الحالات</option>{Object.entries(STATUS_AR).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <button className="btn sm" type="submit">بحث</button>
      </form>
      {orders.length === 0 ? <div className="empty">لا توجد طلبات مطابقة.</div> : (
        <div className="scroll"><table className="tbl">
          <thead><tr><th>الطلب</th><th>العميل</th><th>الإجمالي</th><th>الدفع</th><th>الحالة</th><th>الشحن</th><th>إجراء</th></tr></thead>
          <tbody>{orders.map((o) => (
            <tr key={o.id}>
              <td><a href={`/admin/orders/${o.id}`} style={{ color: "var(--ac)" }}><b>{o.number}</b></a><br /><small>{o.createdAt.toLocaleString("ar-EG")}</small></td>
              <td>{staff.perms.has("customer.view") ? <>{o.customerName}<br /><small>{o.customerPhone}</small><br /><small>{o.shipGovernorate} — {o.shipCity} — {o.shipAddress}</small></> : "—"}
                <br /><small>{o.items.map((i) => `${i.productName} ${i.colorName} م${i.sizeLabel}×${i.quantity}`).join("، ")}</small></td>
              <td>{Number(o.grandTotal).toLocaleString("ar-EG")} ج.م</td>
              <td>{o.paymentMethod === "COD" ? "عند الاستلام" : o.paymentMethod === "WALLET" ? `محفظة إلكترونية (${o.walletProvider === "vodafone" ? "فودافون كاش" : o.walletProvider === "orange" ? "أورنج كاش" : "اتصالات كاش"})` : "إلكتروني"}<br /><small>{PAYMENT_AR[o.paymentStatus]}</small>{o.paymentReceiptUrl && <><br /><a href={o.paymentReceiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ac)" }}>عرض إيصال التحويل</a></>}</td>
              <td>{STATUS_AR[o.status as OrderStatus]}</td>
              <td>{SHIPPING_AR[o.shippingStatus]}</td>
              <td>{canChange ? <OrderStatusSelect id={o.id} options={nextStatuses(o.status as OrderStatus).map((s) => ({ value: s, label: STATUS_AR[s] }))} /> : "—"}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
