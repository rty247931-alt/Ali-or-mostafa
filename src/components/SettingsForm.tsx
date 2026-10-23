"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type V = Record<string, any>;
type Item = { key: string; label: string; type: "text" | "number" | "bool" | "color"; hint?: string };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "المتجر", items: [{ key: "store.name", label: "اسم المتجر", type: "text" }, { key: "store.description", label: "وصف المتجر", type: "text" }, { key: "store.logo", label: "شعار المتجر", type: "text" }, { key: "store.background", label: "خلفية المتجر", type: "text" }] },
  { title: "الهوية (الألوان)", items: [{ key: "theme.primary", label: "اللون الأساسي", type: "color" }, { key: "theme.ink", label: "لون النص على اللون الأساسي", type: "color" }] },
  { title: "الواجهة الرئيسية", items: [{ key: "hero.title", label: "عنوان الواجهة", type: "text" }, { key: "hero.subtitle", label: "الوصف", type: "text" }, { key: "hero.image", label: "صورة الواجهة", type: "text" }] },
  { title: "التواصل", items: [{ key: "contact.phone", label: "الهاتف", type: "text" }, { key: "contact.email", label: "البريد", type: "text" }, { key: "contact.address", label: "العنوان", type: "text" }] },
  { title: "روابط التواصل الاجتماعي", items: [{ key: "social.facebook", label: "فيسبوك", type: "text" }, { key: "social.instagram", label: "إنستجرام", type: "text" }, { key: "social.whatsapp", label: "واتساب", type: "text" }, { key: "social.tiktok", label: "تيك توك", type: "text" }] },
  { title: "الشحن", items: [{ key: "shipping.trackingUrl", label: "قالب رابط تتبع الشحنة", type: "text", hint: "مثال: https://موقع-شركة-الشحن/track/{tracking}  (يحل مكان {tracking} رقم التتبع). اتركه فارغًا إن لم يوجد" }] },
  { title: "الطلبات", items: [{ key: "order.minTotal", label: "الحد الأدنى للطلب (ج.م، ٠ = بدون)", type: "number" }, { key: "checkout.guest.enabled", label: "السماح بالشراء كزائر", type: "bool" }] },
  { title: "الضرائب", items: [{ key: "tax.enabled", label: "تفعيل الضريبة", type: "bool", hint: "فعّلها وفق قواعد بلدك فقط، بعد استشارة محاسب" }, { key: "tax.rate", label: "النسبة ٪", type: "number" }, { key: "tax.included", label: "الأسعار شاملة الضريبة", type: "bool" }] },
  { title: "المحافظ الإلكترونية", items: [{ key: "payments.wallet.enabled", label: "تفعيل الدفع بالمحفظة الإلكترونية", type: "bool" }, { key: "payments.wallet.vodafone", label: "رقم فودافون كاش", type: "text" }, { key: "payments.wallet.orange", label: "رقم أورنج كاش", type: "text" }, { key: "payments.wallet.etisalat", label: "رقم اتصالات كاش", type: "text" }, { key: "payments.wallet.instructions", label: "تعليمات التحويل للعميل", type: "text", hint: "اكتب خطوات التحويل واطلب من العميل رفع صورة الإيصال قبل تأكيد الطلب." }] },
  { title: "الصيانة", items: [{ key: "maintenance", label: "وضع الصيانة (المتجر مغلق للزوار، الإدارة تعمل)", type: "bool" }] },
];

