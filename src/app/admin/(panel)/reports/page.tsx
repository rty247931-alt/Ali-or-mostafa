import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/perm";
import { cairoEnd, cairoStart, isoDay, validDay } from "@/lib/dates";
import { PAYMENT_AR, STATUS_AR, type OrderStatus } from "@/lib/core";

const n = (x: number) => x.toLocaleString("ar-EG", { maximumFractionDigits: 2 });
const egp = (x: number) => `${n(x)} ج.م`;
const pct = (cur: number, prev: number) => (prev === 0 ? (cur === 0 ? "—" : "جديد") : `${cur >= prev ? "+" : ""}${n(((cur - prev) / prev) * 100)}٪`);

export default async function Reports({ searchParams }: { searchParams: { from?: string; to?: string; status?: string; category?: string } }) {
  const staff = await getStaff();
  if (!staff?.perms.has("report.view")) redirect("/admin");
  const fin = staff.perms.has("report.finance");

  const today = isoDay(new Date());
  const to = validDay(searchParams.to) ? searchParams.to : today;
  const from = validDay(searchParams.from) ? searchParams.from : isoDay(new Date(Date.now() - 29 * 864e5));
  const start = cairoStart(from), end = cairoEnd(to);
  const span = end.getTime() - start.getTime() + 1;
  const pStart = new Date(start.getTime() - span), pEnd = new Date(start.getTime() - 1);
  const live = { not: "CANCELLED" as const };
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  const statusF = Object.keys(STATUS_AR).includes(searchParams.status ?? "") ? (searchParams.status as OrderStatus) : null;
  const catF = cats.some((c) => c.id === searchParams.category) ? searchParams.category! : null;
  const orderStatusSql = statusF ? Prisma.sql`AND o.status = ${statusF}::"OrderStatus"` : Prisma.sql`AND o.status <> 'CANCELLED'`;
  const catSql = catF ? Prisma.sql`AND p."categoryId" = ${catF}` : Prisma.empty;

  const sumNet = async (a: Date, b: Date) => {
    const [d, r] = await Promise.all([
      db.order.aggregate({ where: { status: "DELIVERED", createdAt: { gte: a, lte: b } }, _sum: { subtotal: true, discountTotal: true, shippingTotal: true } }),
      db.refund.aggregate({ where: { createdAt: { gte: a, lte: b } }, _sum: { amount: true } }),
    ]);
    const gross = Number(d._sum.subtotal ?? 0) - Number(d._sum.discountTotal ?? 0);
    return { net: gross - Number(r._sum.amount ?? 0), discounts: Number(d._sum.discountTotal ?? 0), shipping: Number(d._sum.shippingTotal ?? 0), refunds: Number(r._sum.amount ?? 0) };
  };

  const [cur, prev, nonCancelled, prevCount, byStatus, avg, daily, top, unsold, byCat, byBrand, sizeColor, byPay, newCust, returning] = await Promise.all([
    sumNet(start, end), sumNet(pStart, pEnd),
    db.order.count({ where: { createdAt: { gte: start, lte: end }, status: statusF ?? live } }),
    db.order.count({ where: { createdAt: { gte: pStart, lte: pEnd }, status: statusF ?? live } }),
    db.order.groupBy({ by: ["status"], where: { createdAt: { gte: start, lte: end } }, _count: true }),
    db.order.aggregate({ where: { createdAt: { gte: start, lte: end }, status: statusF ?? live }, _avg: { grandTotal: true } }),
    db.$queryRaw<{ day: string; orders: number; gross: number }[]>`
      SELECT to_char((o."createdAt" AT TIME ZONE 'Africa/Cairo')::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS orders, COALESCE(SUM(o."grandTotal"),0)::float AS gross
      FROM "Order" o WHERE o."createdAt" >= ${start} AND o."createdAt" <= ${end} ${orderStatusSql} GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ name: string; qty: number; revenue: number }[]>`
      SELECT oi."productName" AS name, SUM(oi.quantity)::int AS qty, SUM(oi."lineTotal")::float AS revenue
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" LEFT JOIN "ProductVariant" v ON v.id = oi."variantId" LEFT JOIN "Product" p ON p.id = v."productId"
      WHERE o."createdAt" >= ${start} AND o."createdAt" <= ${end} ${orderStatusSql} ${catSql}
      GROUP BY 1 ORDER BY qty DESC LIMIT 10`,
    db.$queryRaw<{ name: string }[]>`
      SELECT p.name FROM "Product" p WHERE p.status = 'ACTIVE' AND NOT EXISTS (
        SELECT 1 FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" JOIN "ProductVariant" v ON v.id = oi."variantId"
        WHERE v."productId" = p.id AND o."createdAt" >= ${start} AND o."createdAt" <= ${end} AND o.status <> 'CANCELLED') LIMIT 20`,
    db.$queryRaw<{ name: string; qty: number; revenue: number }[]>`
      SELECT c.name, SUM(oi.quantity)::int AS qty, SUM(oi."lineTotal")::float AS revenue FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId" JOIN "ProductVariant" v ON v.id = oi."variantId" JOIN "Product" p ON p.id = v."productId" JOIN "Category" c ON c.id = p."categoryId"
      WHERE o."createdAt" >= ${start} AND o."createdAt" <= ${end} AND o.status <> 'CANCELLED' GROUP BY 1 ORDER BY revenue DESC LIMIT 10`,
    db.$queryRaw<{ name: string; qty: number; revenue: number }[]>`
      SELECT b.name, SUM(oi.quantity)::int AS qty, SUM(oi."lineTotal")::float AS revenue FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId" JOIN "ProductVariant" v ON v.id = oi."variantId" JOIN "Product" p ON p.id = v."productId" JOIN "Brand" b ON b.id = p."brandId"
      WHERE o."createdAt" >= ${start} AND o."createdAt" <= ${end} ${orderStatusSql} ${catSql} GROUP BY 1 ORDER BY revenue DESC LIMIT 10`,
    db.$queryRaw<{ color: string; size: string; qty: number }[]>`
      SELECT oi."colorName" AS color, oi."sizeLabel" AS size, SUM(oi.quantity)::int AS qty FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" LEFT JOIN "ProductVariant" v ON v.id = oi."variantId" LEFT JOIN "Product" p ON p.id = v."productId"
      WHERE o."createdAt" >= ${start} AND o."createdAt" <= ${end} ${orderStatusSql} ${catSql} GROUP BY 1,2 ORDER BY qty DESC LIMIT 15`,
    db.order.groupBy({ by: ["paymentMethod"], where: { createdAt: { gte: start, lte: end }, status: live }, _count: true }),
    db.user.count({ where: { kind: "CUSTOMER", createdAt: { gte: start, lte: end } } }),
    db.$queryRaw<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM (SELECT "customerId" FROM "Order" WHERE "customerId" IS NOT NULL AND "createdAt" >= ${start} AND "createdAt" <= ${end} AND status <> 'CANCELLED' GROUP BY 1 HAVING COUNT(*) > 1) t`,
  ]);

  const total = byStatus.reduce((a, x) => a + x._count, 0);
  const delivered = byStatus.find((x) => x.status === "DELIVERED")?._count ?? 0;
  const maxDay = Math.max(1, ...daily.map((d) => d.gross));
  const maxStatus = Math.max(1, ...byStatus.map((x) => x._count));

  const Table = ({ rows, cols }: { rows: (string | number)[][]; cols: string[] }) => (
    rows.length === 0 ? <div className="empty">لا توجد بيانات في هذه الفترة.</div> :
      <div className="scroll"><table className="tbl"><thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
  );

  return (
    <>
      <h1>التقارير</h1>
      <form className="tools" method="get">
        <label>من <input className="in" type="date" name="from" defaultValue={from} /></label>
        <label>إلى <input className="in" type="date" name="to" defaultValue={to} /></label>
        <label>الحالة <select className="in" name="status" defaultValue={statusF ?? ""}><option value="">كل (بدون الملغي)</option>{Object.entries(STATUS_AR).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>القسم <select className="in" name="category" defaultValue={catF ?? ""}><option value="">كل الأقسام</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <button className="btn sm" type="submit">عرض</button>
        {staff.perms.has("order.view") && <a className="btn o sm" href={`/api/admin/reports/export?type=orders&from=${from}&to=${to}`}>تصدير الطلبات CSV</a>}
      </form>
      <p style={{ color: "var(--mu)", fontSize: 13 }}>الفترة بتوقيت القاهرة. المقارنة مع فترة مماثلة قبلها مباشرة.</p>
      <div className="kp">
        <div><span>طلبات (بدون الملغي)</span><b>{n(nonCancelled)}</b><span>{pct(nonCancelled, prevCount)} عن الفترة السابقة</span></div>
        <div><span>تم تسليمها</span><b>{n(delivered)}</b><span>معدل الإتمام {total ? n((delivered / total) * 100) : "—"}٪ من كل الطلبات</span></div>
        <div><span>متوسط قيمة الطلب</span><b>{egp(Number(avg._avg.grandTotal ?? 0))}</b><span>بدون الملغي</span></div>
        <div><span>عملاء جدد / عائدون</span><b>{n(newCust)} / {n(returning[0]?.c ?? 0)}</b><span>العائد = أكثر من طلب في الفترة</span></div>
        {fin && <>
          <div><span>صافي المبيعات</span><b>{egp(cur.net)}</b><span>{pct(cur.net, prev.net)} عن الفترة السابقة</span></div>
          <div><span>قيمة الخصومات</span><b>{egp(cur.discounts)}</b><span>الطلبات المسلّمة</span></div>
          <div><span>رسوم الشحن المحصّلة</span><b>{egp(cur.shipping)}</b><span>الطلبات المسلّمة</span></div>
          <div><span>المبالغ المستردة</span><b>{egp(cur.refunds)}</b><span>مسجلة في الفترة</span></div>
        </>}
      </div>
      {fin && <p style={{ color: "var(--mu)", fontSize: 13 }}>تعريف صافي المبيعات: (إجمالي المنتجات − الخصومات) للطلبات <b>المسلّمة فقط</b> − المبالغ المستردة. لا يُحسب الطلب الملغي أو غير المسلّم كبيع مكتمل.</p>}

      <h2>المبيعات اليومية (غير الملغاة)</h2>
      {daily.length === 0 ? <div className="empty">لا توجد طلبات في هذه الفترة.</div> : daily.map((d) => (
        <div key={d.day} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ width: 82 }}>{d.day}</span>
          <div style={{ flex: 1, background: "var(--ln)", borderRadius: 4 }}><div style={{ width: `${(d.gross / maxDay) * 100}%`, background: "var(--ac)", height: 14, borderRadius: 4 }} /></div>
          <span style={{ width: 150, textAlign: "end" }}>{d.orders.toLocaleString("ar-EG")} طلب — {egp(d.gross)}</span>
        </div>
      ))}

      <h2>توزيع الطلبات حسب الحالة</h2>
      {byStatus.length === 0 ? <div className="empty">لا توجد طلبات.</div> : byStatus.map((s) => (
        <div key={s.status} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ width: 110 }}>{STATUS_AR[s.status as OrderStatus]}</span>
          <div style={{ flex: 1, background: "var(--ln)", borderRadius: 4 }}><div style={{ width: `${(s._count / maxStatus) * 100}%`, background: "var(--tx)", height: 14, borderRadius: 4 }} /></div>
          <span>{n(s._count)}</span>
        </div>
      ))}

      <h2>الأكثر مبيعًا</h2><Table cols={["المنتج", "الكمية", "الإيراد"]} rows={top.map((t) => [t.name, n(t.qty), egp(t.revenue)])} />
      <h2>منتجات نشطة لم تُبع في الفترة</h2>{unsold.length === 0 ? <div className="empty">كل المنتجات النشطة بيعت أو لا توجد منتجات.</div> : <p>{unsold.map((u) => u.name).join("، ")}</p>}
      <h2>المبيعات حسب القسم</h2><Table cols={["القسم", "الكمية", "الإيراد"]} rows={byCat.map((t) => [t.name, n(t.qty), egp(t.revenue)])} />
      <h2>المبيعات حسب الماركة</h2><Table cols={["الماركة", "الكمية", "الإيراد"]} rows={byBrand.map((t) => [t.name, n(t.qty), egp(t.revenue)])} />
      <h2>أداء اللون والمقاس</h2><Table cols={["اللون", "المقاس", "الكمية"]} rows={sizeColor.map((t) => [t.color, t.size, n(t.qty)])} />
      <h2>طرق الدفع المستخدمة</h2><Table cols={["الطريقة", "عدد الطلبات"]} rows={byPay.map((p) => [p.paymentMethod === "COD" ? "عند الاستلام" : "إلكتروني", n(p._count)])} />
      <p style={{ color: "var(--mu)", fontSize: 12 }}>حالات الدفع: {Object.values(PAYMENT_AR).join(" • ")}</p>
    </>
  );
}
