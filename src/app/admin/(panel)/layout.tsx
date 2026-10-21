import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { getStaff } from "@/lib/perm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  const has = (p: string) => staff.perms.has(p);
  return (
    <div className="w" style={{ paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <b>لوحة الإدارة — {staff.name}</b><LogoutButton to="/admin/login" />
      </div>
      <div className="tabs">
        <Link href="/admin">الرئيسية</Link>
        {has("product.view") && <Link href="/admin/products">المنتجات والمخزون</Link>}
        {has("order.view") && <Link href="/admin/orders">الطلبات</Link>}
        {has("customer.view") && <Link href="/admin/customers">العملاء</Link>}
        {has("report.view") && <Link href="/admin/reports">التقارير</Link>}
        {has("product.update") && <><Link href="/admin/manage/categories">الأقسام</Link><Link href="/admin/manage/brands">الماركات</Link><Link href="/admin/manage/reviews">التقييمات</Link><Link href="/admin/manage/questions">الأسئلة</Link></>}
        {has("price.update") && <Link href="/admin/manage/coupons">الكوبونات</Link>}
        {has("settings.update") && <><Link href="/admin/manage/shipping-methods">الشحن</Link><Link href="/admin/manage/shipping-zones">مناطق الشحن</Link><Link href="/admin/manage/banners">البانرات</Link><Link href="/admin/manage/pages">الصفحات</Link><Link href="/admin/settings">الإعدادات</Link></>}
        {has("customer.view") && <Link href="/admin/manage/messages">الرسائل</Link>}
        {has("order.view") && <Link href="/admin/notifications">الإشعارات</Link>}
        {has("user.manage") && <Link href="/admin/users">المستخدمون</Link>}
        <Link href="/">المتجر</Link>
      </div>
      {children}
    </div>
  );
}
