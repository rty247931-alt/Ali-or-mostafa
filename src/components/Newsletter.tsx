"use client";
import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  return (
    <div className="nl">
      <h2>اشترك في النشرة</h2><span>عروض ومنتجات جديدة على بريدك.</span>
      <div className="r"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="بريدك الإلكتروني" aria-label="البريد" />
        <button className="btn" onClick={async () => {
          const r = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, consent: ok }) });
          const d = await r.json().catch(() => ({}));
          setMsg({ t: r.ok ? "تم تسجيل اشتراكك" : (d.fields?.consent?.[0] ?? d.fields?.email?.[0] ?? d.error ?? "تعذر الاشتراك"), ok: r.ok });
        }}>اشترك</button></div>
      <label><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> أوافق على استلام رسائل تسويقية ويمكنني إلغاء الاشتراك في أي وقت</label>
      {msg && <div style={{ color: msg.ok ? "#7be0a8" : "#ff9c8f" }} role="status">{msg.t}</div>}
    </div>
  );
}
