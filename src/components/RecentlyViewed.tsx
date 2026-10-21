"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type C = { id: string; slug: string; name: string; price: number; image: string | null };

export default function RecentlyViewed({ slug }: { slug: string }) {
  const [items, setItems] = useState<C[]>([]);
  useEffect(() => {
    let list: string[] = [];
    try { list = JSON.parse(localStorage.getItem("st_rv") ?? "[]"); } catch {}
    const others = list.filter((s) => s !== slug).slice(0, 4);
    try { localStorage.setItem("st_rv", JSON.stringify([slug, ...others].slice(0, 8))); } catch {}
    if (others.length) fetch(`/api/products/by-slugs?slugs=${others.join(",")}`).then((r) => r.json()).then(setItems).catch(() => {});
  }, [slug]);
  if (!items.length) return null;
  return (
    <section className="s"><div className="sh2"><h2>شوهدت مؤخرًا</h2></div>
      <div className="grid">{items.map((p) => (
        <Link key={p.id} href={`/product/${p.slug}`} className="cd"><div className="im">{p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <span className="noimg">لا توجد صورة</span>}</div>
          <div className="ci"><h3>{p.name}</h3><div className="price"><b>{p.price.toLocaleString("ar-EG")} ج.م</b></div></div></Link>
      ))}</div></section>
  );
}
