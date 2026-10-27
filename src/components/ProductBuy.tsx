"use client";
import { useMemo, useState } from "react";
import { addLine } from "@/lib/cart-client";

type V = { id: string; colorName: string; colorHex: string | null; sizeLabel: string; available: number };
type Img = { url: string; alt: string | null; colorName: string | null };
type Media = { kind: "image" | "video"; url: string; alt?: string | null };

export default function ProductBuy({ name, price, oldPrice, variants, images, videoUrl, videoUrls = [] }: {
  name: string; price: number; oldPrice: number | null; variants: V[]; images: Img[]; videoUrl?: string | null; videoUrls?: string[];
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
  const media: Media[] = [...gallery.map((i) => ({ kind: "image" as const, url: i.url, alt: i.alt })), ...[...new Set([...(videoUrls ?? []), ...(videoUrl ? [videoUrl] : [])])].map((url) => ({ kind: "video" as const, url }))];
  const [mediaIdx, setMediaIdx] = useState(0);
  const selected = media[Math.min(mediaIdx, Math.max(0, media.length - 1))];
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
        <div className={`big ${zoom ? "z" : ""}`} style={{position:"relative"}} onClick={() => { if(selected?.kind==="image") setZoom(!zoom); }}>
          {selected?.kind === "video" ? <video key={selected.url} src={selected.url} controls playsInline preload="metadata" aria-label={`فيديو ${name}`} style={{ width: "100%", maxHeight: 520, objectFit: "contain" }} /> : selected ? <img src={selected.url} alt={selected.alt ?? name} /> : <span className="noimg">لا توجد صور أو فيديوهات</span>}
        </div>
        {media.length > 1 && <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,margin:"8px 0"}}><button className="o" aria-label="السابق" onClick={()=>{setMediaIdx((mediaIdx-1+media.length)%media.length);setZoom(false);}}>❮ السابق</button><span>{mediaIdx+1} / {media.length}</span><button className="o" aria-label="التالي" onClick={()=>{setMediaIdx((mediaIdx+1)%media.length);setZoom(false);}}>التالي ❯</button></div>}
        {media.length > 1 && <div className="th">{media.map((m,i)=><button key={m.kind+m.url} aria-pressed={i===mediaIdx} aria-label={m.kind==="video"?`فيديو ${i+1}`:`صورة ${i+1}`} onClick={()=>{setMediaIdx(i);setZoom(false);}}>{m.kind==="video"?<span style={{display:"grid",placeItems:"center",width:72,height:72,background:"#222",color:"white",borderRadius:8}}>▶ فيديو</span>:<img src={m.url} alt="" />}</button>)}</div>}
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
