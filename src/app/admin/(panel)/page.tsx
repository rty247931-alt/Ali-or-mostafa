import { db } from "@/lib/db";
import { getStaff } from "@/lib/perm";

const n = (x: number) => x.toLocaleString("ar-EG");
const egp = (x: number) => `${x.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;

export default async function Dashboard() {
  const staff = (await getStaff())!;
  const canStats = staff.perms.has("report.view") || staff.perms.has("order.view");
  if (!canStats) return <div className="empty">لا توجد إحصائيات متاحة لصلاحياتك.</div>;
  const money = staff.perms.has("report.finance");

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const live = { status: { notIn: ["CANCELLED" as const] } };

  const [today, month, all, byStatus, paid, avg, customers, products, activity, low, out] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: dayStart }, ...live } }),
    db.order.count({ where: { createdAt: { gte: monthStart }, ...live } }),
    db.order.count(),
    db.order.groupBy({ by: ["status"], _count: true }),
    db.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { grandTotal: true } }),
    db.order.aggregate({ where: live, _avg: { grandTotal: true } }),
    db.user.count({ where: { kind: "CUSTOMER" } }),
    db.product.count({ where: { status: "ACTIVE" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { fullName: true } } } }),
    db.$queryRaw<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM "Inventory" i JOIN "ProductVariant" v ON v.id = i."variantId" WHERE v."isActive" AND i."onHand" > 0 AND i."onHand" <= i."lowStockAt"`,
    db.$queryRaw<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM "Inventory" i JOIN "ProductVariant" v ON v.id = i."variantId" WHERE v."isActive" AND i."onHand" = 0`,
  ]);
  const cnt = (s: string) => byStatus.find((x) => x.status === s)?._count ?? 0;

  const cards: [string, string, string][] = [
    ["طلبات اليوم", n(today), "منذ منتصف الليل (بدون الملغي)"],
    ["طلبات الشهر", n(month), "من أول الشهر (بدون الملغي)"],
    ["إجمالي الطلبات", n(all), "كل الفترات"],
    ["طلبات جديدة", n(cnt("NEW")), "تحتاج مراجعة"],
    ["في انتظار التأكيد", n(cnt("PENDING_CONFIRMATION")), "حاليًا"],
    ["قيد التجهيز", n(cnt("PROCESSING")), "حاليًا"],
    ["تم التسليم", n(cnt("DELIVERED")), "كل الفترات"],
    ["ملغاة", n(cnt("CANCELLED")), "كل الفترات"],
    ["العملاء", n(customers), "حسابات مسجلة"],
    ["منتجات نشطة", n(products), "حاليًا"],
    ["مقاسات مخزونها منخفض", n(low[0]?.c ?? 0), "حاليًا"],
    ["مقاسات نافدة", n(out[0]?.c ?? 0), "حاليًا"],
    ...(money ? ([
      ["مبيعات محصّلة", egp(Number(paid._sum.grandTotal ?? 0)), "طلبات مدفوعة فقط، كل الفترات"],
      ["متوسط قيمة الطلب", egp(Number(avg._avg.grandTotal ?? 0)), "بدون الملغي، كل الفترات"],
    ] as [string, string, string][]) : []),
  ];
  return (
    <>
      <div className="kp">{cards.map(([t, v, p]) => <div key={t}><span>{t}</span><b>{v}</b><span style={{ fontSize: 11 }}>{p}</span></div>)}</div>
      <h2>آخر العمليات</h2>
      {activity.length === 0 ? <div className="empty">لا توجد عمليات مسجلة بعد.</div> : (
        <table className="tbl"><tbody>{activity.map((a) => <tr key={a.id}><td>{a.action} — {a.entity}</td><td>{a.actor?.fullName ?? "النظام"} • {a.createdAt.toLocaleString("ar-EG")}</td></tr>)}</tbody></table>
      )}
    </>
  );
}
