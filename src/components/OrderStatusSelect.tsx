"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderStatusSelect({ id, options }: { id: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  if (options.length === 0) return <span style={{ color: "var(--mu)" }}>نهائي</span>;
  return (
    <>
      <select aria-label="تغيير حالة الطلب" defaultValue="" onChange={async (e) => {
        const status = e.target.value; if (!status) return;
        if (status === "CANCELLED" && !confirm("إلغاء الطلب سيعيد المخزون. هل أنت متأكد؟")) { e.target.value = ""; return; }
        const r = await fetch(`/api/admin/orders/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setErr(d.error ?? "تعذر تغيير الحالة"); e.target.value = ""; return; }
        setErr(""); router.refresh();
      }}>
        <option value="">تغيير الحالة…</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {err && <div className="err" role="alert">{err}</div>}
    </>
  );
}
