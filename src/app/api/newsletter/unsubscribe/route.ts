import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unsubValid } from "@/lib/unsub";

// Signed link: only someone holding the link we generated can unsubscribe an address.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").toLowerCase();
  const sig = url.searchParams.get("sig") ?? "";
  const ok = !!email && !!sig && unsubValid(email, sig);
  if (ok) await db.newsletterSubscriber.updateMany({ where: { email }, data: { unsubscribedAt: new Date() } });
  return NextResponse.redirect(new URL(`/unsubscribed?ok=${ok ? 1 : 0}`, url.origin));
}
