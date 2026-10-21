import type { Metadata } from "next";
import Link from "next/link";
import SimpleForm from "@/components/SimpleForm";

export const metadata: Metadata = { title: "كلمة مرور جديدة", robots: { index: false, follow: false } };

export default function Reset({ searchParams }: { searchParams: { token?: string } }) {
  if (!searchParams.token) return <div className="pg"><h1>الرابط غير صالح</h1><Link className="btn" href="/account/forgot">اطلب رابطًا جديدًا</Link></div>;
  return <div className="pg"><h1>كلمة مرور جديدة</h1><SimpleForm endpoint="/api/auth/reset" extra={{ token: searchParams.token }} submitLabel="حفظ" okMessage="تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن."
    fields={[{ key: "password", label: "كلمة المرور الجديدة (٨ أحرف على الأقل)", type: "password" }]} /></div>;
}
