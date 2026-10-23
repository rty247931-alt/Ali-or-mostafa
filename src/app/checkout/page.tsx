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
  const [pay, setPay] = useState<"COD" | "ONLINE" | "WALLET">("COD");
  const [walletProvider, setWalletProvider] = useState<"vodafone" | "orange" | "etisalat">("vodafone");
  const [walletData, setWalletData] = useState<{ wallet: boolean; wallets: Record<string, string>; instructions: string }>({ wallet: false, wallets: {}, instructions: "" });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [onlineOk, setOnlineOk] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", email: "", city: "", area: "", addressLine: "", landmark: "", notes: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const first = (["vodafone", "orange", "etisalat"] as const).find((k) => !!walletData.wallets[k]);
    if (first) setWalletProvider(first);
  }, [walletData.wallets.vodafone, walletData.wallets.orange, walletData.wallets.etisalat]);

  useEffect(() => {
    // One idempotency key per checkout attempt: resubmitting the same order can never create two.
    key.current = sessionStorage.getItem("st_idem") ?? crypto.randomUUID();
    sessionStorage.setItem("st_idem", key.current);
    const g = sessionStorage.getItem("st_gov") ?? ""; setGov(g);
    const lines = readCart();
    if (!lines.length || !g) { router.replace("/cart"); return; }
    fetch("/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: lines, governorate: g, couponCode: sessionStorage.getItem("st_coupon") || null }) })
      .then((r) => r.json()).then((q) => setTotal(q.totalCents ?? null)).catch(() => setMsg("تعذر تحميل الإجمالي"));
    fetch("/api/payment-methods").then((r) => r.json()).then((d) => { setOnlineOk(!!d.online); setWalletData({ wallet: !!d.wallet, wallets: d.wallets ?? {}, instructions: d.instructions ?? "" }); }).catch(() => {});
  }, [router]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function uploadReceipt(): Promise<string> {
    if (receiptUrl) return receiptUrl;
    if (!receipt) throw new Error("ارفق صورة إيصال التحويل أولًا");
    setUploadingReceipt(true);
    try {
      const fd = new FormData(); fd.set("file", receipt);
      const r = await fetch("/api/payment-receipt", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.error ?? "تعذر رفع إيصال التحويل");
      setReceiptUrl(d.url); return d.url;
    } finally { setUploadingReceipt(false); }
  }

  async function submit() {
    setBusy(true); setMsg(""); setErrs({});
    try {
      const uploadedReceipt = pay === "WALLET" ? await uploadReceipt() : undefined;
      const r = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: key.current, items: readCart(), couponCode: sessionStorage.getItem("st_coupon") || null, paymentMethod: pay,
          ...(pay === "WALLET" ? { walletProvider, paymentReceiptUrl: uploadedReceipt } : {}),
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
    } catch (e) { setMsg(e instanceof Error ? e.message : "فشل الاتصال بالخادم، حاول مرة أخرى. لن يتكرر الطلب."); setBusy(false); }
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
      {onlineOk && <label className="box" style={{ display: "block" }}><input type="radio" checked={pay === "ONLINE"} onChange={() => setPay("ONLINE")} /> دفع إلكتروني بالبطاقة</label>}
      {walletData.wallet && <label className="box" style={{ display: "block", marginTop: 6 }}><input type="radio" checked={pay === "WALLET"} onChange={() => setPay("WALLET")} /> الدفع بالمحفظة الإلكترونية (فودافون كاش / أورنج كاش / اتصالات كاش)</label>}
      {pay === "WALLET" && <div className="box" style={{ marginTop: 10 }}>
        <h3 style={{ marginTop: 0 }}>الدفع بالمحفظة الإلكترونية</h3>
        <label className="lbl" htmlFor="wallet-provider">اختر المحفظة</label>
        <select id="wallet-provider" className="in" value={walletProvider} onChange={(e) => setWalletProvider(e.target.value as typeof walletProvider)}>
          {walletData.wallets.vodafone && <option value="vodafone">فودافون كاش — {walletData.wallets.vodafone}</option>}
          {walletData.wallets.orange && <option value="orange">أورنج كاش — {walletData.wallets.orange}</option>}
          {walletData.wallets.etisalat && <option value="etisalat">اتصالات كاش — {walletData.wallets.etisalat}</option>}
        </select>
        <p>حوّل إجمالي الطلب إلى رقم المحفظة الموضح، ثم ارفع صورة واضحة لإيصال التحويل.</p>
        {walletData.instructions && <div style={{ whiteSpace: "pre-wrap", margin: "8px 0" }}>{walletData.instructions}</div>}
        <label className="lbl" htmlFor="wallet-receipt">صورة إيصال التحويل (مطلوبة)</label>
        <input id="wallet-receipt" className="in" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(e) => { setReceipt(e.target.files?.[0] ?? null); setReceiptUrl(""); }} />
        {receipt && <p style={{ fontSize: 13 }}>الملف المختار: {receipt.name}</p>}
      </div>}
      {!onlineOk && <div style={{ color: "var(--mu)", fontSize: 13 }}>الدفع الإلكتروني غير مفعل حاليًا.</div>}
      {total != null && <div className="box tot" style={{ marginTop: 12 }}><div className="g"><span>الإجمالي</span><span>{egp(total)}</span></div></div>}
      {msg && <div className="err" role="alert">{msg}</div>}
      <button className="btn f" disabled={busy} onClick={submit} style={{ marginTop: 10 }}>{uploadingReceipt ? "جاري رفع الإيصال..." : busy ? "جاري إرسال الطلب..." : "تأكيد الطلب"}</button>
    </div>
  );
}
