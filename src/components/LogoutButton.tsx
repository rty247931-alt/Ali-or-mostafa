"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton({ to = "/" }: { to?: string }) {
  const router = useRouter();
  return <button className="btn o sm" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace(to); router.refresh(); }}>تسجيل الخروج</button>;
}
