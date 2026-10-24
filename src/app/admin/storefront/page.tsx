"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const designs = [
  { id: "classic", name: "الكلاسيكي", description: "متوازن وواضح", colors: ["#F4F1EA", "#FF4A1C", "#0E0E10"] },
  { id: "minimal", name: "البسيط", description: "مساحات هادئة وألوان قليلة", colors: ["#FFFFFF", "#222222", "#777777"] },
  { id: "bold", name: "الجريء", description: "تباين قوي ولمسات لافتة", colors: ["#FFF4EF", "#E11D48", "#191919"] },
  { id: "warm", name: "الدافئ", description: "ألوان ترابية ومريحة", colors: ["#F7EFE3", "#B65F35", "#49382D"] },
  { id: "luxury", name: "الفاخر", description: "أسود وذهبي هادئ", colors: ["#171717", "#D4AF37", "#F5F0E5"] },
  { id: "sport", name: "الرياضي", description: "ألوان حيوية وحركة", colors: ["#F0F7F4", "#087F5B", "#102A43"] },
  { id: "fresh", name: "المنعش", description: "فاتح وناعم", colors: ["#F1F8FF", "#3987D7", "#17324D"] },
] as const;

export default function StorefrontDesignPage() {
  const [selected, setSelected] = useState<string>("classic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then(async (r) => {
      if (!r.ok) throw new Error("تعذر تحميل الإعدادات. تأكد من صلاحيات الإدارة.");
      return r.json();
    }).then((data) => {
      const current = data?.values?.["storefront.design"];
      if (designs.some((d) => d.id === current)) setSelected(current);
    }).catch((e) => setMessage(e instanceof Error ? e.message : "حدث خطأ أثناء التحميل"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "storefront.design": selected }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || data?.message || "لم يتم حفظ التصميم");
      setMessage("تم حفظ التصميم. سيظهر في واجهة المتجر.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "تعذر حفظ التصميم");
    } finally {
      setSaving(false);
    }
  }

  return <main dir="rtl" className="pg">
    <div className="mb-5 flex items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">تغيير واجهة المتجر</h1><p className="text-sm" style={{color:"var(--mu)"}}>اختر تصميمًا ثم اضغط حفظ لتطبيق اختيارك.</p></div>
      <Link href="/admin" className="rounded-xl border px-4 py-2 text-sm font-semibold">رجوع للإدارة</Link>
    </div>
    {loading ? <div className="box">جارٍ تحميل الإعدادات…</div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {designs.map((design) => <button key={design.id} type="button" onClick={() => setSelected(design.id)} aria-pressed={selected === design.id}
        className="box text-right transition" style={{border: selected === design.id ? "3px solid var(--ac)" : "2px solid var(--ln)", boxShadow: selected === design.id ? "0 0 0 2px color-mix(in srgb, var(--ac) 20%, transparent)" : "none"}}>
        <div className="mb-4 flex h-24 overflow-hidden rounded-xl border" style={{borderColor:design.colors[2]}}>
          <div style={{background:design.colors[0],color:design.colors[2]}} className="flex flex-1 flex-col justify-between p-3">
            <span className="font-extrabold">خُطوة.</span><span className="text-xs">أحذية تمشي معاك</span>
            <span className="w-fit rounded-full px-3 py-1 text-xs font-bold" style={{background:design.colors[1],color:design.id==="luxury"?"#171717":"#fff"}}>تسوق الآن</span>
          </div><div style={{background:design.colors[1]}} className="w-1/4"/>
        </div>
        <div className="flex items-center justify-between gap-2"><div><h2 className="font-bold">{design.name}</h2><p className="text-sm" style={{color:"var(--mu)"}}>{design.description}</p></div>
          <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full border" style={{borderColor:design.colors[1],background:selected===design.id?design.colors[1]:"transparent",color:"#fff"}}>{selected===design.id?"✓":""}</span></div>
      </button>)}
    </div>}
    <div className="mt-5 flex flex-wrap items-center gap-3"><button className="btn" onClick={save} disabled={loading||saving}>{saving?"جارٍ الحفظ…":"حفظ وتطبيق التصميم"}</button>{message && <p role="status" className="text-sm">{message}</p>}</div>
  </main>;
}
