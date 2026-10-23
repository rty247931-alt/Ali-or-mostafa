import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/hash";
import { audit } from "@/lib/audit";

export const GET = route(async () => {
  const session = await getSession();
  if (!session || session.kind !== "STAFF") throw new ApiError(401, "سجّل الدخول بحساب المدير");
  const user = await db.user.findUnique({ where: { id: session.uid }, select: { fullName: true, email: true, kind: true, isActive: true } });
  if (!user || user.kind !== "STAFF" || !user.isActive) throw new ApiError(403, "الحساب غير متاح");
  return json({ fullName: user.fullName, email: user.email });
});

const schema = z.object({
  fullName: z.string().trim().min(3).max(100),
  email: z.string().trim().toLowerCase().email(),
  currentPassword: z.string().max(128).optional().default(""),
  newPassword: z.string().max(128).optional().default(""),
});

export const PATCH = route(async (req) => {
  const session = await getSession();
  if (!session || session.kind !== "STAFF") throw new ApiError(401, "سجّل الدخول بحساب المدير");
  const d = schema.parse(await req.json());
  const user = await db.user.findUnique({ where: { id: session.uid }, select: { id: true, fullName: true, email: true, passwordHash: true, kind: true, isActive: true } });
  if (!user || user.kind !== "STAFF" || !user.isActive) throw new ApiError(403, "الحساب غير متاح");
  if (d.newPassword && d.newPassword.length < 12) throw new ApiError(400, "كلمة المرور الجديدة يجب أن تكون ١٢ حرفًا على الأقل");
  if (d.newPassword && !d.currentPassword) throw new ApiError(400, "أدخل كلمة المرور الحالية أولًا");
  if (d.newPassword && !(await verifyPassword(d.currentPassword, user.passwordHash))) throw new ApiError(400, "كلمة المرور الحالية غير صحيحة");
  try {
    const updated = await db.user.update({ where: { id: user.id }, data: { fullName: d.fullName, email: d.email, ...(d.newPassword ? { passwordHash: await hashPassword(d.newPassword) } : {}) }, select: { id: true, fullName: true, email: true } });
    await audit(db, user.id, "user.profile.update", "User", user.id, { email: updated.email, passwordChanged: !!d.newPassword });
    return json({ fullName: updated.fullName, email: updated.email });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ApiError(409, "البريد الإلكتروني مستخدم بالفعل");
    throw e;
  }
});
