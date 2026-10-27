"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES: [string, string][] = [["GENERAL_MANAGER", "مدير عام"], ["CATALOG_MANAGER", "مدير المنتجات والمخزون"], ["ORDERS_MANAGER", "مسؤول الطلبات"], ["SUPPORT", "خدمة العملاء"], ["REPORTS", "مسؤول التقارير"]];
type U = { id: string; fullName: string; email: string | null; isActive: boolean; role: string };

export default function UserManager({ users, selfId }: { users: U[]; selfId: string }) {
  const router = useRouter();
  const [f, setF] = useState({ fullName: "", email: "", phone: "", password: "", role: "ORDERS_MANAGER" });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const call = async (url: string, method: string, body: unknown, ok: string) => {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setMsg({ t: r.ok ? ok : d.error ?? "تعذر التنفيذ", ok: r.ok }); if (r.ok) router.refresh();
  };
  return (
    <>
      <details className="box" style={{ marginBottom: 12 }}>
        <summary><b>إضافة موظف</b></summary>
        <label className="lbl" htmlFor="u1">الاسم</label><input id="u1" className="in" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
        <label className="lbl" htmlFor="u2">البريد الإلكتروني</label><input id="u2" className="in" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <label className="lbl" htmlFor="u5">رقم الهاتف (اختياري)</label><input id="u5" className="in" type="tel" inputMode="tel" autoComplete="tel" placeholder="01xxxxxxxxx" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <label className="lbl" htmlFor="u3">كلمة المرور (١٢ حرفًا على الأقل)</label><input id="u3" className="in" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <label className="lbl" htmlFor="u4">الدور</label>
        <select id="u4" className="in" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <button className="btn sm" style={{ marginTop: 8 }} onClick={() => call("/api/admin/users", "POST", f, "تمت إضافة الموظف")}>إضافة</button>
      </details>
      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
      <table className="tbl"><tbody>{users.map((u) => (
        <tr key={u.id}>
          <td><b>{u.fullName}</b><br /><small>{u.email}</small></td>
          <td>{u.role === "OWNER" || u.id === selfId ? (ROLES.find(([k]) => k === u.role)?.[1] ?? "المالك") : (
            <select value={u.role} aria-label="الدور" onChange={(e) => call(`/api/admin/users/${u.id}`, "PATCH", { role: e.target.value }, "تم تغيير الدور")}>{ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>)}</td>
          <td>{u.role === "OWNER" || u.id === selfId ? "—" : <button className="btn o sm" onClick={() => call(`/api/admin/users/${u.id}`, "PATCH", { isActive: !u.isActive }, u.isActive ? "تم الإيقاف" : "تم التفعيل")}>{u.isActive ? "إيقاف" : "تفعيل"}</button>}</td>
        </tr>
      ))}</tbody></table>
    </>
  );
}
