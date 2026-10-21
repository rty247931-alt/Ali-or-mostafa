"use client";
import { useState } from "react";

export default function PayNowButton({ number, phone }: { number: string; phone: string }) {
  const [err, setErr] = useState("");
  return (
    <>
      <button className="btn" onClick={async () => {
        setErr("");
        const r = await fetch("/api/payments/paymob/init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number, phone }) });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.url) window.location.href = d.url; else setErr(d.error ?? "تعذر بدء الدفع");
      }}>ادفع الآن</button>
      {err && <div className="err" role="alert">{err}</div>}
    </>
  );
}
