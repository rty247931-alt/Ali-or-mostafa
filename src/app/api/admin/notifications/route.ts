import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";

export const POST = route(async () => {
  await requirePerm("order.view");
  const r = await db.notification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
  return json({ marked: r.count });
});
