import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminUpdatesPage() {
  return (
    <main dir="rtl" className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">التحديثات</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/storefront" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50">تغيير واجهة المتجر</Link>
          <Link href="/admin" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50">رجوع للإدارة</Link>
        </div>
      </div>

      <section aria-label="التحديث الضخم مغلق" className="mx-auto flex min-h-64 w-full max-w-sm flex-col items-center justify-center rounded-3xl border-2 border-red-300 bg-red-50 p-7 text-center shadow-sm">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-red-200 bg-red-100 text-4xl" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-10 w-10 fill-none stroke-red-700" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            <path d="M12 14v3" />
          </svg>
        </div>
        <span className="rounded-full bg-red-700 px-4 py-1.5 text-sm font-bold text-white">مغلق</span>
        <h2 className="mt-4 text-xl font-bold">التحديث الضخم 2.0</h2>
        <p className="mt-2 text-sm font-semibold text-red-800">يفتح يوم ٣٠ أكتوبر ٢٠٢٦</p>
      </section>
    </main>
  );
}
