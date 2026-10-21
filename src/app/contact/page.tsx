import type { Metadata } from "next";
import SimpleForm from "@/components/SimpleForm";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "اتصل بنا" };

export default async function Contact() {
  const st = await getSettings(["contact.phone", "contact.email", "contact.address"]);
  const info = [st["contact.phone"], st["contact.email"], st["contact.address"]].filter(Boolean);
  return (
    <div className="pg">
      <h1>اتصل بنا</h1>
      {info.length > 0 ? <p>{info.map((i) => <span key={String(i)}>{String(i)}<br /></span>)}</p> : <p style={{ color: "var(--mu)" }}>اترك رسالتك وسنرد عليك.</p>}
      <SimpleForm endpoint="/api/contact" submitLabel="إرسال" okMessage="تم استلام رسالتك وسنتواصل معك."
        fields={[{ key: "name", label: "الاسم" }, { key: "phone", label: "الموبايل" }, { key: "email", label: "البريد الإلكتروني", type: "email" }, { key: "message", label: "الرسالة", type: "textarea" }]} />
    </div>
  );
}
