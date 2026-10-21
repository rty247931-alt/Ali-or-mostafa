import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";
import { getFavIds } from "@/lib/favs";
import { catalogQuery, listProducts } from "@/services/catalog";

export const metadata: Metadata = { title: "كل المنتجات" };

export default async function Shop({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const parsed = catalogQuery.safeParse(searchParams);
  const q = parsed.success ? parsed.data : catalogQuery.parse({});
  const [res, cats, brands, sizes, colors, mats] = await Promise.all([
    listProducts(q),
    db.category.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } }),
    db.brand.findMany({ where: { isVisible: true }, orderBy: { name: "asc" } }),
    db.size.findMany({ orderBy: { sortOrder: "asc" } }),
    db.color.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({ where: { status: "ACTIVE", material: { not: null } }, select: { material: true }, distinct: ["material"] }),
  ]);
  const favs = await getFavIds();
  const pages = Math.max(1, Math.ceil(res.total / res.pageSize));
  const link = (page: number) => {
    const sp = new URLSearchParams(Object.entries(searchParams).filter(([, v]) => v) as [string, string][]);
    sp.set("page", String(page));
    return `/shop?${sp.toString()}`;
  };
  const opt = (items: { v: string; l: string }[]) => (
    <><option value="">الكل</option>{items.map((i) => <option key={i.v} value={i.v}>{i.l}</option>)}</>
  );
  return (
    <div className="w">
      <h1>كل المنتجات</h1>
      <form className="tools" method="get">
        <input className="in" type="search" name="q" defaultValue={q.q} placeholder="بحث داخل المنتجات" aria-label="بحث" />
        <select className="in" name="category" defaultValue={q.category ?? ""} aria-label="القسم">{opt(cats.map((c) => ({ v: c.slug, l: c.name })))}</select>
        <select className="in" name="brand" defaultValue={q.brand ?? ""} aria-label="الماركة">{opt(brands.map((b) => ({ v: b.slug, l: b.name })))}</select>
        <select className="in" name="size" defaultValue={q.size ?? ""} aria-label="المقاس">{opt(sizes.map((s) => ({ v: s.label, l: s.label })))}</select>
        <select className="in" name="color" defaultValue={q.color ?? ""} aria-label="اللون">{opt(colors.map((c) => ({ v: c.name, l: c.name })))}</select>
        <select className="in" name="material" defaultValue={q.material ?? ""} aria-label="الخامة">{opt(mats.map((m) => ({ v: m.material!, l: m.material! })))}</select>
        <input className="in" type="number" name="min" min={0} defaultValue={q.min} placeholder="أقل سعر" aria-label="أقل سعر" />
        <input className="in" type="number" name="max" min={0} defaultValue={q.max} placeholder="أعلى سعر" aria-label="أعلى سعر" />
        <select className="in" name="sort" aria-label="الترتيب" defaultValue={q.sort}>
          <option value="new">الأحدث</option><option value="price_asc">السعر: الأقل</option><option value="price_desc">السعر: الأعلى</option>
          <option value="best">الأكثر مبيعًا</option><option value="discount">أكبر خصم</option>
        </select>
        <label><input type="checkbox" name="inStock" value="1" defaultChecked={!!q.inStock} /> المتوفر فقط</label>
        <label><input type="checkbox" name="discount" value="1" defaultChecked={!!q.discount} /> عليه خصم</label>
        <label><input type="checkbox" name="isNew" value="1" defaultChecked={!!q.isNew} /> جديد</label>
        <button className="btn sm" type="submit">تطبيق</button>
        <Link className="btn o sm" href="/shop">مسح</Link>
      </form>
      <p style={{ color: "var(--mu)" }}>{res.total.toLocaleString("ar-EG")} منتج</p>
      {res.items.length ? <div className="grid">{res.items.map((p) => <ProductCard key={p.id} p={p} fav={favs.has(p.id)} />)}</div>
        : <div className="empty">لا توجد نتائج مطابقة. جرّب تخفيف الفلاتر أو مسحها.</div>}
      {pages > 1 && (
        <p style={{ textAlign: "center", marginTop: 26 }}>
          {q.page > 1 && <Link className="btn o sm" href={link(q.page - 1)}>السابق</Link>}{" "}
          <span>صفحة {q.page.toLocaleString("ar-EG")} من {pages.toLocaleString("ar-EG")}</span>{" "}
          {q.page < pages && <Link className="btn o sm" href={link(q.page + 1)}>التالي</Link>}
        </p>
      )}
    </div>
  );
}
