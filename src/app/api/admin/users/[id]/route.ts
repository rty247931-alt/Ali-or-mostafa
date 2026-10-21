import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { requirePerm } from "@/lib/perm";

const schema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["GENERAL_MANAGER", "CATALOG_MANAGER", "ORDERS_MANAGER", "SUPPORT", "REPORTS"]).optional(),
});

export const PATCH = route<{ params: { id: string } }>(async (req, { params }) => {
  const { userId } = await requirePerm("user.manage");
  const d = schema.parse(await req.json());
  if (params.id === userId) throw new ApiError(400, "لا يمكنك تعديل حسابك من هنا");
  const u = await db.user.findUnique({ where: { id: params.id }, include: { roles: { include: { role: true } } } });
  if (!u || u.kind !== "STAFF") throw new ApiError(404, "المستخدم غير موجود");
  if (u.roles.some((r) => r.role.name === "OWNER")) throw new ApiError(403, "لا يمكن تعديل حساب المالك");
  await db.$transaction(async (tx) => {
    if (d.isActive !== undefined) await tx.user.update({ where: { id: u.id }, data: { isActive: d.isActive } });
    if (d.role) {
      const role = await tx.role.findUniqueOrThrow({ where: { name: d.role } });
      await tx.userRole.deleteMany({ where: { userId: u.id } });
      await tx.userRole.create({ data: { userId: u.id, roleId: role.id } });
    }
    await audit(tx, userId, "user.update", "User", u.id, d);
  });
  return json({ ok: true });
});
