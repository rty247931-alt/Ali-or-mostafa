import Link from "next/link";

export const dynamic = "force-dynamic";

const RELEASE_AT = new Date("2026-11-01T00:00:00+02:00");

const features = [
  { title: "تجديد شامل لواجهة المتجر", detail: "تصميم أسرع وأوضح ومتوافق مع الموبايل والكمبيوتر." },
  { title: "إحصائيات ومقارنة المبيعات", detail: "تقارير المبيعات والأرباح والمنتجات الأكثر مبيعًا والمخزون المنخفض." },
  { title: "المخزون حسب اللون والمقاس", detail: "متابعة أدق للكميات وحركات المخزون والتنبيهات." },
  { title: "المفضلة والبحث الذكي", detail: "تحسين البحث والفلاتر واقتراح منتجات مشابهة." },
  { title: "الكوبونات والعروض", detail: "كوبونات خصم وعروض محدودة المدة." },
  { title: "الولاء والعملاء العائدون", detail: "نقاط ولاء ومزايا للعملاء المتكررين." },
  { title: "الطلبات والفواتير والتجهيز", detail: "متابعة الطلبات وطباعة الفواتير وقوائم التجهيز." },
  { title: "صلاحيات الموظفين وسجل الإدارة", detail: "أدوار أوضح وسجل للعمليات الإدارية." },
  { title: "مراجعة إيصالات المحافظ", detail: "تنظيم مراجعة إيصالات الدفع بالمحافظ الإلكترونية." },
  { title: "تحسينات الأمان والاعتمادية", detail: "مراجعة الصلاحيات والتحقق والنسخ الاحتياطي والاختبارات." },
];

export default function AdminUpdatesPage() {
  // Compare absolute timestamps so the lock follows Cairo's release instant
  // without reconstructing local time using a hard-coded UTC offset.
  const unlocked = Date.now() >= RELEASE_AT.getTime();
  const releaseDate = new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(RELEASE_AT);

  return (
    <main dir="rtl" className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">إدارة المتجر</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">التحديثات</h1>
          <p className="mt-2 text-sm text-gray-500">إصدار رئيسي واحد يجمع التطويرات المخططة كلها.</p>
        </div>
        <Link href="/admin" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50">رجوع للإدارة</Link>
      </div>

      <section className={`overflow-hidden rounded-3xl border ${unlocked ? "border-emerald-300 bg-emerald-50/40" : "border-gray-200 bg-white"}`}>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${unlocked ? "bg-emerald-100" : "bg-gray-100"}`} aria-hidden="true">
              {unlocked ? "✓" : "🔒"}
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">الإصدار الرئيسي 2.0</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${unlocked ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {unlocked ? "موعد الإصدار وصل" : "مغلق حتى موعد الإصدار"}
                </span>
              </div>
              <h2 className="text-2xl font-bold">التحديث الضخم — نوفمبر 2026</h2>
              <p className="mt-2 text-sm text-gray-600">موعد الفتح: {releaseDate}، الساعة 12:00 صباحًا بتوقيت القاهرة.</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                لن تظهر إصدارات شهرية منفصلة قبل هذا الموعد. كل البنود التالية ضمن إصدار واحد، ويجب اختبارها قبل نشره.
              </p>
            </div>
          </div>
          {unlocked ? (
            <div className="min-w-44 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-bold">الإصدار مفتوح زمنيًا</p>
              <p className="mt-1 text-xs leading-5">فتح الصفحة لا ينشر التحديث تلقائيًا. يلزم ربط زر النشر بسير عمل نشر آمن بعد إعداده واختباره.</p>
              <button type="button" disabled className="mt-3 w-full cursor-not-allowed rounded-lg bg-gray-300 px-4 py-2 font-bold text-gray-600" title="يلزم إعداد مسار نشر آمن أولًا">تحديث — النشر غير موصل</button>
            </div>
          ) : (
            <div className="min-w-44 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm font-bold text-gray-700">التحديث مقفول</p>
              <p className="mt-1 text-xs text-gray-500">يفتح تلقائيًا في الموعد المحدد</p>
            </div>
          )}
        </div>
        <div className="border-t bg-white/80 px-6 py-5 sm:px-8">
          <h3 className="mb-4 text-lg font-bold">محتويات الإصدار الواحد</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature, index) => (
              <article key={feature.title} className="flex gap-3 rounded-2xl border border-gray-100 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700">{index + 1}</span>
                <div>
                  <h4 className="font-bold">{feature.title}</h4>
                  <p className="mt-1 text-sm leading-6 text-gray-500">{feature.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <p className="mt-5 text-xs leading-5 text-gray-500">
        ملاحظة: هذه الصفحة تنظّم موعد الإصدار ومحتوياته فقط. تنزيل وتطبيق حزمة تحديث على الموقع الحي يحتاج مسار نشر موثّقًا وصلاحيات نشر محفوظة على الخادم؛ لا يتم تشغيله من المتصفح مباشرة.
      </p>
    </main>
  );
}
