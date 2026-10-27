import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getFavIds } from "@/lib/favs";
import { getSession } from "@/lib/session";
import ProductBuy from "@/components/ProductBuy";
import ProductCard from "@/components/ProductCard";
import RecentlyViewed from "@/components/RecentlyViewed";
import SimpleForm from "@/components/SimpleForm";
import FavButton from "@/components/FavButton";
import { cardSelect, toCard } from "@/services/catalog";

type Props = { params: { slug: string } };
const load = (slug: string) =>
  db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      brand: true, category: true, images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], include: { color: true } },
      variants: { where: { isActive: true }, include: { color: true, size: true, inventory: true }, orderBy: { size: { sortOrder: "asc" } } },
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { fullName: true } } } },
      questions: { where: { isPublished: true, answer: { not: null } }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load(params.slug);
  if (!p) return { title: "المنتج غير موجود", robots: { index: false } };
  const title = p.seoTitle || p.name;
  const description = p.seoDescription || p.shortDesc || undefined;
  return { title, description, alternates: { canonical: `/product/${p.slug}` }, openGraph: { title, description, images: p.images[0] ? [p.images[0].url] : undefined, type: "website" } };
}

export default async function ProductPage({ params }: Props) {
  const p = await load(params.slug);
  if (!p) notFound();
  void db.product.update({ where: { id: p.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const session = await getSession();
  const [favs, canReview, similar] = await Promise.all([
    getFavIds(),
    session
      ? db.order.findFirst({ where: { customerId: session.uid, status: "DELIVERED", items: { some: { variant: { productId: p.id } } } } })
          .then(async (o) => !!o && !(await db.review.findUnique({ where: { productId_userId: { productId: p.id, userId: session.uid } } })))
      : Promise.resolve(false),
    db.product.findMany({ where: { status: "ACTIVE", categoryId: p.categoryId, id: { not: p.id } }, take: 4, orderBy: { soldCount: "desc" }, select: cardSelect }).then((r) => r.map(toCard)),
  ]);

  const variants = p.variants.map((v) => ({
    id: v.id, colorName: v.color.name, colorHex: v.color.hex, sizeLabel: v.size.label,
    available: Math.max(0, (v.inventory?.onHand ?? 0) - (v.inventory?.reserved ?? 0)),
  }));
  const inStock = variants.some((v) => v.available > 0);
  const price = Number(p.currentPrice);
  const avg = p.reviews.length ? p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length : 0;

  const rows: [string, string | null][] = [
    ["كود المنتج", p.sku], ["الماركة", p.brand?.name ?? null], ["القسم", p.category.name], ["الخامة", p.material],
    ["نوع الحذاء", p.shoeType], ["بلد المنشأ", p.originCountry], ["العناية بالمنتج", p.careInfo],
  ];
  // Structured data states only what is true. Rating appears only when real approved reviews exist.
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, sku: p.sku, description: p.shortDesc ?? undefined,
    image: p.images.map((i) => i.url), brand: p.brand ? { "@type": "Brand", name: p.brand.name } : undefined,
    offers: { "@type": "Offer", priceCurrency: "EGP", price: price.toFixed(2), availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };
  if (p.reviews.length) ld.aggregateRating = { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: p.reviews.length };

  return (
    <div className="w">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <div style={{ color: "var(--mu)", fontSize: 13, paddingTop: 14 }}>{p.category.name} / {p.name}</div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
        <h1 style={{ margin: "6px 0 0" }}>{p.name}</h1>
        <span style={{ position: "relative", width: 44, height: 44 }}><FavButton productId={p.id} initial={favs.has(p.id)} /></span>
      </div>
      {p.brand && <div className="br">{p.brand.name}</div>}
      {inStock ? (
        <ProductBuy name={p.name} price={price} oldPrice={p.discountPercent > 0 ? Number(p.basePrice) : null} variants={variants} images={p.images.map((i) => ({ url: i.url, alt: i.alt, colorName: i.color?.name ?? null }))} videoUrl={p.videoUrl} />
      ) : <div className="empty" style={{ marginTop: 20 }}>هذا المنتج غير متوفر حاليًا.</div>}

      <section className="s">
        {p.description && <p style={{ whiteSpace: "pre-wrap" }}>{p.description}</p>}
        <table className="tbl"><tbody>{rows.filter(([, v]) => v).map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table>
        <p><a href="/pages/shipping" style={{ color: "var(--ac)" }}>الشحن</a> • <a href="/pages/returns" style={{ color: "var(--ac)" }}>الاستبدال والاسترجاع</a> • <a href="/pages/size-guide" style={{ color: "var(--ac)" }}>دليل المقاسات</a></p>
      </section>

      <section className="s">
        <div className="sh2"><h2>تقييمات المشترين{p.reviews.length ? ` (${avg.toFixed(1)} ★ من ${p.reviews.length.toLocaleString("ar-EG")})` : ""}</h2></div>
        {p.reviews.length === 0 ? <div className="empty">لا توجد تقييمات بعد. التقييم متاح لمن استلم المنتج فقط.</div> : p.reviews.map((r) => (
          <div key={r.id} className="box" style={{ marginBottom: 8 }}>{"★".repeat(r.rating)} <small>{r.user.fullName.split(" ")[0]} — مشترٍ موثق</small>{r.body && <p>{r.body}</p>}{r.reply && <p style={{ color: "var(--mu)" }}>رد المتجر: {r.reply}</p>}</div>
        ))}
        {canReview && <details className="box"><summary><b>أضف تقييمك</b></summary><SimpleForm endpoint="/api/reviews" extra={{ productId: p.id }} fields={[{ key: "rating", label: "التقييم من ١ إلى ٥", type: "number" }, { key: "body", label: "رأيك", type: "textarea" }]} submitLabel="إرسال التقييم" okMessage="شكرًا. سيظهر بعد المراجعة." /></details>}
      </section>

      <section className="s">
        <div className="sh2"><h2>أسئلة عن المنتج</h2></div>
        {p.questions.length === 0 ? <div className="empty">لا توجد أسئلة منشورة بعد.</div> : p.questions.map((q) => <div key={q.id} className="box" style={{ marginBottom: 8 }}><b>{q.question}</b><p style={{ margin: 0 }}>{q.answer}</p></div>)}
        <details className="box" style={{ marginTop: 8 }}><summary><b>اسأل عن المنتج</b></summary><SimpleForm endpoint="/api/questions" extra={{ productId: p.id }} fields={[{ key: "name", label: "اسمك" }, { key: "question", label: "سؤالك", type: "textarea" }]} submitLabel="إرسال السؤال" okMessage="تم استلام سؤالك وسيظهر بعد الرد عليه." /></details>
      </section>

      {similar.length > 0 && <section className="s"><div className="sh2"><h2>منتجات مشابهة</h2></div><div className="grid">{similar.map((s) => <ProductCard key={s.id} p={s} fav={favs.has(s.id)} />)}</div></section>}
      <RecentlyViewed slug={p.slug} />
    </div>
  );
}
