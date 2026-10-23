"use client";

import { useEffect, useState } from "react";

const RELEASE_AT = new Date("2026-11-01T00:00:00+02:00").getTime();

export default function ReleaseAction({ configured }: { configured: boolean }) {
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const unlocked = now >= RELEASE_AT;
  async function startRelease() {
    if (!unlocked || busy || !configured) return;
    if (!window.confirm("سيتم إرسال طلب بدء نشر إلى Vercel. تأكد أنك تستخدم Deploy Hook لبيئة المعاينة التجريبية، وأن الاختبارات والنسخ الاحتياطي مكتملة. هل تريد المتابعة؟")) return;
    setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/admin/updates/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر بدء النشر.");
      setMessage(body.message || "قُبل طلب النشر.");
    } catch (e) {
      setError(true);
      setMessage(e instanceof Error ? e.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  }

  if (!unlocked) return (
    <div className="min-w-44 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
      <p className="text-sm font-bold text-gray-700">التحديث مقفول</p>
      <p className="mt-1 text-xs text-gray-500">يفتح تلقائيًا في الموعد المحدد</p>
    </div>
  );

  return (
    <div className="min-w-44 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-bold">الإصدار مفتوح زمنيًا</p>
      <p className="mt-1 text-xs leading-5">الزر يطلب بدء نشر من Vercel فقط؛ لا يطبّق تغييرات قاعدة البيانات ولا يثبت نجاح النشر.</p>
      <button type="button" onClick={startRelease} disabled={busy || !configured}
        className="mt-3 w-full rounded-lg bg-gray-900 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? "جارٍ إرسال الطلب…" : configured ? "بدء التحديث على Vercel" : "النشر غير مهيأ"}
      </button>
      {!configured && <p className="mt-2 text-xs">يلزم إعداد VERCEL_RELEASE_DEPLOY_HOOK_URL على الخادم.</p>}
      {message && <p role="status" className={`mt-3 break-words text-xs leading-5 ${error ? "text-red-700" : "text-emerald-800"}`}>{message}</p>}
    </div>
  );
}
