import { z } from "zod";
import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { requireUser } from "@/lib/perm";

const schema = z.object({ fullName: z.string().trim().min(3).max(100).optional(), marketingOptIn: z.boolean().optional(), notifyEmail: z.boolean().optional() });

export const PATCH = route(async (req) => {
  const { userId } = await requireUser();
  const d = schema.parse(await req.json());
  if (d.fullName) await db.user.update({ where: { id: userId }, data: { fullName: d.fullName } });
  if (d.marketingOptIn !== undefined || d.notifyEmail !== undefined) {
    const data = { ...(d.marketingOptIn !== undefined && { marketingOptIn: d.marketingOptIn }), ...(d.notifyEmail !== undefined && { notifyPrefs: { email: d.notifyEmail } }) };
    await db.customerProfile.upsert({ where: { userId }, update: data, create: { userId, ...data } });
  }
  return json({ ok: true });
});
