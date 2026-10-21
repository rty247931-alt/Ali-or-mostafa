import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { cardSelect, toCard } from "@/services/catalog";

export const metadata: Metadata = { title: "المفضلة", robots: { index: false, follow: false } };

export default async function Favorites() {
  const s = await getSession();
  if (!s) redirect("/account");
  const rows = await db.favorite.findMany({ where: { userId: s.uid, product: { status: "ACTIVE" } }, include: { product: { select: cardSelect } }, orderBy: { createdAt: "desc" } });
  return (
    <div className="w"><h1 style={{ marginTop: 20 }}>المفضلة</h1>
      {rows.length === 0 ? <div className="empty">لم تضف أي منتج للمفضلة بعد.</div> : <div className="grid">{rows.map((r) => <ProductCard key={r.productId} p={toCard(r.product)} fav />)}</div>}
    </div>
  );
}
