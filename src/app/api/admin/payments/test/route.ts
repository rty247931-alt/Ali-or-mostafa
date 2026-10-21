import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { audit } from "@/lib/audit";
import { authToken, paymobConfigured } from "@/lib/paymob";

export const POST = route(async () => {
  const { userId } = await requirePerm("settings.update");
  if (!paymobConfigured()) throw new ApiError(400, "أضف متغيرات PAYMOB_* في بيئة التشغيل أولًا");
  let ok = false;
  try { await authToken(); ok = true; } catch {}
  await db.storeSetting.upsert({ where: { key: "payments.online.verified" }, update: { value: ok }, create: { key: "payments.online.verified", value: ok } });
  if (!ok) await db.storeSetting.upsert({ where: { key: "payments.online.enabled" }, update: { value: false }, create: { key: "payments.online.enabled", value: false } });
  await audit(db, userId, "payments.test", "StoreSetting", null, { ok });
  if (!ok) throw new ApiError(502, "فشل الاتصال ببوابة الدفع. تحقق من المفاتيح");
  return json({ ok: true });
});
