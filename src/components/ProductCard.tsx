import Link from "next/link";
import type { Card } from "@/services/catalog";
import FavButton from "./FavButton";

const egp = (n: number) => `${n.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;

export default function ProductCard({ p, fav = false }: { p: Card; fav?: boolean }) {
  return (
    <article className="cd">
      <Link href={`/product/${p.slug}`} className="im" aria-label={p.name}>
        {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <span className="noimg">لا توجد صورة</span>}
        {p.altImage && <img className="b" src={p.altImage} alt="" loading="lazy" />}
        <span className="bd">
          {p.isNew && <span className="tg">جديد</span>}
          {p.bestSeller && <span className="tg">الأكثر مبيعًا</span>}
          {p.discountPercent > 0 && <span className="tg d">خصم {p.discountPercent.toLocaleString("ar-EG")}٪</span>}
          {!p.inStock && <span className="tg">نفد</span>}
        </span>
      </Link>
      <FavButton productId={p.id} initial={fav} />
      <div className="ci">
        {p.brand && <div className="br">{p.brand}</div>}
        <h3><Link href={`/product/${p.slug}`}>{p.name}</Link></h3>
        <div className="price"><b>{egp(p.price)}</b>{p.oldPrice && <s>{egp(p.oldPrice)}</s>}</div>
        <div className="qs">{p.sizes.slice(0, 6).map((s) => <span key={s}>{Number(s).toLocaleString("ar-EG")}</span>)}</div>
      </div>
    </article>
  );
}
