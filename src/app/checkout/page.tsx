"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { egp, readCart, writeCart } from "@/lib/cart-client";
import { GOVERNORATES } from "@/lib/geo";

export default function Checkout() {
  const router = useRouter();
  const key = useRef("");
  const [total, setTotal] = useState<number | null>(null);
  const [gov, setGov] = useState("");
  const [pay, setPay] = useState<"COD" | "ONLINE">("COD");
  const [onlineOk, setOnlineOk] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", email: "", city: "", area: "", addressLine: "", landmark: "", notes: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // One idempotency key per checkout attempt: resubmitting the same order can never create two.
    key.current = sessionStorage.getItem("st_idem") ?? crypto.randomUUID();
    sessionStorage.setItem("st_idem", key.current);
    const g = sessionStorage.getItem("st_gov") ?? ""; setGov(g);
    const lines = readCart();
    if (!lines.length || !g) { router.replace("/cart"); return; }
    fetch("/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: lines, governorate: g, couponCode: sessionStorage.getItem("st_coupon") || null }) })
      .then((r) => r.json()).then((q) => setTotal(q.totalCents ?? null)).catch(() => setMsg("تعذر تحميل الإجمالي"));
    fetch("/api/payment-methods").then((r) => r.json()).then((d) => setOnlineOk(!!d.online)).catch(() => {});
  }, [router]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    setBusy(true); setMsg(""); setErrs({});
    try {
      const r = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: key.current, items: readCart(), couponCode: sessionStorage.getItem("st_coupon") || null, paymentMethod: pay,
          customer: { name: f.name, phone: f.phone, email: f.email },
          address: { governorate: gov, city: f.city, area: f.area, addressLine: f.addressLine, landmark: f.landmark }, notes: f.notes,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries((d.fields ?? {}) as Record<string, string[]>)) fe[k] = v[0];
        setErrs(fe); setMsg(d.error ?? "تعذر إتمام الطلب"); setBusy(false); return;
      }
      writeCart([]); sessionStorage.removeItem("st_idem"); sessionStorage.removeItem("st_coupon");
      if (pay === "ONLINE") {
        const pr = await fetch("/api/payments/paymob/init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number: d.number, phone: d.phone }) });
        const pd = await pr.json().catch(() => ({}));
        if (pr.ok && pd.url) { window.location.href = pd.url; return; }
      }
      router.replace(`/order/${d.number}?phone=${encodeURIComponent(d.phone)}`);
    } catch { setMsg("فشل الاتصال بالخادم، حاول مرة أخرى. لن يتكرر الطلب."); setBusy(false); }
  }

  const field = (k: keyof typeof f, label: string, extra?: object) => (
    <>
      <label className="lbl" htmlFor={k}>{label}</label>
      <input id={k} className="in" value={f[k]} onChange={set(k)} {...extra} />
      <div className="err">{errs[k] ?? ""}</div>
    </>
  );

  return (
    <div className="pg">
      <h1>إتمام الطلب</h1>
      {field("name", "الاسم الكامل", { autoComplete: "name" })}
      {field("phone", "رقم الموبايل", { inputMode: "tel", placeholder: "01xxxxxxxxx", autoComplete: "tel" })}
      {field("email", "البريد الإلكتروني (اختياري)", { type: "email" })}
      <label className="lbl">المحافظة</label><div className="in">{gov}</div>
      {field("city", "المدينة / المركز")}
      {field("area", "المنطقة (اختياري)")}
      {field("addressLine", "العنوان بالتفصيل")}
      {field("landmark", "علامة مميزة (اختياري)")}
      {field("notes", "ملاحظات التوصيل (اختياري)")}
      <span className="lbl">طريقة الدفع</span>
      <label className="box" style={{ display: "block", margin: "6px 0" }}><input type="radio" checked={pay === "COD"} onChange={() => setPay("COD")} /> الدفع عند الاستلام</label>
      {onlineOk && <label className="box" style={{ display: "block" }}><input type="radio" checked={pay === "ONLINE"} onChange={() => setPay("ONLINE")} /> دفع إلكتروني</label>}
      {!onlineOk && <div style={{ color: "var(--mu)", fontSize: 13 }}>الدفع الإلكتروني غير مفعل حاليًا.</div>}
      {total != null && <div className="box tot" style={{ marginTop: 12 }}><div className="g"><span>الإجمالي</span><span>{egp(total)}</span></div></div>}
      {msg && <div className="err" role="alert">{msg}</div>}
      <button className="btn f" disabled={busy} onClick={submit} style={{ marginTop: 10 }}>{busy ? "جاري إرسال الطلب..." : "تأكيد الطلب"}</button>
    </div>
  );
}
