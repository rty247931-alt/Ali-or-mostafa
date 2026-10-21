"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Field } from "@/lib/entities";

type Row = Record<string, any> & { id: string; _label: string };

const toLocal = (iso: unknown) => {
  if (!iso) return "";
  const d = new Date(String(iso)); if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const initial = (f: Field, r?: Row): unknown => {
  const v = r?.[f.key];
  if (f.type === "checkbox") return r ? !!v : (f.default ?? true);
  if (f.type === "datetime") return toLocal(v);
  if (f.type === "number") return v == null || v === "" ? (r ? "" : f.default ?? "") : String(Number(v));
  return v ?? (r ? "" : f.default ?? "");
};
const payload = (fields: Field[], vals: Record<string, any>) => {
  const o: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.readOnly) continue;
    const v = vals[f.key];
    o[f.key] = f.type === "checkbox" ? !!v : f.type === "number" ? (v === "" || v == null ? null : Number(v)) : f.type === "datetime" ? (v ? new Date(v).toISOString() : null) : v;
  }
  return o;
};

function Form({ entity, fields, row, canDelete, onDone }: { entity: string; fields: Field[]; row?: Row; canDelete: boolean; onDone: () => void }) {
  const [vals, setVals] = useState<Record<string, any>>(() => Object.fromEntries(fields.map((f) => [f.key, initial(f, row)])));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setVals({ ...vals, [k]: v });

  async function call(method: string, url: string, body?: unknown) {
    setBusy(true); setMsg(null); setErrs({});
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries((d.fields ?? {}) as Record<string, string[]>)) fe[k] = v[0];
        setErrs(fe); setMsg({ t: d.error ?? "تعذر الحفظ", ok: false }); setBusy(false); return;
      }
      setMsg({ t: "تم", ok: true }); setBusy(false); onDone();
    } catch { setMsg({ t: "فشل الاتصال", ok: false }); setBusy(false); }
  }

  return (
    <div>
      {fields.map((f) => (
        <div key={f.key}>
          {f.type === "checkbox" ? (
            <label className="lbl"><input type="checkbox" checked={!!vals[f.key]} onChange={(e) => set(f.key, e.target.checked)} /> {f.label}</label>
          ) : (
            <>
              <label className="lbl" htmlFor={`${entity}-${row?.id ?? "new"}-${f.key}`}>{f.label}{f.required ? " *" : ""}</label>
              {f.type === "textarea" ? <textarea id={`${entity}-${row?.id ?? "new"}-${f.key}`} className="in" rows={4} value={vals[f.key]} readOnly={f.readOnly} onChange={(e) => set(f.key, e.target.value)} />
                : f.type === "select" ? (
                  <select id={`${entity}-${row?.id ?? "new"}-${f.key}`} className="in" value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                    {!f.default && <option value="">اختر</option>}{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : <input id={`${entity}-${row?.id ?? "new"}-${f.key}`} className="in" type={f.type === "number" ? "number" : f.type === "datetime" ? "datetime-local" : "text"} step="any" value={vals[f.key]} readOnly={f.readOnly} onChange={(e) => set(f.key, e.target.value)} />}
            </>
          )}
          {f.hint && <div style={{ fontSize: 12, color: "var(--mu)" }}>{f.hint}</div>}
          <div className="err">{errs[f.key] ?? ""}</div>
        </div>
      ))}
      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn sm" disabled={busy} onClick={() => row ? call("PATCH", `/api/admin/entities/${entity}/${row.id}`, payload(fields, vals)) : call("POST", `/api/admin/entities/${entity}`, payload(fields, vals))}>{row ? "حفظ" : "إضافة"}</button>
        {row && canDelete && <button className="btn o sm" disabled={busy} onClick={() => confirm("حذف نهائي؟") && call("DELETE", `/api/admin/entities/${entity}/${row.id}`)}>حذف</button>}
      </div>
    </div>
  );
}

export default function EntityManager({ entity, fields, rows, canCreate, canDelete }: { entity: string; fields: Field[]; rows: Row[]; canCreate: boolean; canDelete: boolean }) {
  const router = useRouter();
  const done = () => router.refresh();
  return (
    <>
      {canCreate && <details className="box" style={{ marginBottom: 12 }}><summary><b>إضافة جديد</b></summary><Form entity={entity} fields={fields} canDelete={false} onDone={done} /></details>}
      {rows.length === 0 && <div className="empty">لا توجد عناصر بعد.</div>}
      {rows.map((r) => (
        <details key={r.id} className="box" style={{ marginBottom: 8 }}>
          <summary>{r._label}</summary>
          <Form entity={entity} fields={fields} row={r} canDelete={canDelete} onDone={done} />
        </details>
      ))}
    </>
  );
}
