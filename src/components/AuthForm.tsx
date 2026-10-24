"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm({ staff = false }: { staff?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [v, setV] = useState({ fullName: "", identifier: "", email: "", phone: "", password: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  async function submit() {
    setBusy(true); setMsg(""); setErrs({});
    const body = mode === "login" ? { identifier: v.identifier, password: v.password } : { fullName: v.fullName, email: v.email, phone: v.phone, password: v.password };
    try {
      const r = await fetch(staff ? "/api/admin/auth/login" : `/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) {
        const fe: Record<string, string> = {};
        for (const [k, x] of Object.entries((d.fields ?? {}) as Record<string, string[]>)) fe[k] = x[0];
        setErrs(fe); setMsg(d.error ?? "تعذر تنفيذ العملية"); setBusy(false); return;
      }
      if (staff && d.kind !== "STAFF") { await fetch("/api/auth/logout", { method: "POST" }); setMsg("هذا الحساب ليس حساب إدارة"); setBusy(false); return; }
      router.replace(staff ? "/admin" : "/account/orders"); router.refresh();
    } catch { setMsg("فشل الاتصال، حاول مرة أخرى"); setBusy(false); }
  }

  const f = (k: keyof typeof v, label: string, extra?: object) => (
    <><label className="lbl" htmlFor={k}>{label}</label><input id={k} className="in" value={v[k]} onChange={set(k)} {...extra} /><div className="err">{errs[k] ?? ""}</div></>
  );
  return (
    <div className="box">
      {!staff && (
        <div className="tabs">
          <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); }} style={mode === "login" ? { background: "var(--ac)" } : undefined}>دخول</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setMode("register"); }} style={mode === "register" ? { background: "var(--ac)" } : undefined}>إنشاء حساب</a>
        </div>
      )}
      {mode === "register" ? (<>{f("fullName", "الاسم الكامل")}{f("email", "البريد الإلكتروني", { type: "email" })}{f("phone", "رقم الموبايل", { inputMode: "tel" })}</>)
        : f("identifier", "البريد أو رقم الموبايل", { autoComplete: "username" })}
      {f("password", mode === "register" ? "كلمة المرور (٨ أحرف على الأقل)" : "كلمة المرور", { type: "password", autoComplete: mode === "login" ? "current-password" : "new-password" })}
      {msg && <div className="err" role="alert">{msg}</div>}
      {!staff && mode === "login" && <p><a href="/account/forgot" style={{ color: "var(--ac)" }}>نسيت كلمة المرور؟</a></p>}
      <button className="btn f" disabled={busy} onClick={submit}>{busy ? "..." : mode === "login" ? "دخول" : "إنشاء الحساب"}</button>
    </div>
  );
}
