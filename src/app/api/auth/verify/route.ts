import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const userId = token ? await consumeToken(token, "VERIFY") : null;
  if (userId) await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return NextResponse.redirect(new URL(userId ? "/account/orders?verified=1" : "/account?verified=0", url.origin));
}
