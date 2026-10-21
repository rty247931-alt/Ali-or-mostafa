import type { Metadata } from "next";

export const metadata: Metadata = { title: "إلغاء الاشتراك", robots: { index: false, follow: false } };

export default function Unsubscribed({ searchParams }: { searchParams: { ok?: string } }) {
  return (
    <div className="pg"><h1>إلغاء الاشتراك</h1>
      <p>{searchParams.ok === "1" ? "تم إلغاء اشتراكك في النشرة ولن تصلك رسائل تسويقية." : "الرابط غير صالح."}</p></div>
  );
}
