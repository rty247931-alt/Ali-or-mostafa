import type { Metadata } from "next";
import SimpleForm from "@/components/SimpleForm";

export const metadata: Metadata = { title: "نسيت كلمة المرور", robots: { index: false, follow: false } };

export default function Forgot() {
  return <div className="pg"><h1>استعادة كلمة المرور</h1><SimpleForm endpoint="/api/auth/forgot" submitLabel="إرسال الرابط" okMessage="إن كان البريد مسجلًا فستصلك رسالة بالخطوات." fields={[{ key: "email", label: "البريد الإلكتروني", type: "email" }]} /></div>;
}
