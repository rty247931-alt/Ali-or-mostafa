import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/perm";
import { route } from "@/lib/errors";

export const dynamic = "force-dynamic";
const RELEASE_AT = new Date("2026-10-30T00:00:00+02:00");

export const POST = route(async () => {
  await requirePerm("settings.update");

  if (Date.now() < RELEASE_AT.getTime()) {
    return NextResponse.json({ error: "لم يحن موعد فتح الإصدار بعد." }, { status: 423 });
  }

  const hook = process.env.VERCEL_RELEASE_DEPLOY_HOOK_URL;
  if (!hook) {
    return NextResponse.json(
      { error: "النشر غير مهيأ: أضف VERCEL_RELEASE_DEPLOY_HOOK_URL بعد إعداد واختبار بيئة المعاينة." },
      { status: 503 },
    );
  }

  let target: URL;
  try {
    target = new URL(hook);
  } catch {
    return NextResponse.json({ error: "رابط النشر المهيأ غير صالح." }, { status: 500 });
  }
  if (target.protocol !== "https:" || target.hostname !== "api.vercel.com") {
    return NextResponse.json({ error: "رابط النشر يجب أن يكون Vercel Deploy Hook رسميًا عبر HTTPS." }, { status: 500 });
  }

  const response = await fetch(target, { method: "POST", cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json({ error: "رفضت Vercel طلب بدء النشر. راجع إعداد Deploy Hook." }, { status: 502 });
  }

  return NextResponse.json({
    accepted: true,
    message: "قبلت Vercel طلب بدء النشر. هذا لا يؤكد اكتمال البناء أو نجاح فحص الموقع.",
  }, { status: 202 });
});
