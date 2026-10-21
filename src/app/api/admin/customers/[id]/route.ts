import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { permsOf, requirePerm } from "@/lib/perm";

const schema = z.object({ internalNotes: z.string().max(2000).optional(), isActive: z.boolean().optional() });

export const PATCH = route<{ params: { id: string } }>(async (req, { params }) => {
  const { userId } = await requirePerm("customer.view");
  const d = schema.parse(await req.json());
  const c = await db.user.findUnique({ where: { id: params.id } });
  if (!c || c.kind !== "CUSTOMER") throw new ApiError(404, "العميل غير موجود");
  if (d.isActive !== undefined && !(await permsOf(userId)).has("user.manage")) throw new ApiError(403, "ليس لديك صلاحية إيقاف الحسابات");
  if (d.isActive !== undefined) await db.user.update({ where: { id: c.id }, data: { isActive: d.isActive } });
  if (d.internalNotes !== undefined) await db.customerProfile.upsert({ where: { userId: c.id }, update: { internalNotes: d.internalNotes }, create: { userId: c.id, internalNotes: d.internalNotes } });
  await audit(db, userId, "customer.update", "User", c.id, { isActive: d.isActive, notes: d.internalNotes !== undefined });
  return json({ ok: true });
});
