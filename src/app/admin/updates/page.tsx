import Link from "next/link";

export const dynamic = "force-dynamic";

const RELEASE_AT = new Date("2026-10-30T00:00:00+02:00");
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
  const unlocked = Date.now() >= RELEASE_AT.getTime();
  const releaseDate = new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo", day: "numeric", month: "long", year: "numeric",
  }).format(RELEASE_AT);

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold">التحديثات</h1>
        <Link href="/admin" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50">رجوع للإدارة</Link>
      </div>

      <section className={`mx-auto w-full max-w-xl rounded-3xl border p-7 text-center shadow-sm sm:p-10 ${unlocked ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-white"}`}>
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${unlocked ? "bg-emerald-100" : "bg-gray-100"}`} aria-hidden="true">
          {unlocked ? "✓" : "🔒"}
        </div>
        <p className="text-sm font-semibold text-gray-500">الإصدار الرئيسي 2.0</p>
        <h2 className="mt-2 text-2xl font-bold">{unlocked ? "التحديث الضخم متاح الآن" : "التحديث الضخم"}</h2>
        <p className="mt-3 text-base font-semibold">{unlocked ? "تم فتح الإصدار" : `يفتح يوم ${releaseDate}`}</p>
        {!unlocked && <p className="mt-2 text-sm text-gray-500">سيظل التحديث مغلقًا حتى موعد الإصدار.</p>}
      </section>

      {unlocked && (
        <section className="mt-6 rounded-3xl border bg-white p-5 sm:p-7">
          <h3 className="mb-4 text-lg font-bold">محتويات الإصدار</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature, index) => (
              <article key={feature.title} className="flex gap-3 rounded-2xl border border-gray-100 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700">{index + 1}</span>
                <div><h4 className="font-bold">{feature.title}</h4><p className="mt-1 text-sm leading-6 text-gray-500">{feature.detail}</p></div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
