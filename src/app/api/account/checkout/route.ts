import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { requireUser } from "@/lib/perm";

export const GET = route(async () => {
  const { userId } = await requireUser();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { fullName: true, email: true, phone: true, addresses: { orderBy: [{ isDefault: "desc" }, { id: "desc" }], take: 1 } },
  });
  if (!user) return json({ error: "الحساب غير موجود" }, 404);
  const a = user.addresses[0];
  return json({
    customer: { name: user.fullName, phone: user.phone ?? "", email: user.email ?? "" },
    address: a ? { governorate: a.governorate, city: a.city, area: a.area ?? "", addressLine: a.addressLine, landmark: a.landmark ?? "" } : null,
  });
});
