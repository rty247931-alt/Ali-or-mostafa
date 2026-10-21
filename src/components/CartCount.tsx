"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cartCount } from "@/lib/cart-client";

export default function CartCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const u = () => setN(cartCount());
    u();
    window.addEventListener("cart-changed", u);
    window.addEventListener("storage", u);
    return () => { window.removeEventListener("cart-changed", u); window.removeEventListener("storage", u); };
  }, []);
  return <Link href="/cart" className="ic" aria-label="السلة">السلة{n > 0 && <b>{n}</b>}</Link>;
}
