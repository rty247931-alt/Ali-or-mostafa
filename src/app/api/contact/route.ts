import { z } from "zod";
import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  name: z.string().trim().min(2, "اكتب اسمك").max(100),
  phone: z.string().trim().max(30).optional(), email: z.string().trim().email("بريد غير صحيح").max(150).optional().or(z.literal("")),
  message: z.string().trim().min(6, "اكتب رسالتك").max(2000),
});

export const POST = route(async (req) => {
  rateLimit(req, "contact", 5, 600);
  const d = schema.parse(await req.json());
  if (!d.phone && !d.email) return json({ error: "اكتب هاتفًا أو بريدًا للتواصل معك", fields: { email: ["اكتب هاتفًا أو بريدًا"] } }, 400);
  const m = await db.contactMessage.create({ data: { name: d.name, phone: d.phone || null, email: d.email || null, message: d.message } });
  await db.notification.create({ data: { type: "CONTACT", message: `رسالة جديدة من ${d.name}`, refId: m.id } });
  return json({ ok: true }, 201);
});
