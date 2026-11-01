import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getFavIds } from "@/lib/favs";
import Newsletter from "@/components/Newsletter";
import ProductCard from "@/components/ProductCard";
import { cardSelect, toCard } from "@/services/catalog";

const active = { status: "ACTIVE" as const };
async function list(where: object, orderBy: object) {
  return (await db.product.findMany({ where: { ...active, ...where }, orderBy, take: 4, select: cardSelect })).map(toCard);
}
function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="s"><div className="w">
      <div className="sh2"><h2>{title}</h2>{href && <Link href={href}>عرض الكل</Link>}</div>{children}
    </div></section>
  );
}

export default async function Home() {
  const now = new Date();
  const [categories, fresh, deals, best, viewed, total, banners, brands, reviews, faq, st, favs, introVideos] = await Promise.all([
    db.category.findMany({ where: { isVisible: true, parentId: null }, orderBy: { sortOrder: "asc" } }),
    list({}, { createdAt: "desc" }),
    list({ discountPercent: { gt: 0 } }, { discountPercent: "desc" }),
    list({ soldCount: { gt: 0 } }, { soldCount: "desc" }),
    db.product.findMany({ where: { ...active, viewCount: { gt: 0 } }, orderBy: { viewCount: "desc" }, take: 4, select: cardSelect }).then((r) => r.map(toCard)),
    db.product.count({ where: active }),
    db.banner.findMany({
      where: { isVisible: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
      orderBy: { sortOrder: "asc" }, take: 4,
    }),
    db.brand.findMany({ where: { isVisible: true, showOnHome: true }, orderBy: { sortOrder: "asc" } }),
    db.review.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 3, include: { product: { select: { name: true, slug: true } }, user: { select: { fullName: true } } } }),
    db.page.findFirst({ where: { slug: "faq", isPublished: true } }),
    getSettings(["store.name", "hero.title", "hero.subtitle", "hero.image"]),
    getFavIds(),
  ]);
  const card = (p: ReturnType<typeof toCard>) => <ProductCard key={p.id} p={p} fav={favs.has(p.id)} />;
  const faqItems = (faq?.content ?? "").split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean).slice(0, 4);
  const introList = Array.isArray(introVideos["intro.videos"]) ? introVideos["intro.videos"] as { title: string; url: string; cover: string }[] : [];\n  const heroImg = typeof st["hero.image"] === "string" && st["hero.image"] ? String(st["hero.image"]) : null;

  return (
    <>
      <div className="hero" style={heroImg ? { backgroundImage: `linear-gradient(#0003,#0003),url(${JSON.stringify(heroImg).slice(1, -1)})`, backgroundSize: "cover", backgroundPosition: "center", color: "#fff" } : undefined}>
        <div className="w">
          <h1>{String(st["hero.title"] || "أحذية تمشي معاك لآخر اليوم")}</h1>
          <p>{String(st["hero.subtitle"] || "رجالي وحريمي وأطفال. اختر مقاسك المتاح فعلًا، واطلب بسهولة.")}</p>
          <Link className="btn" href="/shop">تسوق الآن</Link>{" "}
          <Link className="btn o" href="/shop?isNew=1">اكتشف المجموعة الجديدة</Link>
        </div>
      </div>
      {introList.length > 0 && <Section title="الفيديو التعريفي"><div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))"}}>{introList.map((v,i)=><article className="box" key={v.url}><video controls playsInline preload="none" poster={v.cover} style={{width:"100%",maxHeight:360,objectFit:"contain",borderRadius:10,background:"#111"}} aria-label={v.title}><source src={v.url}/></video><h3>{v.title}</h3></article>)}</div></Section>}\n      <Section title="الأقسام"><div className="cats">{categories.map((c) => <Link key={c.id} className="ct" href={`/shop?category=${c.slug}`}>{c.imageUrl ? <img className="ctimg" src={c.imageUrl} alt="" loading="lazy" /> : <span className="ctplaceholder" aria-hidden="true">✦</span>}<span>{c.name}</span></Link>)}</div></Section>
      {banners.length > 0 && <Section title="عروض وإعلانات"><div className="offer-marquee" aria-label="عروض وإعلانات"><div className="offer-track">{[...banners, ...banners].map((b, i) => (
        <Link key={b.id + "-" + i} className="bn offer-card" href={b.buttonUrl || "/shop"} aria-label={b.title || "تصفح العرض"}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={b.imageUrl} alt={b.title ?? "عرض من المتجر"} loading="lazy" />
          {(b.title || b.subtitle) && <div className="t"><b>{b.title}</b><div>{b.subtitle}</div>{b.buttonText && <span className="tg">{b.buttonText}</span>}</div>}</Link>
      ))}</div></div></Section>}
      {total === 0 && <section className="s"><div className="w"><div className="empty">لا توجد منتجات منشورة بعد. أضف المنتجات من لوحة الإدارة.</div></div></section>}
      {fresh.length > 0 && <Section title="وصل حديثًا" href="/shop"><div className="grid">{fresh.map(card)}</div></Section>}
      {deals.length > 0 && <Section title="عروض اليوم" href="/shop?discount=1"><div className="grid">{deals.map(card)}</div></Section>}
      {best.length > 0 && <Section title="الأكثر مبيعًا" href="/shop?sort=best"><div className="grid">{best.map(card)}</div></Section>}
      {viewed.length > 0 && <Section title="الأكثر مشاهدة"><div className="grid">{viewed.map(card)}</div></Section>}
      {brands.length > 0 && <Section title="الماركات"><div className="brs">{brands.map((b) => <Link key={b.id} href={`/shop?brand=${b.slug}`}>{b.name}</Link>)}</div></Section>}
      <Section title="آراء العملاء">
        {reviews.length === 0 ? <div className="empty">لا توجد تقييمات بعد. التقييمات تظهر من مشترين استلموا طلباتهم فعلًا.</div> : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>{reviews.map((r) => (
            <div key={r.id} className="box"><div>{"★".repeat(r.rating)}</div><p>{r.body}</p><small>{r.user.fullName.split(" ")[0]} — <Link href={`/product/${r.product.slug}`}>{r.product.name}</Link> (مشترٍ موثق)</small></div>
          ))}</div>
        )}
      </Section>
      {faqItems.length > 0 && <Section title="أسئلة شائعة" href="/pages/faq"><div className="box" style={{ whiteSpace: "pre-wrap" }}>{faqItems.join("\n\n")}</div></Section>}
      <section className="s"><div className="w"><Newsletter /></div></section>
    </>
  );
}
