import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "حسابي", robots: { index: false, follow: false } };

export default async function Account() {
  if (await getSession()) redirect("/account/orders");
  return <div className="pg"><h1>حسابي</h1><p>سجّل دخولك لمتابعة طلباتك. يمكنك أيضًا الشراء كزائر.</p><AuthForm /></div>;
}
