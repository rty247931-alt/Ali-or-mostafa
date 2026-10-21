import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { requirePerm } from "@/lib/perm";
import { hashPassword } from "@/lib/hash";

const schema = z.object({
  fullName: z.string().trim().min(3).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12, "كلمة المرور ١٢ حرفًا على الأقل").max(128),
  role: z.enum(["GENERAL_MANAGER", "CATALOG_MANAGER", "ORDERS_MANAGER", "SUPPORT", "REPORTS"]),
});

export const POST = route(async (req) => {
  const { userId } = await requirePerm("user.manage");
  const d = schema.parse(await req.json());
  const role = await db.role.findUnique({ where: { name: d.role } });
  if (!role) throw new ApiError(400, "الدور غير موجود. شغّل db:seed");
  try {
    const u = await db.user.create({
      data: { kind: "STAFF", fullName: d.fullName, email: d.email, passwordHash: await hashPassword(d.password), roles: { create: { roleId: role.id } } },
    });
    await audit(db, userId, "user.create", "User", u.id, { email: d.email, role: d.role });
    return json({ id: u.id }, 201);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ApiError(409, "البريد مستخدم من قبل");
    throw e;
  }
});
