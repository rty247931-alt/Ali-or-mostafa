import { redirect } from "next/navigation";
import CustomerNotes from "@/components/CustomerNotes";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/perm";

export default async function Customers({ searchParams }: { searchParams: { q?: string } }) {
  const staff = await getStaff();
  if (!staff?.perms.has("customer.view")) redirect("/admin");
  const q = searchParams.q?.trim();
  const users = await db.user.findMany({
    where: { kind: "CUSTOMER", ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: { createdAt: "desc" }, take: 100,
    include: { profile: true, orders: { where: { status: { not: "CANCELLED" } }, select: { grandTotal: true, createdAt: true, number: true }, orderBy: { createdAt: "desc" } } },
  });
  return (
    <>
      <h1>العملاء</h1>
      <form className="tools" method="get"><input className="in" name="q" defaultValue={q} placeholder="الاسم أو الهاتف أو البريد" aria-label="بحث" /><button className="btn sm" type="submit">بحث</button><a className="btn o sm" href="/api/admin/reports/export?type=customers">تصدير العملاء CSV</a><a className="btn o sm" href="/api/admin/reports/export?type=subscribers">مشتركو النشرة</a></form>
      {users.length === 0 ? <div className="empty">لا يوجد عملاء مسجلون.</div> : users.map((u) => (
        <details key={u.id} className="box" style={{ marginBottom: 8 }}>
          <summary><b>{u.fullName}</b> — {u.phone ?? u.email} — {u.orders.length.toLocaleString("ar-EG")} طلب {u.isActive ? "" : "(موقوف)"}</summary>
          <table className="tbl"><tbody>
            <tr><td>تاريخ التسجيل</td><td>{u.createdAt.toLocaleDateString("ar-EG")}</td></tr>
            <tr><td>إجمالي المشتريات (بدون الملغي)</td><td>{u.orders.reduce((a, o) => a + Number(o.grandTotal), 0).toLocaleString("ar-EG")} ج.م</td></tr>
            <tr><td>آخر طلب</td><td>{u.orders[0] ? `${u.orders[0].number} — ${u.orders[0].createdAt.toLocaleDateString("ar-EG")}` : "—"}</td></tr>
          </tbody></table>
          <CustomerNotes id={u.id} notes={u.profile?.internalNotes ?? ""} />
        </details>
      ))}
    </>
  );
}
