import { redirect } from "next/navigation";
import MarkRead from "@/components/MarkRead";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/perm";

const LABEL: Record<string, string> = { NEW_ORDER: "طلب جديد", LOW_STOCK: "مخزون منخفض", OUT_OF_STOCK: "نفاد منتج", PAYMENT_FAILED: "فشل دفع", RETURN_REQUEST: "طلب استرجاع", SYSTEM_ERROR: "تنبيه نظام", CONTACT: "رسالة تواصل" };

export default async function Notifications() {
  const staff = await getStaff();
  if (!staff?.perms.has("order.view")) redirect("/admin");
  const rows = await db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 60 });
  return (
    <>
      <h1>الإشعارات</h1><MarkRead />
      {rows.length === 0 ? <div className="empty">لا توجد إشعارات.</div> : <table className="tbl"><tbody>{rows.map((n) => (
        <tr key={n.id} style={{ fontWeight: n.readAt ? 400 : 800 }}><td>{LABEL[n.type] ?? n.type}</td><td>{n.message}</td><td>{n.createdAt.toLocaleString("ar-EG")}</td></tr>
      ))}</tbody></table>}
    </>
  );
}
