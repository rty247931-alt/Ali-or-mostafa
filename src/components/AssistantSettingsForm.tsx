"use client";
import { useEffect, useMemo, useState } from "react";

type Provider = "gemini" | "openai" | "groq";
type Config = { provider: Provider; model: string; enabled: boolean; geminiConfigured: boolean; openaiConfigured: boolean; groqConfigured: boolean };
const MODELS: Record<Provider, { value: string; label: string }[]> = {
  gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash — سريع" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro — متقدم" },
  ],
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o mini — سريع واقتصادي" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    { value: "gpt-4.1", label: "GPT-4.1 — متقدم" },
  ],
  groq: [
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B — موصى به" },
    { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B — سريع" },
    { value: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
  ],
};
const DEFAULT_MODEL: Record<Provider, string> = {
  gemini: "gemini-2.0-flash",
  openai: "gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
};
const PROVIDER_LABEL: Record<Provider, string> = { gemini: "Google Gemini", openai: "OpenAI", groq: "Groq" };

export default function AssistantSettingsForm() {
  const [config, setConfig] = useState<Config>({ provider: "gemini", model: DEFAULT_MODEL.gemini, enabled: false, geminiConfigured: false, openaiConfigured: false, groqConfigured: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeOk, setNoticeOk] = useState(false);

  useEffect(() => {
    fetch("/api/admin/assistant-settings")
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "تعذر تحميل الإعدادات"); setConfig(d); })
      .catch(e => { setNotice(e instanceof Error ? e.message : "تعذر تحميل الإعدادات"); })
      .finally(() => setLoading(false));
  }, []);

  const selectedKey = useMemo(() => config.provider + ":" + config.model, [config.provider, config.model]);
  const keyConfigured = config.provider === "gemini" ? config.geminiConfigured : config.provider === "openai" ? config.openaiConfigured : config.groqConfigured;

  function changeProvider(provider: Provider) {
    setConfig(c => ({ ...c, provider, model: DEFAULT_MODEL[provider] }));
    setTested("");
    setNotice("");
  }
  function changeModel(model: string) {
    setConfig(c => ({ ...c, model }));
    setTested("");
    setNotice("");
  }

  async function testConnection() {
    setTesting(true); setTested(""); setNotice("");
    try {
      const r = await fetch("/api/admin/assistant/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: config.provider, model: config.model }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d.error || "فشل اختبار الاتصال. راجع المفتاح واسم الموديل.");
      setTested(selectedKey);
      setNotice("نجح الاختبار! المزود والموديل جاهزان. اضغط «تفعيل» لحفظ الاختيار وتشغيل المساعد.");
      setNoticeOk(true);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "فشل اختبار الاتصال");
      setNoticeOk(false);
    } finally { setTesting(false); }
  }

  async function activate(enabled: boolean) {
    if (enabled && tested !== selectedKey) {
      setNotice("اختبر المزود والموديل الحاليين أولًا قبل التفعيل.");
      setNoticeOk(false);
      return;
    }
    setSaving(true); setNotice("");
    try {
      const r = await fetch("/api/admin/assistant-settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: config.provider, model: config.model, enabled }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "تعذر حفظ الإعدادات");
      setConfig(c => ({ ...c, enabled }));
      setNotice(enabled ? "تم تفعيل المساعد بالإعدادات التي اجتازت الاختبار بنجاح." : "تم إيقاف المساعد للعملاء.");
      setNoticeOk(true);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "تعذر حفظ الإعدادات");
      setNoticeOk(false);
    } finally { setSaving(false); }
  }

  if (loading) return <p>جارٍ تحميل إعدادات المساعد...</p>;

  return <section className="card" style={{ maxWidth: 700, padding: 18, display: "grid", gap: 16 }}>
    <div>
      <h2 style={{ margin: "0 0 6px" }}>إعداد مزوّد المساعد</h2>
      <p style={{ margin: 0, color: "var(--mu)", lineHeight: 1.8 }}>اختر الشركة والموديل، اختبر الاتصال أولًا، وبعد نجاح الاختبار فعّل المساعد للمتجر.</p>
    </div>

    <label style={{ display: "grid", gap: 7 }}>
      <span>مزوّد الذكاء الاصطناعي</span>
      <select value={config.provider} onChange={e => changeProvider(e.target.value as Provider)} disabled={testing || saving} style={{ padding: 12, borderRadius: 8 }}>
        <option value="gemini">Google Gemini</option>
        <option value="openai">OpenAI</option>
        <option value="groq">Groq</option>
      </select>
    </label>

    <label style={{ display: "grid", gap: 7 }}>
      <span>الموديل</span>
      <select value={config.model} onChange={e => changeModel(e.target.value)} disabled={testing || saving} style={{ padding: 12, borderRadius: 8 }}>
        {MODELS[config.provider].map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
    </label>

    <div style={{ border: "1px solid var(--bd, #ddd)", borderRadius: 9, padding: 12, lineHeight: 1.9, fontSize: 13 }}>
      <strong>حالة مفتاح الخادم:</strong> {PROVIDER_LABEL[config.provider]} — {keyConfigured ? "المفتاح موجود على الخادم" : "لم يتم العثور على مفتاح لهذا المزود"}.
      <div style={{ color: "var(--mu)" }}>المفتاح محفوظ في إعدادات الاستضافة ولا يظهر في هذه الصفحة. تغيير المزود أو الموديل لا يحذف أي مفتاح.</div>
    </div>

    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      <button type="button" className="btn o" onClick={testConnection} disabled={testing || saving || !keyConfigured}>
        {testing ? "جارٍ اختبار الاتصال..." : "اختبار المزود والموديل"}
      </button>
      <button type="button" className="btn" onClick={() => activate(true)} disabled={saving || testing || tested !== selectedKey}>
        {saving ? "جارٍ الحفظ..." : "تفعيل المساعد"}
      </button>
      {config.enabled && <button type="button" className="btn o" onClick={() => activate(false)} disabled={saving || testing}>إيقاف المساعد</button>}
    </div>

    <div role="status" aria-live="polite" style={{ color: notice ? (noticeOk ? "#16803c" : "#b42318") : "var(--mu)", lineHeight: 1.8 }}>
      {notice || (config.enabled ? "حالة المساعد الحالية: مفعّل." : "حالة المساعد الحالية: غير مفعّل.")}
    </div>
    <p style={{ margin: 0, color: "var(--mu)", fontSize: 12 }}>لن يتم تفعيل اختيار جديد إلا بعد نجاح اختباره. مفاتيح API لا تُرسل إلى المتصفح ولا تتغير من هذه الصفحة.</p>
  </section>;
}
