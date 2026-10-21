import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { PAYMENT_AR, SHIPPING_AR, STATUS_AR, type OrderStatus } from "@/lib/core";

export const metadata: Metadata = { title: "طلباتي", robots: { index: false, follow: false } };

export default async function MyOrders() {
  const s = await getSession();
  if (!s) redirect("/account");
  const user = await db.user.findUnique({ where: { id: s.uid }, select: { fullName: true } });
  // Only this user's orders: the filter is on the server, not in the browser.
  const orders = await db.order.findMany({ where: { customerId: s.uid }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="pg">
      <h1>أهلًا {user?.fullName.split(" ")[0]}</h1><LogoutButton /> <Link className="btn o sm" href="/account/profile">بياناتي وعناويني</Link> <Link className="btn o sm" href="/account/favorites">المفضلة</Link>
      <h2>طلباتي</h2>
      {orders.length === 0 ? <div className="empty">لا توجد طلبات بعد.</div> : orders.map((o) => (
        <Link key={o.id} href={`/order/${o.number}`} className="box" style={{ display: "block", marginBottom: 8 }}>
          <b>{o.number}</b> • {Number(o.grandTotal).toLocaleString("ar-EG")} ج.م
          <div style={{ color: "var(--mu)", fontSize: 13 }}>{o.createdAt.toLocaleDateString("ar-EG")} • {STATUS_AR[o.status as OrderStatus]} • دفع: {PAYMENT_AR[o.paymentStatus]} • شحن: {SHIPPING_AR[o.shippingStatus]}</div>
        </Link>
      ))}
    </div>
  );
}
