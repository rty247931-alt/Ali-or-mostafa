"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminProductRow, { type AdminP } from "./AdminProductRow";
import AdminProductForm from "./AdminProductForm";

type Opt = { id: string; name: string };

export default function ProductsManager({ products, categories, brands, perms, canCreate }: { products: AdminP[]; categories: Opt[]; brands: Opt[]; perms: { price: boolean; update: boolean; stock: boolean }; canCreate: boolean }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState({ action: "status", value: "ACTIVE" });
  const [msg, setMsg] = useState<{ t: string; ok: boolean; list?: string[] } | null>(null);
  const [q, setQ] = useState("");

  async function applyBulk() {
    const r = await fetch("/api/admin/products/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...sel], ...bulk }) });
    const d = await r.json().catch(() => ({}));
    setMsg({ t: r.ok ? `تم تحديث ${d.updated} منتج` : d.error ?? "تعذر التنفيذ", ok: r.ok }); if (r.ok) { setSel(new Set()); router.refresh(); }
  }
  async function importFile(file: File) {
    const csv = await file.text();
    const r = await fetch("/api/admin/products/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv }) });
    const d = await r.json().catch(() => ({}));
    setMsg({ t: r.ok ? `تم استيراد ${d.imported} منتج (كمسودة ما لم يُحدد غير ذلك)` : d.error ?? "تعذر الاستيراد", ok: r.ok, list: d.errors }); if (r.ok) router.refresh();
  }
  const shown = products.filter((p) => !q || p.name.includes(q));

  return (
    <>
      {canCreate && <AdminProductForm categories={categories} brands={brands} />}
      <div className="tools">
        <input className="in" placeholder="بحث في المنتجات" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث" />
        <a className="btn o sm" href="/api/admin/products/export">تصدير CSV</a>
        {canCreate && <label className="btn o sm">استيراد CSV<input type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} /></label>}
      </div>
      {canCreate && <details style={{ marginBottom: 8 }}><summary>شكل ملف الاستيراد</summary><p dir="ltr" style={{ fontSize: 12 }}>sku,name,slug,category_slug,base_price,sale_price,material,color,size,quantity,status<br />سطر لكل لون ومقاس. المنتج الموجود (نفس sku أو slug) يُرفض. لا يُستورد شيء إن وُجد خطأ.</p></details>}
      {perms.update && sel.size > 0 && (
        <div className="box" style={{ marginBottom: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <b>{sel.size.toLocaleString("ar-EG")} محدد</b>
          <select className="in" style={{ width: "auto" }} value={bulk.action} onChange={(e) => setBulk({ action: e.target.value, value: e.target.value === "status" ? "ACTIVE" : categories[0]?.id ?? "" })} aria-label="الإجراء"><option value="status">تغيير الحالة</option><option value="category">تغيير القسم</option></select>
          {bulk.action === "status"
            ? <select className="in" style={{ width: "auto" }} value={bulk.value} onChange={(e) => setBulk({ ...bulk, value: e.target.value })}><option value="ACTIVE">ظاهر</option><option value="HIDDEN">مخفي</option><option value="PAUSED">إيقاف البيع</option><option value="ARCHIVED">أرشيف</option><option value="DRAFT">مسودة</option></select>
            : <select className="in" style={{ width: "auto" }} value={bulk.value} onChange={(e) => setBulk({ ...bulk, value: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
          <button className="btn sm" onClick={applyBulk}>تطبيق</button>
        </div>
      )}
      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}{msg.list && <ul>{msg.list.map((l) => <li key={l}>{l}</li>)}</ul>}</div>}
      {shown.length === 0 && <div className="empty">لا توجد منتجات. أضف أول منتج أو استورد ملف CSV.</div>}
      {shown.map((p) => <AdminProductRow key={p.id} p={p} perms={perms} categories={categories} brands={brands} selected={sel.has(p.id)} onSelect={(v) => { const n = new Set(sel); v ? n.add(p.id) : n.delete(p.id); setSel(n); }} />)}
    </>
  );
}
