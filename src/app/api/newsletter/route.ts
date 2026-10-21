import { z } from "zod";
import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { rateLimit } from "@/lib/ratelimit";

const schema = z.object({ email: z.string().trim().toLowerCase().email("بريد غير صحيح"), consent: z.literal(true, { errorMap: () => ({ message: "لازم توافق على استلام الرسائل" }) }) });

export const POST = route(async (req) => {
  rateLimit(req, "newsletter", 8, 600);
  const d = schema.parse(await req.json());
  await db.newsletterSubscriber.upsert({ where: { email: d.email }, update: { unsubscribedAt: null, consentAt: new Date() }, create: { email: d.email } });
  return json({ ok: true });
});
