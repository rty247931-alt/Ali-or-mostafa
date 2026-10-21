"use client";
import { useRouter } from "next/navigation";
import { addLine } from "@/lib/cart-client";

export default function ReorderButton({ items }: { items: { variantId: string; quantity: number }[] }) {
  const router = useRouter();
  if (!items.length) return null;
  return <button className="btn o sm" onClick={() => { items.forEach((i) => addLine(i.variantId, i.quantity)); router.push("/cart"); }}>إعادة الطلب</button>;
}
