import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "دخول الإدارة", robots: { index: false, follow: false } };

export default function AdminLogin() {
  return <div className="pg"><h1>دخول لوحة الإدارة</h1><AuthForm staff /></div>;
}
