"use client";
import { useMemo, useState } from "react";
import { addLine } from "@/lib/cart-client";

type V = { id: string; colorName: string; colorHex: string | null; sizeLabel: string; available: number };
type Img = { url: string; alt: string | null; colorName: string | null };

export default function ProductBuy({ name, price, oldPrice, variants, images, videoUrl }: {
  name: string; price: number; oldPrice: number | null; variants: V[]; images: Img[]; videoUrl?: string | null;
}) {
  const colors = useMemo(() => [...new Map(variants.map((v) => [v.colorName, v.colorHex])).entries()], [variants]);
  const [color, setColor] = useState(colors[0]?.[0] ?? "");
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [zoom, setZoom] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const sizes = variants.filter((v) => v.colorName === color);
  const current = sizes.find((v) => v.sizeLabel === size);
  const shown = images.filter((i) => !i.colorName || i.colorName === color);
  const gallery = shown.length ? shown : images;
  const main = gallery[Math.min(imgIdx, gallery.length - 1)];
  const egp = (n: number) => `${(n * qty).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;

  function add() {
    if (!current) return setMsg({ t: "اختر المقاس أولًا", ok: false });
    if (current.available < qty) return setMsg({ t: `المتاح من هذا المقاس ${current.available} فقط`, ok: false });
    addLine(current.id, qty);
    setMsg({ t: "تمت الإضافة إلى السلة", ok: true });
  }

  return (
    <div className="det">
      <div>
        <div className={`big ${zoom ? "z" : ""}`} onClick={() => setZoom(!zoom)}>
          {main ? <img src={main.url} alt={main.alt ?? name} /> : <span className="noimg">لا توجد صورة</span>}
        </div>
        {gallery.length > 1 && (
          <div className="th">{gallery.map((g, i) => (
            <button key={g.url} aria-pressed={i === imgIdx} aria-label={`صورة ${i + 1}`} onClick={() => setImgIdx(i)}><img src={g.url} alt="" /></button>
          ))}</div>
        )}
      </div>
      <div>
        <div className="price"><b style={{ fontSize: 26 }}>{price.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م</b>{oldPrice && <s>{oldPrice.toLocaleString("ar-EG")} ج.م</s>}</div>
        <span className="lbl">اللون: {color}</span>
        <div className="opts">{colors.map(([c, hex]) => (
          <button key={c} className="o" aria-pressed={c === color} onClick={() => { setColor(c); setSize(null); setImgIdx(0); setMsg(null); }}>
            {hex && <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: hex, marginInlineEnd: 6, border: "1px solid #8886" }} />}{c}
          </button>
        ))}</div>
        <span className="lbl">المقاس</span>
        <div className="opts">{sizes.map((v) => (
          <button key={v.id} className="o" aria-pressed={v.sizeLabel === size} disabled={v.available <= 0}
            onClick={() => { setSize(v.sizeLabel); setQty(1); setMsg(null); }}>{Number(v.sizeLabel).toLocaleString("ar-EG")}</button>
        ))}</div>
        {current && current.available <= 3 && <div className="err">متبقي {current.available.toLocaleString("ar-EG")} فقط من هذا المقاس</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0" }}>
          <span className="lbl" style={{ margin: 0 }}>الكمية</span>
          <div className="q">
            <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="تقليل">−</button><span>{qty.toLocaleString("ar-EG")}</span>
            <button onClick={() => setQty(Math.min(current?.available ?? 1, qty + 1, 10))} aria-label="زيادة">+</button>
          </div>
        </div>
        <button className="btn f" onClick={add}>أضف للسلة — {egp(price)}</button>
        {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
      </div>
    </div>
  );
}
