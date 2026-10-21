"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FavButton({ productId, initial }: { productId: string; initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  return (
    <button className={`hf ${on ? "on" : ""}`} aria-label={on ? "إزالة من المفضلة" : "إضافة للمفضلة"} onClick={async () => {
      const r = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
      if (r.status === 401) { router.push("/account"); return; }
      if (r.ok) setOn((await r.json()).favorite);
    }}>{on ? "♥" : "♡"}</button>
  );
}
