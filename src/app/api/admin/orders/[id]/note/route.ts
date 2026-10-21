import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";

export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { userId } = await requirePerm("order.status");
  const { note } = z.object({ note: z.string().trim().min(1).max(500) }).parse(await req.json());
  const [o, u] = await Promise.all([db.order.findUnique({ where: { id: params.id } }), db.user.findUnique({ where: { id: userId } })]);
  if (!o) throw new ApiError(404, "الطلب غير موجود");
  const line = `${new Date().toLocaleString("ar-EG")} — ${u?.fullName ?? ""}: ${note}`;
  await db.order.update({ where: { id: o.id }, data: { internalNotes: o.internalNotes ? `${o.internalNotes}\n${line}` : line } });
  return json({ ok: true });
});
