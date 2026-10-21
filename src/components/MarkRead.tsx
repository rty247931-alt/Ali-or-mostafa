"use client";
import { useRouter } from "next/navigation";

export default function MarkRead() {
  const router = useRouter();
  return <button className="btn o sm" onClick={async () => { await fetch("/api/admin/notifications", { method: "POST" }); router.refresh(); }}>تعليم الكل كمقروء</button>;
}
