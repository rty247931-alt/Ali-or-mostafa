"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { egp, readCart, writeCart, type CartLine } from "@/lib/cart-client";
import { GOVERNORATES } from "@/lib/geo";

type Q = {
  items: { variantId: string; productName: string; slug: string; colorName: string; sizeLabel: string; imageUrl: string | null; unitCents: number; quantity: number; lineCents: number; available: number }[];
  subtotalCents: number; discountCents: number; shippingCents: number | null; taxCents?: number; taxIncluded?: boolean; totalCents: number;
  issues: string[]; couponError: string | null; shippingError: string | null; couponCode: string | null;
};

export default function CartPage() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [q, setQ] = useState<Q | null>(null);
  const [gov, setGov] = useState("");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const refresh = useCallback(async (l: CartLine[], g: string, c: string) => {
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: l, governorate: g || null, couponCode: c || null }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "تعذر تحديث السلة");
      setQ(d);
    } catch (e) { setErr(e instanceof Error ? e.message : "فشل الاتصال، حاول مرة أخرى"); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const l = readCart(); setLines(l);
    const g = sessionStorage.getItem("st_gov") ?? ""; const c = sessionStorage.getItem("st_coupon") ?? "";
    setGov(g); setCode(c); setApplied(c); refresh(l, g, c);
  }, [refresh]);

  function change(variantId: string, delta: number) {
    const next = lines.map((l) => l.variantId === variantId ? { ...l, quantity: l.quantity + delta } : l).filter((l) => l.quantity > 0).map((l) => ({ ...l, quantity: Math.min(10, l.quantity) }));
    writeCart(next); setLines(next); refresh(next, gov, applied);
  }

  if (!loading && lines.length === 0) return <div className="pg"><h1>السلة</h1><div className="empty">السلة فاضية.</div><p><Link className="btn" href="/shop">تصفح المنتجات</Link></p></div>;

  const blocked = !q || q.issues.length > 0 || !!q.couponError || !gov || !!q.shippingError;
  return (
    <div className="pg">
      <h1>السلة</h1>
      {err && <div className="err" role="alert">{err}</div>}
      {q?.issues.map((i) => <div key={i} className="err" role="alert">{i}</div>)}
      {q?.items.map((i) => (
        <div key={i.variantId} className="box" style={{ marginBottom: 8, display: "flex", gap: 10, alignItems: "center" }}>
          {i.imageUrl && <img src={i.imageUrl} alt="" width={64} height={64} style={{ objectFit: "cover", borderRadius: 8 }} />}
          <div style={{ flex: 1 }}>
            <Link href={`/product/${i.slug}`}><b>{i.productName}</b></Link>
            <div style={{ color: "var(--mu)", fontSize: 13 }}>{i.colorName} • مقاس {Number(i.sizeLabel).toLocaleString("ar-EG")}</div>
            <div>{egp(i.lineCents)}</div>
          </div>
          <div className="q"><button onClick={() => change(i.variantId, -1)} aria-label="تقليل">−</button><span>{i.quantity.toLocaleString("ar-EG")}</span><button onClick={() => change(i.variantId, 1)} aria-label="زيادة" disabled={i.quantity >= i.available}>+</button></div>
          <button className="btn o sm" onClick={() => change(i.variantId, -i.quantity)}>حذف</button>
        </div>
      ))}
      <label className="lbl" htmlFor="gov">المحافظة (لحساب الشحن)</label>
      <select id="gov" className="in" value={gov} onChange={(e) => { setGov(e.target.value); sessionStorage.setItem("st_gov", e.target.value); refresh(lines, e.target.value, applied); }}>
        <option value="">اختر المحافظة</option>{GOVERNORATES.map((g) => <option key={g}>{g}</option>)}
      </select>
      {q?.shippingError && <div className="err">{q.shippingError}</div>}
      <label className="lbl" htmlFor="cp">كود الخصم</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input id="cp" className="in" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn o sm" onClick={() => { setApplied(code); sessionStorage.setItem("st_coupon", code); refresh(lines, gov, code); }}>تطبيق</button>
      </div>
      {q?.couponError && <div className="err">{q.couponError}</div>}
      {q && (
        <div className="box tot" style={{ marginTop: 14 }}>
          <div><span>المجموع</span><span>{egp(q.subtotalCents)}</span></div>
          {q.discountCents > 0 && <div><span>الخصم ({q.couponCode})</span><span>−{egp(q.discountCents)}</span></div>}
          <div><span>الشحن</span><span>{q.shippingCents == null ? "اختر المحافظة" : q.shippingCents === 0 ? "مجاني" : egp(q.shippingCents)}</span></div>
          {!!q.taxCents && <div><span>{q.taxIncluded ? "شامل الضريبة" : "الضريبة"}</span><span>{egp(q.taxCents)}</span></div>}
          <div className="g"><span>الإجمالي</span><span>{egp(q.totalCents)}</span></div>
        </div>
      )}
      <p><Link className="btn f" aria-disabled={blocked} href={blocked ? "#" : "/checkout"} onClick={(e) => blocked && e.preventDefault()}>إتمام الطلب</Link></p>
    </div>
  );
}
