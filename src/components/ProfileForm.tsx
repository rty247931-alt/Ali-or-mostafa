"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GOVERNORATES } from "@/lib/geo";

type Addr = { id: string; fullName: string; phone: string; governorate: string; city: string; addressLine: string; isDefault: boolean };

export default function ProfileForm({ fullName, marketingOptIn, notifyEmail, addresses }: { fullName: string; marketingOptIn: boolean; notifyEmail: boolean; addresses: Addr[] }) {
  const router = useRouter();
  const [p, setP] = useState({ fullName, marketingOptIn, notifyEmail });
  const [a, setA] = useState({ fullName: "", phone: "", governorate: "", city: "", addressLine: "", isDefault: false });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const send = async (url: string, method: string, body: unknown, ok: string) => {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    const first = d.fields ? Object.values(d.fields as Record<string, string[]>)[0]?.[0] : null;
    setMsg({ t: r.ok ? ok : first ?? d.error ?? "تعذر التنفيذ", ok: r.ok }); if (r.ok) router.refresh();
  };
  return (
    <>
      <div className="box">
        <label className="lbl" htmlFor="pn">الاسم</label><input id="pn" className="in" value={p.fullName} onChange={(e) => setP({ ...p, fullName: e.target.value })} />
        <label className="lbl"><input type="checkbox" checked={p.notifyEmail} onChange={(e) => setP({ ...p, notifyEmail: e.target.checked })} /> إشعارات الطلبات بالبريد</label>
        <label className="lbl"><input type="checkbox" checked={p.marketingOptIn} onChange={(e) => setP({ ...p, marketingOptIn: e.target.checked })} /> أوافق على الرسائل التسويقية</label>
        <button className="btn sm" style={{ marginTop: 8 }} onClick={() => send("/api/account/profile", "PATCH", p, "تم الحفظ")}>حفظ</button>
      </div>
      <h2>عناويني</h2>
      {addresses.length === 0 && <div className="empty">لا توجد عناوين محفوظة.</div>}
      {addresses.map((x) => (
        <div key={x.id} className="box" style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div>{x.fullName} — {x.phone}<br /><small>{x.governorate}، {x.city}، {x.addressLine}{x.isDefault ? " (افتراضي)" : ""}</small></div>
          <button className="btn o sm" onClick={() => send(`/api/account/addresses?id=${x.id}`, "DELETE", null, "تم الحذف")}>حذف</button>
        </div>
      ))}
      <details className="box"><summary><b>إضافة عنوان</b></summary>
        {(["fullName", "phone", "city", "addressLine"] as const).map((k) => (
          <div key={k}><label className="lbl" htmlFor={`a-${k}`}>{({ fullName: "الاسم", phone: "الموبايل", city: "المدينة", addressLine: "العنوان بالتفصيل" })[k]}</label>
            <input id={`a-${k}`} className="in" value={a[k]} onChange={(e) => setA({ ...a, [k]: e.target.value })} /></div>
        ))}
        <label className="lbl" htmlFor="a-gov">المحافظة</label>
        <select id="a-gov" className="in" value={a.governorate} onChange={(e) => setA({ ...a, governorate: e.target.value })}><option value="">اختر</option>{GOVERNORATES.map((g) => <option key={g}>{g}</option>)}</select>
        <label className="lbl"><input type="checkbox" checked={a.isDefault} onChange={(e) => setA({ ...a, isDefault: e.target.checked })} /> عنواني الافتراضي</label>
        <button className="btn sm" style={{ marginTop: 8 }} onClick={() => send("/api/account/addresses", "POST", a, "تمت إضافة العنوان")}>إضافة</button>
      </details>
      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
    </>
  );
}
