"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import OrderStatusSelect from "./OrderStatusSelect";

export default function OrderActions({ id, options, canChange, refundable }: { id: string; options: { value: string; label: string }[]; canChange: boolean; refundable: number }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [ship, setShip] = useState({ carrier: "", trackingNo: "" });
  const [ref, setRef] = useState({ amount: "", reason: "" });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const call = async (path: string, body: unknown, ok: string) => {
    const r = await fetch(`/api/admin/orders/${id}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setMsg({ t: r.ok ? ok : d.error ?? "تعذر التنفيذ", ok: r.ok }); if (r.ok) router.refresh();
  };
  if (!canChange) return null;
  return (
    <div className="box" style={{ marginTop: 12 }}>
      <h3 style={{ margin: 0 }}>إجراءات</h3>
      <span className="lbl">تغيير الحالة</span><OrderStatusSelect id={id} options={options} />
      <span className="lbl">ملاحظة داخلية</span>
      <input className="in" value={note} onChange={(e) => setNote(e.target.value)} aria-label="ملاحظة" />
      <button className="btn o sm" style={{ marginTop: 6 }} onClick={() => call("note", { note }, "تمت إضافة الملاحظة").then(() => setNote(""))}>إضافة</button>
      <span className="lbl">بيانات الشحن (يدخلها الموظف، لا يوجد تتبع لحظي)</span>
      <input className="in" placeholder="شركة الشحن" value={ship.carrier} onChange={(e) => setShip({ ...ship, carrier: e.target.value })} aria-label="شركة الشحن" />
      <input className="in" placeholder="رقم التتبع (اختياري)" value={ship.trackingNo} onChange={(e) => setShip({ ...ship, trackingNo: e.target.value })} style={{ marginTop: 6 }} aria-label="رقم التتبع" />
      <button className="btn o sm" style={{ marginTop: 6 }} onClick={() => call("shipment", ship, "تم تسجيل الشحنة")}>تسجيل الشحنة</button>
      {refundable > 0 && (<>
        <span className="lbl">تسجيل مبلغ مسترد (سُدّد للعميل فعلًا) — المتاح {refundable.toLocaleString("ar-EG")} ج.م</span>
        <input className="in" type="number" placeholder="المبلغ" value={ref.amount} onChange={(e) => setRef({ ...ref, amount: e.target.value })} aria-label="المبلغ" />
        <input className="in" placeholder="السبب" value={ref.reason} onChange={(e) => setRef({ ...ref, reason: e.target.value })} style={{ marginTop: 6 }} aria-label="السبب" />
        <button className="btn o sm" style={{ marginTop: 6 }} onClick={() => call("refund", { amount: Number(ref.amount), reason: ref.reason }, "تم تسجيل الاسترداد")}>تسجيل</button>
      </>)}
      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
    </div>
  );
}
