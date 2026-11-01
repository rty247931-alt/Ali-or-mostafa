"use client";
import { useEffect, useState } from "react";
type Config = { provider: "gemini" | "openai"; model: string; enabled: boolean; geminiConfigured: boolean; openaiConfigured: boolean };
export default function AssistantSettingsForm() {
  const [config, setConfig] = useState<Config>({ provider: "gemini", model: "gemini-2.0-flash", enabled: true, geminiConfigured: false, openaiConfigured: false });
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [notice, setNotice] = useState("");
  useEffect(() => { fetch("/api/admin/assistant-settings").then(r => r.json()).then(setConfig).catch(() => setNotice("تعذر تحميل الإعدادات")).finally(() => setLoading(false)); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setNotice("");
    try {
      const r = await fetch("/api/admin/assistant-settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: config.provider, model: config.model, enabled: config.enabled }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "تعذر الحفظ");
      setNotice("تم حفظ الإعدادات. التغيير يعمل فورًا دون إعادة بناء الموقع.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "تعذر الحفظ"); } finally { setSaving(false); }
  }
  if (loading) return <p>جارٍ تحميل الإعدادات...</p>;
  return <form onSubmit={save} className="card" style={{ maxWidth: 650, padding: 18, display: "grid", gap: 14 }}>
    <label style={{ display: "grid", gap: 6 }}>مزوّد الذكاء الاصطناعي
      <select value={config.provider} onChange={e => setConfig({ ...config, provider: e.target.value as Config["provider"], model: e.target.value === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini" })} style={{ padding: 11 }}>
        <option value="gemini">Google Gemini</option><option value="openai">OpenAI / متوافق مع OpenAI</option>
      </select>
    </label>
    <label style={{ display: "grid", gap: 6 }}>اسم الموديل
      <input value={config.model} onChange={e => setConfig({ ...config, model: e.target.value })} required maxLength={100} style={{ padding: 11 }} />
    </label>
    <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} /> تفعيل المساعد للعملاء</label>
    <div style={{ fontSize: 13, color: "#666", lineHeight: 1.8 }}>حالة مفاتيح الخادم: Gemini {config.geminiConfigured ? "مُعدّ" : "غير مُعدّ"} — OpenAI {config.openaiConfigured ? "مُعدّ" : "غير مُعدّ"}.<br />المفاتيح لا تُعرض ولا تُرسل إلى المتصفح. أضفها في Environment Variables على منصة الاستضافة.</div>
    <button disabled={saving} type="submit" className="btn">{saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}</button>
    {notice && <p role="status">{notice}</p>}
  </form>;
}
