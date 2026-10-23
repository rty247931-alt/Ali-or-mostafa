import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "نقاط الولاء", robots: { index: false, follow: false } };

export default async function LoyaltyPage() {
  const session = await getSession();
  if (!session || session.kind !== "CUSTOMER") redirect("/account");
  const [balance, transactions] = await Promise.all([
    db.loyaltyTransaction.aggregate({ where: { userId: session.uid }, _sum: { points: true } }),
    db.loyaltyTransaction.findMany({
      where: { userId: session.uid },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, type: true, points: true, description: true, createdAt: true },
    }),
  ]);
  return <div className="pg">
    <p><Link href="/account/orders">← العودة إلى حسابي</Link></p>
    <h1>نقاط الولاء</h1>
    <div className="box" style={{ margin: "16px 0" }}>
      <p>رصيدك الحالي</p>
      <strong style={{ fontSize: 32 }}>{balance._sum.points ?? 0} نقطة</strong>
      <p style={{ color: "var(--mu)" }}>تحصل على نقطة لكل 10 جنيه من قيمة الطلب بعد تأكيد تسليمه. الطلبات كزائر لا تجمع نقاطًا.</p>
    </div>
    <h2>سجل النقاط</h2>
    {transactions.length === 0 ? <div className="empty">لسه مفيش نقاط. أكمل أول طلب مسجّل واستلمه عشان تبدأ تجمع نقاطك.</div> : transactions.map((item) =>
      <div className="box" key={item.id} style={{ marginBottom: 8 }}>
        <b>{item.points > 0 ? "+" : ""}{item.points} نقطة</b>
        <div>{item.description}</div>
        <small style={{ color: "var(--mu)" }}>{item.createdAt.toLocaleDateString("ar-EG")}</small>
      </div>
    )}
  </div>;
}
