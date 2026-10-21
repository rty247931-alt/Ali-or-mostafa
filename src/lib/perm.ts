import { db } from "./db";
import { ApiError } from "./errors";
import { getSession } from "./session";

import { PERMISSIONS, ROLE_PERMS, type Perm } from "./perm-data";
export { PERMISSIONS, ROLE_PERMS };
export type { Perm };

export async function permsOf(userId: string): Promise<Set<string>> {
  const rows = await db.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  return new Set(rows.flatMap((r) => r.role.permissions.map((rp) => rp.permission.code)));
}

/** Server-side enforcement on every operation. Hiding buttons is never the only check. */
export async function requirePerm(perm: Perm): Promise<{ userId: string }> {
  const s = await getSession();
  if (!s) throw new ApiError(401, "انتهت الجلسة، سجّل الدخول مرة أخرى");
  if (s.kind !== "STAFF") throw new ApiError(403, "ليس لديك صلاحية لهذه العملية");
  const user = await db.user.findUnique({ where: { id: s.uid }, select: { isActive: true } });
  if (!user?.isActive) throw new ApiError(403, "الحساب غير مفعل");
  const perms = await permsOf(s.uid);
  if (!perms.has(perm)) throw new ApiError(403, "ليس لديك صلاحية لهذه العملية");
  return { userId: s.uid };
}

export async function requireUser(): Promise<{ userId: string }> {
  const s = await getSession();
  if (!s) throw new ApiError(401, "سجّل الدخول أولًا");
  return { userId: s.uid };
}

/** For server-rendered admin pages: the staff member and their permission set, or null. */
export async function getStaff(): Promise<{ userId: string; name: string; perms: Set<string> } | null> {
  const s = await getSession();
  if (!s || s.kind !== "STAFF") return null;
  const user = await db.user.findUnique({ where: { id: s.uid }, select: { isActive: true, fullName: true } });
  if (!user?.isActive) return null;
  const perms = await permsOf(s.uid);
  return perms.size ? { userId: s.uid, name: user.fullName, perms } : null;
}