export default function SettingsForm({ values, paymobConfigured, paymentsVerified }: { values: V; paymobConfigured: boolean; paymentsVerified: boolean }) {
  const router = useRouter();
  const ann = values.announcement ?? { text: "", url: "", visible: false, endsAt: null };
  const [v, setV] = useState<V>(values);
  const [a, setA] = useState({ text: ann.text ?? "", url: ann.url ?? "", visible: !!ann.visible, endsAt: ann.endsAt ? String(ann.endsAt).slice(0, 16) : "" });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const def = (it: Item) => v[it.key] ?? (it.type === "bool" ? (it.key === "checkout.guest.enabled" || it.key === "payments.wallet.enabled") : it.type === "number" ? 0 : it.type === "color" ? "#000000" : "");


  async function uploadSettingImage(key: string, file?: File) {
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("entity", "settings");
      const r = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "تعذر رفع الصورة");
      setV((old) => ({ ...old, [key]: d.url }));
      setMsg({ t: "تم رفع الصورة. اضغط حفظ الإعدادات لتثبيتها.", ok: true });
    } catch (e) {
      setMsg({ t: e instanceof Error ? e.message : "تعذر رفع الصورة", ok: false });
    } finally { setBusy(false); }
  }
  const [profile, setProfile] = useState({ fullName: "", email: "", currentPassword: "", newPassword: "" });
  const [profileLoaded, setProfileLoaded] = useState(false);
  async function loadProfile() {
    if (profileLoaded) return;
    const r = await fetch("/api/admin/profile");
    const d = await r.json().catch(() => ({}));
    if (r.ok) setProfile((p) => ({ ...p, fullName: d.fullName ?? "", email: d.email ?? "" }));
    setProfileLoaded(true);
  }
  async function saveProfile() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const d = await r.json().catch(() => ({}));
      setMsg({ t: r.ok ? "تم تحديث بيانات المدير" : d.error ?? "تعذر حفظ بيانات المدير", ok: r.ok });
      if (r.ok) setProfile((p) => ({ ...p, currentPassword: "", newPassword: "" }));
    } catch { setMsg({ t: "فشل الاتصال", ok: false }); }
    finally { setBusy(false); }
  }

  async function patch(body: unknown, ok: string) {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setMsg({ t: r.ok ? ok : d.error ?? "تعذر الحفظ", ok: r.ok }); setBusy(false); if (r.ok) router.refresh();
  }
  function save() {
    const body: V = {};
    for (const g of GROUPS) for (const it of g.items) body[it.key] = it.type === "number" ? Number(def(it)) : it.type === "bool" ? !!def(it) : String(def(it));
    body.announcement = { text: a.text, url: a.url || undefined, visible: a.visible, endsAt: a.endsAt ? new Date(a.endsAt).toISOString() : null };
    patch(body, "تم حفظ الإعدادات");
  }
  async function test() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/payments/test", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setMsg({ t: r.ok ? "نجح اختبار الاتصال ببوابة الدفع" : d.error ?? "فشل الاختبار", ok: r.ok }); setBusy(false); router.refresh();
  }

  return (
    <div>
      {GROUPS.map((g) => (
        <div key={g.title} className="box" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>{g.title}</h3>
          {g.items.map((it) => (
            <div key={it.key}>
              {it.type === "bool" ? <label className="lbl"><input type="checkbox" checked={!!def(it)} onChange={(e) => setV({ ...v, [it.key]: e.target.checked })} /> {it.label}</label> : (
                <><label className="lbl" htmlFor={it.key}>{it.label}</label>
                  <input id={it.key} className="in" type={it.type === "color" ? "color" : it.type === "number" ? "number" : "text"} value={def(it)} onChange={(e) => setV({ ...v, [it.key]: e.target.value })} style={it.type === "color" ? { height: 42, padding: 2 } : undefined} />
                  {["store.logo", "store.background", "hero.image"].includes(it.key) && <div style={{ marginTop: 8 }}>
                    <label className="btn o sm" style={{ display: "inline-block" }}>
                      إضافة صورة من الجهاز
                      <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => { void uploadSettingImage(it.key, e.target.files?.[0]); e.currentTarget.value = ""; }} />
                    </label>
                    {typeof def(it) === "string" && def(it) && <div style={{ marginTop: 8 }}><img src={String(def(it))} alt="معاينة الصورة" style={{ maxWidth: 200, maxHeight: 120, objectFit: "contain", borderRadius: 8 }} /></div>}
                  </div>}
                  {["store.logo", "store.background", "hero.image"].includes(it.key) && <p style={{ fontSize: 12 }}>يمكن رفع صورة من الجهاز هنا، ثم حفظ الإعدادات.</p>}</>
              )}
              {it.hint && <div style={{ fontSize: 12, color: "var(--mu)" }}>{it.hint}</div>}
            </div>
          ))}
        </div>
      ))}
      <div className="box" style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>شريط الإعلانات</h3>
        <label className="lbl" htmlFor="at">النص</label><input id="at" className="in" value={a.text} onChange={(e) => setA({ ...a, text: e.target.value })} />
        <label className="lbl" htmlFor="au">الرابط (اختياري)</label><input id="au" className="in" value={a.url} onChange={(e) => setA({ ...a, url: e.target.value })} />
        <label className="lbl" htmlFor="ae">ينتهي في (اختياري)</label><input id="ae" className="in" type="datetime-local" value={a.endsAt} onChange={(e) => setA({ ...a, endsAt: e.target.value })} />
        <label className="lbl"><input type="checkbox" checked={a.visible} onChange={(e) => setA({ ...a, visible: e.target.checked })} /> إظهار الشريط</label>
      </div>
      <button className="btn" disabled={busy} onClick={save}>حفظ الإعدادات</button>
      <div className="box" style={{ margin: "14px 0" }}>
        <h3 style={{ margin: 0 }}>بيانات المدير وتسجيل الدخول</h3>
        <p style={{ color: "var(--mu)" }}>تغيير كلمة المرور يتطلب إدخال كلمة المرور الحالية، والجديدة لا تقل عن ١٢ حرفًا.</p>
        <label className="lbl" htmlFor="admin-full-name">اسم المدير</label>
        <input id="admin-full-name" className="in" value={profile.fullName} onFocus={() => { void loadProfile(); }} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
        <label className="lbl" htmlFor="admin-email">بريد المدير</label>
        <input id="admin-email" className="in" type="email" value={profile.email} onFocus={() => { void loadProfile(); }} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
        <label className="lbl" htmlFor="admin-current-password">كلمة المرور الحالية</label>
        <input id="admin-current-password" className="in" type="password" autoComplete="current-password" value={profile.currentPassword} onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })} />
        <label className="lbl" htmlFor="admin-new-password">كلمة المرور الجديدة</label>
        <input id="admin-new-password" className="in" type="password" autoComplete="new-password" value={profile.newPassword} onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })} />
        <button className="btn o sm" style={{ marginTop: 10 }} disabled={busy} onClick={saveProfile}>حفظ بيانات المدير</button>
      </div>
      <div className="box" style={{ margin: "14px 0" }}>
        <h3 style={{ margin: 0 }}>الدفع الإلكتروني</h3>
        <p style={{ color: "var(--mu)" }}>الحالة: {!paymobConfigured ? "غير مضبوط (أضف متغيرات PAYMOB_* في بيئة التشغيل)" : paymentsVerified ? "مضبوط ونجح اختباره" : "مضبوط ولم يُختبر بعد"}</p>
        <button className="btn o sm" disabled={busy || !paymobConfigured} onClick={test}>اختبار الاتصال</button>
        <label className="lbl"><input type="checkbox" checked={!!v["payments.online.enabled"]} disabled={!paymentsVerified} onChange={(e) => setV({ ...v, "payments.online.enabled": e.target.checked })} /> تفعيل الدفع الإلكتروني للعملاء</label>
        <button className="btn sm" style={{ marginTop: 8 }} disabled={busy || !paymentsVerified} onClick={() => patch({ "payments.online.enabled": !!v["payments.online.enabled"] }, "تم حفظ حالة الدفع الإلكتروني")}>حفظ حالة الدفع</button>
      </div>
      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
    </div>
  );
}
