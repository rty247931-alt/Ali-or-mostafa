"use client";
import { useState } from "react";

export type SField = { key: string; label: string; type?: "text" | "email" | "textarea" | "number" | "password"; required?: boolean };

/** Small reusable public form: validates on the server, shows errors beside the fields. */
export default function SimpleForm({ endpoint, fields, extra, submitLabel, okMessage }: { endpoint: string; fields: SField[]; extra?: Record<string, unknown>; submitLabel: string; okMessage: string }) {
  const [v, setV] = useState<Record<string, string>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      {fields.map((f) => (
        <div key={f.key}>
          <label className="lbl" htmlFor={`sf-${f.key}`}>{f.label}</label>
          {f.type === "textarea" ? <textarea id={`sf-${f.key}`} className="in" rows={4} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
            : <input id={`sf-${f.key}`} className="in" type={f.type ?? "text"} autoComplete={f.type === "password" ? "new-password" : undefined} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />}
          <div className="err">{errs[f.key] ?? ""}</div>
        </div>
      ))}
      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
      <button className="btn" disabled={busy} style={{ marginTop: 8 }} onClick={async () => {
        setBusy(true); setMsg(null); setErrs({});
        const body: Record<string, unknown> = { ...extra };
        for (const f of fields) body[f.key] = f.type === "number" ? Number(v[f.key]) : (v[f.key] ?? "");
        try {
          const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) { const fe: Record<string, string> = {}; for (const [k, x] of Object.entries((d.fields ?? {}) as Record<string, string[]>)) fe[k] = x[0]; setErrs(fe); setMsg({ t: d.error ?? "تعذر الإرسال", ok: false }); }
          else { setMsg({ t: d.message ?? okMessage, ok: true }); setV({}); }
        } catch { setMsg({ t: "فشل الاتصال، حاول مرة أخرى", ok: false }); }
        setBusy(false);
      }}>{submitLabel}</button>
    </div>
  );
}
