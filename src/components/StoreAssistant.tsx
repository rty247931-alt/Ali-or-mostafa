"use client";
import { useState } from "react";
type Message = { role: "user" | "assistant"; content: string };
const suggestions = ["عايز حذاء رياضي مريح", "إيه المقاسات المتاحة؟", "إزاي أتابع طلبي؟", "سياسة الاستبدال إيه؟"];

export default function StoreAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(text = value) {
    const content = text.trim(); if (!content || busy) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next); setValue(""); setBusy(true);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.slice(-8) }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "تعذر إرسال الرسالة");
      setMessages((old) => [...old, { role: "assistant", content: data.answer }]);
    } catch (e) {
      setMessages((old) => [...old, { role: "assistant", content: e instanceof Error ? e.message : "حصل خطأ، حاول مرة أخرى." }]);
    } finally { setBusy(false); }
  }
  return <div dir="rtl" style={{ position: "fixed", zIndex: 80, bottom: 18, left: 18, fontFamily: "inherit" }}>
    {open && <section aria-label="مساعد خُطوة الذكي" style={{ width: "min(370px, calc(100vw - 32px))", height: 500, maxHeight: "70vh", background: "var(--bg, #fff)", color: "var(--fg, #171717)", border: "1px solid #ddd", borderRadius: 18, boxShadow: "0 12px 40px #0003", display: "flex", flexDirection: "column", overflow: "hidden", marginBottom: 12 }}>
      <header style={{ padding: "14px 16px", background: "var(--ac, #ff4a1c)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><strong>مساعد خُطوة</strong><div style={{ fontSize: 12, opacity: .9 }}>اسألنا عن أي حاجة في المتجر</div></div>
        <button onClick={() => setOpen(false)} aria-label="إغلاق المحادثة" style={{ border: 0, background: "transparent", color: "white", fontSize: 22, cursor: "pointer" }}>×</button>
      </header>
      <div aria-live="polite" style={{ padding: 12, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && <div><p style={{ margin: "4px 0 12px" }}>أهلًا بيك 👋 أنا مساعد خُطوة. أقدر أساعدك تختار الحذاء المناسب وأجاوب عن أسئلتك.</p>
          {suggestions.map((s) => <button key={s} onClick={() => void send(s)} style={{ display: "block", width: "100%", textAlign: "right", margin: "7px 0", padding: 10, border: "1px solid #ddd", borderRadius: 10, background: "transparent", cursor: "pointer" }}>{s}</button>)}</div>}
        {messages.map((m, i) => <div key={i} style={{ alignSelf: m.role === "user" ? "flex-start" : "flex-end", maxWidth: "88%", padding: "10px 12px", borderRadius: 13, whiteSpace: "pre-wrap", lineHeight: 1.6, background: m.role === "user" ? "#f0f0f0" : "#fff3ee", color: "#222" }}>{m.content}</div>)}
        {busy && <div style={{ color: "#777", fontSize: 13 }}>المساعد بيكتب...</div>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(); }} style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid #eee" }}>
        <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={1200} placeholder="اكتب سؤالك هنا..." aria-label="رسالتك" style={{ minWidth: 0, flex: 1, padding: 11, border: "1px solid #ddd", borderRadius: 10, background: "transparent", color: "inherit" }} />
        <button disabled={busy || !value.trim()} type="submit" style={{ border: 0, borderRadius: 10, padding: "0 14px", background: "var(--ac, #ff4a1c)", color: "white", cursor: "pointer" }}>إرسال</button>
      </form>
    </section>}
    <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ border: 0, borderRadius: 999, padding: "13px 18px", background: "var(--ac, #ff4a1c)", color: "white", fontWeight: 700, boxShadow: "0 5px 18px #0003", cursor: "pointer" }}>{open ? "إغلاق" : "اسأل مساعد خُطوة ✨"}</button>
  </div>;
}
