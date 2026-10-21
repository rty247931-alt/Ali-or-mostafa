"use client";
import { useState } from "react";

export default function CustomerNotes({ id, notes }: { id: string; notes: string }) {
  const [v, setV] = useState(notes);
  const [m, setM] = useState("");
  return (
    <div>
      <textarea className="in" rows={2} value={v} onChange={(e) => setV(e.target.value)} aria-label="ملاحظات داخلية" placeholder="ملاحظات داخلية (لا تظهر للعميل)" />
      <button className="btn o sm" onClick={async () => { const r = await fetch(`/api/admin/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ internalNotes: v }) }); setM(r.ok ? "تم الحفظ" : "تعذر الحفظ"); }}>حفظ</button> <small>{m}</small>
    </div>
  );
}
