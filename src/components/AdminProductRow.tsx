"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Variant = { id: string; color: string; size: string; onHand: number; reserved: number };
type Img = { id: string; url: string; color: string | null; isPrimary: boolean };
type Opt = { id: string; name: string };
export type AdminP = {
  id: string; name: string; status: string; base: number; sale: number | null; categoryId: string; brandId: string | null;
  shortDesc: string; description: string; material: string; shoeType: string; originCountry: string; careInfo: string;
  searchKeywords: string; seoTitle: string; seoDescription: string; videoUrl?: string | null; images: Img[]; variants: Variant[];
};
type Perms = { price: boolean; update: boolean; stock: boolean };

async function call(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "تعذر تنفيذ العملية");
  return d;
}

export default function AdminProductRow({ p, perms, categories, brands, selected, onSelect }: { p: AdminP; perms: Perms; categories: Opt[]; brands: Opt[]; selected: boolean; onSelect: (v: boolean) => void }) {
  const router = useRouter();
  const [base, setBase] = useState(String(p.base));
  const [sale, setSale] = useState(p.sale ? String(p.sale) : "");
  const [d, setD] = useState({ name: p.name, categoryId: p.categoryId, brandId: p.brandId ?? "", shortDesc: p.shortDesc, description: p.description, material: p.material, shoeType: p.shoeType, originCountry: p.originCountry, careInfo: p.careInfo, searchKeywords: p.searchKeywords, seoTitle: p.seoTitle, seoDescription: p.seoDescription });
  const [adj, setAdj] = useState<Record<string, { type: string; qty: string; reason: string }>>({});
  const [nv, setNv] = useState({ colorName: "", sizeLabel: "", quantity: "0" });
  const [imgColor, setImgColor] = useState("");
  const [upl, setUpl] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const colors = [...new Set(p.variants.map((v) => v.color))];

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); setMsg({ t: ok, ok: true }); router.refresh(); } catch (e) { setMsg({ t: e instanceof Error ? e.message : "فشل", ok: false }); }
  };
  const a = (id: string) => adj[id] ?? { type: "PURCHASE_IN", qty: "", reason: "" };
  const setA = (id: string, k: "type" | "qty" | "reason", val: string) => setAdj({ ...adj, [id]: { ...a(id), [k]: val } });
  const f = (k: keyof typeof d, label: string, area = false) => (
    <div><label className="lbl" htmlFor={`${p.id}-${k}`}>{label}</label>
      {area ? <textarea id={`${p.id}-${k}`} className="in" rows={3} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
        : <input id={`${p.id}-${k}`} className="in" value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} />}</div>
  );

  return (
    <details className="box" style={{ marginBottom: 8 }}>
      <summary><input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} onClick={(e) => e.stopPropagation()} aria-label="تحديد" /> <b>{p.name}</b> — {p.status === "ACTIVE" ? "ظاهر" : p.status === "DRAFT" ? "مسودة" : p.status === "HIDDEN" ? "مخفي" : p.status === "PAUSED" ? "البيع موقوف" : "أرشيف"}</summary>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginTop: 8 }}>
        <label>السعر <input className="in" type="number" disabled={!perms.price} value={base} onChange={(e) => setBase(e.target.value)} style={{ width: 110 }} /></label>
        <label>سعر البيع <input className="in" type="number" disabled={!perms.price} value={sale} onChange={(e) => setSale(e.target.value)} style={{ width: 110 }} /></label>
        {perms.price && <button className="btn sm" onClick={() => run(() => call(`/api/admin/products/${p.id}`, "PATCH", { basePrice: Number(base), salePrice: sale ? Number(sale) : null }), "تم حفظ السعر")}>حفظ السعر</button>}
        {perms.update && (
          <select className="in" style={{ width: "auto" }} value={p.status} aria-label="الحالة" onChange={(e) => run(() => call(`/api/admin/products/${p.id}`, "PATCH", { status: e.target.value }), "تم تغيير الحالة")}>
            <option value="DRAFT">مسودة</option><option value="ACTIVE">ظاهر</option><option value="HIDDEN">مخفي</option><option value="PAUSED">إيقاف البيع مؤقتًا</option><option value="ARCHIVED">أرشيف</option>
          </select>
        )}
      </div>

      {perms.update && (
        <details style={{ marginTop: 10 }}><summary><b>تعديل البيانات</b></summary>
          {f("name", "الاسم")}
          <label className="lbl" htmlFor={`${p.id}-cat`}>القسم</label>
          <select id={`${p.id}-cat`} className="in" value={d.categoryId} onChange={(e) => setD({ ...d, categoryId: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <label className="lbl" htmlFor={`${p.id}-brand`}>الماركة</label>
          <select id={`${p.id}-brand`} className="in" value={d.brandId} onChange={(e) => setD({ ...d, brandId: e.target.value })}><option value="">بدون</option>{brands.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          {f("material", "الخامة")}{f("shoeType", "نوع الحذاء")}{f("originCountry", "بلد المنشأ")}{f("careInfo", "العناية بالمنتج")}
          {f("shortDesc", "وصف مختصر")}{f("description", "وصف تفصيلي", true)}{f("searchKeywords", "كلمات البحث")}{f("seoTitle", "عنوان SEO")}{f("seoDescription", "وصف SEO")}
          <button className="btn sm" style={{ marginTop: 8 }} onClick={() => run(() => call(`/api/admin/products/${p.id}`, "PATCH", { ...d, brandId: d.brandId || null }), "تم حفظ البيانات")}>حفظ البيانات</button>
        </details>
      )}

      {perms.update && (
        <details style={{ marginTop: 10 }}><summary><b>الصور ({p.images.length})</b></summary>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>{p.images.map((im) => (
            <div key={im.id} style={{ width: 96, textAlign: "center", fontSize: 12 }}>
              <img src={im.url} alt="" width={96} height={96} style={{ objectFit: "cover", borderRadius: 8, border: im.isPrimary ? "3px solid var(--ac)" : "1px solid var(--ln)" }} />
              <div>{im.color ?? "كل الألوان"}</div>
              {!im.isPrimary && <button className="btn o sm" onClick={() => run(() => call(`/api/admin/images/${im.id}`, "PATCH", { isPrimary: true }), "تم تعيين الصورة الرئيسية")}>رئيسية</button>}{" "}
              <button className="btn o sm" onClick={() => confirm("حذف الصورة؟") && run(() => call(`/api/admin/images/${im.id}`, "DELETE"), "تم حذف الصورة")}>حذف</button>
            </div>
          ))}</div>
          <select className="in" style={{ width: "auto" }} value={imgColor} onChange={(e) => setImgColor(e.target.value)} aria-label="لون الصورة"><option value="">صورة لكل الألوان</option>{colors.map((c) => <option key={c}>{c}</option>)}</select>{" "}
          <input type="file" accept="image/*" multiple aria-label="رفع صور" onChange={async (e) => {
            const files = Array.from(e.target.files ?? []).slice(0, 10); e.target.value = "";
            if (!files.length) return;
            let done = 0;
            for (const f of files) {
              setUpl(`جاري رفع الصورة ${done + 1} من ${files.length}…`);
              try {
                const fd = new FormData(); fd.append("file", f); fd.append("colorName", imgColor);
                await call(`/api/admin/products/${p.id}/images`, "POST", fd); done++;
              } catch (err) { setMsg({ t: `توقف الرفع عند الصورة ${done + 1}: ${err instanceof Error ? err.message : "فشل"}`, ok: false }); setUpl(""); router.refresh(); return; }
            }
            setUpl(""); setMsg({ t: `تم رفع ${done} صورة`, ok: true }); router.refresh();
          }} />
          {upl && <div role="status" style={{ color: "var(--ac)" }}>{upl}</div>}
          <div style={{ fontSize: 12, color: "var(--mu)" }}>تقدر تختار أكتر من صورة مرة واحدة (حتى ١٠). الصور بتتصغّر تلقائيًا قبل الرفع، فصور الموبايل العادية تنفع.</div>
          <label className="lbl" style={{ marginTop: 10 }}>فيديو المنتج (MP4/WebM، حتى 100 ميجابايت)</label>
          <input type="file" accept="video/mp4,video/webm,video/quicktime" aria-label="رفع فيديو المنتج" onChange={async (e) => { const file=e.target.files?.[0]; e.target.value=""; if(!file)return; if(file.size>100*1024*1024){setMsg({t:"حجم الفيديو يجب ألا يتجاوز 100 ميجابايت",ok:false});return;} const fd=new FormData();fd.append("file",file);setUpl("جاري رفع الفيديو…");try{await call(`/api/admin/products/${p.id}/video`,"POST",fd);setMsg({t:"تم رفع الفيديو",ok:true});router.refresh();}catch(err){setMsg({t:err instanceof Error?err.message:"فشل رفع الفيديو",ok:false});}finally{setUpl("");}}} />
          {p.videoUrl && <div style={{marginTop:8}}><video src={p.videoUrl} controls playsInline style={{width:"100%",maxWidth:360,maxHeight:220}} /><button className="btn o sm" onClick={()=>run(()=>call(`/api/admin/products/${p.id}/video`,"DELETE"),"تم حذف فيديو المنتج")}>حذف الفيديو</button></div>}
        </details>
      )}

      <div className="scroll"><table className="tbl" style={{ marginTop: 10 }}>
        <thead><tr><th>اللون</th><th>المقاس</th><th>المخزون</th><th>محجوز</th>{perms.stock && <th>تعديل المخزون</th>}</tr></thead>
        <tbody>{p.variants.map((v) => (
          <tr key={v.id}><td>{v.color}</td><td>{v.size}</td><td>{v.onHand}</td><td>{v.reserved}</td>
            {perms.stock && (
              <td style={{ whiteSpace: "nowrap" }}>
                <select value={a(v.id).type} onChange={(e) => setA(v.id, "type", e.target.value)} aria-label="نوع الحركة"><option value="PURCHASE_IN">إضافة مخزون</option><option value="RETURN_RESTOCK">مرتجع صالح للبيع</option><option value="DAMAGED">تالف</option><option value="ADJUSTMENT">جرد (+/−)</option></select>{" "}
                <input type="number" style={{ width: 64 }} value={a(v.id).qty} onChange={(e) => setA(v.id, "qty", e.target.value)} aria-label="الكمية" />{" "}
                <input placeholder="السبب" style={{ width: 110 }} value={a(v.id).reason} onChange={(e) => setA(v.id, "reason", e.target.value)} aria-label="السبب" />{" "}
                <button className="btn sm" onClick={() => run(() => call("/api/admin/inventory", "POST", { variantId: v.id, type: a(v.id).type, quantity: Number(a(v.id).qty), reason: a(v.id).reason }), "تم تعديل المخزون")}>حفظ</button>
              </td>)}
          </tr>))}</tbody>
      </table></div>

      {perms.update && (
        <div style={{ marginTop: 8 }}><b>إضافة لون/مقاس</b><br />
          <input className="in" style={{ width: 120, display: "inline-block" }} placeholder="اللون" value={nv.colorName} onChange={(e) => setNv({ ...nv, colorName: e.target.value })} aria-label="اللون" />{" "}
          <input className="in" style={{ width: 90, display: "inline-block" }} placeholder="المقاس" value={nv.sizeLabel} onChange={(e) => setNv({ ...nv, sizeLabel: e.target.value })} aria-label="المقاس" />{" "}
          <input className="in" style={{ width: 90, display: "inline-block" }} type="number" placeholder="الكمية" value={nv.quantity} onChange={(e) => setNv({ ...nv, quantity: e.target.value })} aria-label="الكمية" />{" "}
          <button className="btn sm" onClick={() => run(() => call(`/api/admin/products/${p.id}/variants`, "POST", { colorName: nv.colorName, sizeLabel: nv.sizeLabel, quantity: Number(nv.quantity) }), "تمت الإضافة")}>إضافة</button>
        </div>
      )}
      {perms.update && <p><button className="btn o sm" onClick={() => confirm("لو للمنتج طلبات سابقة سيُؤرشف بدل الحذف. متابعة؟") && run(() => call(`/api/admin/products/${p.id}`, "DELETE"), "تم")}>حذف / أرشفة المنتج</button></p>}
      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
    </details>
  );
                                             }
