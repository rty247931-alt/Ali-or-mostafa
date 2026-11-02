"use client";
import { useRef, useState } from "react";
type Message = { role: "user" | "assistant"; content: string };
const suggestions = ["عايز حذاء للمشي اليومي", "عايز حاجة رياضية بسعر مناسب", "إيه المقاسات والألوان المتاحة؟", "قارنلي بين الأحذية"];

export default function StoreAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [listening, setListening] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  async function speak(text: string) {
    setVoiceError("");
    try {
      const response = await fetch("/api/assistant/tts", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "تعذر تجهيز الصوت.");
      }
      const blob = await response.blob();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = URL.createObjectURL(blob);
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.pause();
      audioRef.current.src = audioUrlRef.current;
      await audioRef.current.play();
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : "تعذر تشغيل الصوت.");
    }
  }
  function listen() {
    const w = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) { setVoiceError("الإملاء الصوتي غير مدعوم في هذا المتصفح. جرّب Chrome."); return; }
    setVoiceError("");
    const recognition = new Recognition();
    recognition.lang = "ar-EG";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setListening(true); setVoiceError(""); };
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: any) => setValue((old) => (old ? old + " " : "") + event.results[0][0].transcript);
    recognition.onerror = (event: any) => {
      setListening(false);
      const messages: Record<string, string> = {
        "not-allowed": "اسمح للمتصفح باستخدام الميكروفون من إعدادات الموقع، وبعدها اضغط تسجيل مرة تانية.",
        "service-not-allowed": "خدمة الإملاء الصوتي غير متاحة في المتصفح الحالي. افتح الموقع في Chrome.",
        "no-speech": "ملحقتش أسمع كلام. اضغط الميكروفون وجرب تتكلم تاني.",
        "audio-capture": "مش لاقي ميكروفون شغال على الجهاز.",
        "network": "في مشكلة اتصال أثناء تحويل الكلام لنص. جرّب تاني."
      };
      setVoiceError(messages[event.error] || "حصلت مشكلة في بدء التسجيل. جرّب Chrome وتأكد من إذن الميكروفون.");
    };
    try { recognition.start(); }
    catch { setListening(false); setVoiceError("التسجيل شغال بالفعل أو المتصفح مش قادر يبدأه. جرّب تاني."); }
  }
  async function send(text = value) {
    const content = text.trim(); if (!content || busy) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next); setValue(""); setBusy(true); setVoiceError("");
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.slice(-10) }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "تعذر إرسال الرسالة");
      setMessages((old) => [...old, { role: "assistant", content: data.answer }]);
      if (voiceOn) speak(data.answer);
    } catch (e) {
      setMessages((old) => [...old, { role: "assistant", content: e instanceof Error ? e.message : "حصل خطأ، حاول مرة أخرى." }]);
    } finally { setBusy(false); }
  }
  return <div dir="rtl" style={{ position: "fixed", zIndex: 80, bottom: 18, left: 18, fontFamily: "inherit" }}>
    {open && <section aria-label="مساعد خُطوة الذكي" style={{ width: "min(370px, calc(100vw - 32px))", height: 520, maxHeight: "75vh", background: "var(--bg, #fff)", color: "var(--fg, #171717)", border: "1px solid #ddd", borderRadius: 18, boxShadow: "0 12px 40px #0003", display: "flex", flexDirection: "column", overflow: "hidden", marginBottom: 12 }}>
      <header style={{ padding: "14px 16px", background: "var(--ac, #ff4a1c)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><strong>مساعد خُطوة</strong><div style={{ fontSize: 12, opacity: .9 }}>اسألنا كتابة أو بالصوت</div></div>
        <button onClick={() => setOpen(false)} aria-label="إغلاق المحادثة" style={{ border: 0, background: "transparent", color: "white", fontSize: 22, cursor: "pointer" }}>×</button>
      </header>
      <div aria-live="polite" style={{ padding: 12, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && <div><p style={{ margin: "4px 0 12px" }}>أهلًا بيك 👋 أنا مساعد خُطوة. هساعدك تختار الحذاء المناسب من المنتجات الموجودة فعلًا في المتجر.</p>
          {suggestions.map((s) => <button key={s} onClick={() => void send(s)} style={{ display: "block", width: "100%", textAlign: "right", margin: "7px 0", padding: 10, border: "1px solid #ddd", borderRadius: 10, background: "transparent", cursor: "pointer" }}>{s}</button>)}</div>}
        {messages.map((m, i) => <div key={i} style={{ alignSelf: m.role === "user" ? "flex-start" : "flex-end", maxWidth: "88%", padding: "10px 12px", borderRadius: 13, whiteSpace: "pre-wrap", lineHeight: 1.6, background: m.role === "user" ? "#f0f0f0" : "#fff3ee", color: "#222" }}>
          {m.content}{m.role === "assistant" && <button onClick={() => speak(m.content)} style={{ display: "block", marginTop: 6, border: 0, background: "transparent", color: "#a33", cursor: "pointer" }}>🔊 اسمع الرد</button>}
        </div>)}
        {busy && <div style={{ color: "#777", fontSize: 13 }}>المساعد بيكتب...</div>}
      </div>
      {voiceError && <div role="status" style={{ padding: "4px 12px", color: "#b42318", fontSize: 12 }}>{voiceError}</div>}
      <div style={{ display: "flex", gap: 8, padding: "8px 10px 0" }}>
        <button type="button" onClick={listen} style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 9, background: "transparent", cursor: "pointer" }}>{listening ? "🔴 جاري التسجيل..." : "🎙️ ابدأ التسجيل"}</button>
        <button type="button" onClick={() => setVoiceOn(!voiceOn)} aria-pressed={voiceOn} style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 9, background: voiceOn ? "#fff3ee" : "transparent", cursor: "pointer" }}>{voiceOn ? "🔊 الرد الصوتي يعمل" : "🔇 تفعيل الرد الصوتي"}</button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(); }} style={{ display: "flex", gap: 8, padding: 10 }}>
        <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={1200} placeholder="اكتب سؤالك هنا..." aria-label="رسالتك" style={{ minWidth: 0, flex: 1, padding: 11, border: "1px solid #ddd", borderRadius: 10, background: "transparent", color: "inherit" }} />
        <button disabled={busy || !value.trim()} type="submit" style={{ border: 0, borderRadius: 10, padding: "0 14px", background: "var(--ac, #ff4a1c)", color: "white", cursor: "pointer" }}>إرسال</button>
      </form>
    </section>}
    <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ border: 0, borderRadius: 999, padding: "13px 18px", background: "var(--ac, #ff4a1c)", color: "white", fontWeight: 700, boxShadow: "0 5px 18px #0003", cursor: "pointer" }}>{open ? "إغلاق" : "اسأل مساعد خُطوة ✨"}</button>
  </div>;
}
