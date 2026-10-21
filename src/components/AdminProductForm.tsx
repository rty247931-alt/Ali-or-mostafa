"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Opt = { id: string; name: string };

export default function AdminProductForm({ categories, brands }: { categories: Opt[]; brands: Opt[] }) {
  const router = useRouter();
  const [v, setV] = useState({ name: "", slug: "", sku: "", categoryId: "", brandId: "", basePrice: "", salePrice: "", material: "", shoeType: "", description: "", status: "DRAFT", variants: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  // Each line:  اللون | المقاسات مفصولة بفاصلة | الكمية لكل مقاس
  function parseVariants() {
    const out: { colorName: string; sizeLabel: string; quantity: number }[] = [];
    for (const line of v.variants.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const [color, sizes, qty] = line.split("|").map((x) => x.trim());
      const q = Number(qty);
      if (!color || !sizes || !Number.isInteger(q) || q < 0) throw new Error(`سطر غير صحيح: ${line}`);
      for (const s of sizes.split(",").map((x) => x.trim()).filter(Boolean)) out.push({ colorName: color, sizeLabel: s, quantity: q });
    }
    return out;
  }

  async function submit() {
    setBusy(true); setMsg(null); setErrs({});
    try {
      const body = {
        name: v.name, slug: v.slug, sku: v.sku, categoryId: v.categoryId, brandId: v.brandId || null,
        basePrice: Number(v.basePrice), salePrice: v.salePrice ? Number(v.salePrice) : null,
        material: v.material || undefined, shoeType: v.shoeType || undefined, description: v.description || undefined,
        status: v.status, variants: parseVariants(),
      };
      const r = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) {
        const fe: Record<string, string> = {};
        for (const [k, x] of Object.entries((d.fields ?? {}) as Record<string, string[]>)) fe[k] = x[0];
        setErrs(fe); setMsg({ t: d.error ?? "تعذر الحفظ", ok: false }); setBusy(false); return;
      }
      setMsg({ t: "تم إنشاء المنتج", ok: true }); setV({ ...v, name: "", slug: "", sku: "", basePrice: "", salePrice: "", variants: "" }); router.refresh();
    } catch (e) { setMsg({ t: e instanceof Error ? e.message : "فشل الاتصال", ok: false }); }
    setBusy(false);
  }

  const f = (k: keyof typeof v, label: string, extra?: object) => (
    <div><label className="lbl" htmlFor={`p_${k}`}>{label}</label><input id={`p_${k}`} className="in" value={v[k]} onChange={set(k)} {...extra} /><div className="err">{errs[k] ?? ""}</div></div>
  );
  return (
    <details className="box" style={{ marginBottom: 14 }}>
      <summary><b>إضافة منتج جديد</b></summary>
      {f("name", "اسم المنتج")}{f("slug", "الرابط (إنجليزي، مثال: runner-pro)", { dir: "ltr" })}{f("sku", "كود المنتج SKU", { dir: "ltr" })}
      <label className="lbl" htmlFor="p_cat">القسم</label>
      <select id="p_cat" className="in" value={v.categoryId} onChange={set("categoryId")}><option value="">اختر</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <div className="err">{errs.categoryId ?? ""}</div>
      <label className="lbl" htmlFor="p_brand">الماركة (اختياري)</label>
      <select id="p_brand" className="in" value={v.brandId} onChange={set("brandId")}><option value="">بدون</option>{brands.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      {f("basePrice", "السعر الأساسي (ج.م)", { type: "number", min: 0 })}{f("salePrice", "سعر البيع بعد الخصم (اختياري، أقل من الأساسي)", { type: "number", min: 0 })}
      {f("material", "الخامة")}{f("shoeType", "نوع الحذاء")}
      <label className="lbl" htmlFor="p_desc">الوصف</label><textarea id="p_desc" className="in" rows={3} value={v.description} onChange={set("description")} />
      <label className="lbl" htmlFor="p_var">الألوان والمقاسات والكمية (سطر لكل لون)</label>
      <textarea id="p_var" className="in" rows={3} dir="ltr" placeholder={"أسود | 40,41,42 | 5\nبني | 41,42 | 3"} value={v.variants} onChange={set("variants")} />
      <div className="err">{errs.variants ?? ""}</div>
      <label className="lbl" htmlFor="p_st">الحالة</label>
      <select id="p_st" className="in" value={v.status} onChange={set("status")}><option value="DRAFT">مسودة (غير ظاهر)</option><option value="ACTIVE">نشط (ظاهر في المتجر)</option></select>
      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
      <button className="btn" disabled={busy} onClick={submit} style={{ marginTop: 10 }}>{busy ? "..." : "حفظ المنتج"}</button>
    </details>
  );
}
