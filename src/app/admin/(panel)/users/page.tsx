import { redirect } from "next/navigation";
import UserManager from "@/components/UserManager";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/perm";

export default async function UsersPage() {
  const staff = await getStaff();
  if (!staff?.perms.has("user.manage")) redirect("/admin");
  const users = await db.user.findMany({ where: { kind: "STAFF" }, orderBy: { createdAt: "asc" }, include: { roles: { include: { role: true } } } });
  return <><h1>المستخدمون والصلاحيات</h1><UserManager selfId={staff.userId} users={users.map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, isActive: u.isActive, role: u.roles[0]?.role.name ?? "—" }))} /></>;
}
