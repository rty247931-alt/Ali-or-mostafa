import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { requirePerm } from "@/lib/perm";
import { getSetting } from "@/lib/settings";
import { paymobConfigured } from "@/lib/paymob";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "لون غير صحيح");
const txt = (n: number) => z.string().trim().max(n);
export const settingsSchema = z.object({
  "store.name": txt(80).min(1), "store.description": txt(300),
  "theme.primary": hex, "theme.ink": hex,
  "hero.title": txt(120), "hero.subtitle": txt(250), "hero.image": txt(500),
  announcement: z.object({ text: txt(200), url: txt(300).optional(), visible: z.boolean(), endsAt: z.string().nullable().optional() }),
  "contact.phone": txt(40), "contact.email": txt(120), "contact.address": txt(250),
  "social.facebook": txt(300), "social.instagram": txt(300), "social.whatsapp": txt(300), "social.tiktok": txt(300),
  "shipping.trackingUrl": txt(300).refine((v) => v === "" || (/^https:\/\//.test(v) && v.includes("{tracking}")), "الرابط يبدأ بـ https:// ويحتوي {tracking}"),
  "order.minTotal": z.number().min(0).max(100000),
  "checkout.guest.enabled": z.boolean(),
  "tax.enabled": z.boolean(), "tax.rate": z.number().min(0).max(100), "tax.included": z.boolean(),
  "payments.online.enabled": z.boolean(),
  maintenance: z.boolean(),
}).partial().strict();

export const GET = route(async () => {
  await requirePerm("settings.update");
  const rows = await db.storeSetting.findMany();
  return json({
    values: Object.fromEntries(rows.map((r) => [r.key, r.value])),
    paymobConfigured: paymobConfigured(),
    paymentsVerified: await getSetting("payments.online.verified", false),
  });
});

export const PATCH = route(async (req) => {
  const { userId } = await requirePerm("settings.update");
  const d = settingsSchema.parse(await req.json());
  if (d["payments.online.enabled"] === true) {
    // An integration is never "on" just because someone ticked a box: it must be configured AND pass the live test.
    if (!paymobConfigured()) throw new ApiError(400, "بيانات بوابة الدفع غير مضبوطة في متغيرات البيئة");
    if (!(await getSetting("payments.online.verified", false))) throw new ApiError(400, "شغّل «اختبار الاتصال» بنجاح قبل تفعيل الدفع الإلكتروني");
  }
  await db.$transaction(async (tx) => {
    for (const [key, value] of Object.entries(d))
      await tx.storeSetting.upsert({ where: { key }, update: { value: value as never }, create: { key, value: value as never } });
    await audit(tx, userId, "settings.update", "StoreSetting", null, d);
  });
  return json({ ok: true });
});
