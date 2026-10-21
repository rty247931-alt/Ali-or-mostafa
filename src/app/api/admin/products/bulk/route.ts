import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { requirePerm } from "@/lib/perm";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), ids: z.array(z.string()).min(1).max(200), value: z.enum(["DRAFT", "ACTIVE", "HIDDEN", "PAUSED", "ARCHIVED"]) }),
  z.object({ action: z.literal("category"), ids: z.array(z.string()).min(1).max(200), value: z.string().min(1) }),
]);

export const POST = route(async (req) => {
  const { userId } = await requirePerm("product.update");
  const d = schema.parse(await req.json());
  if (d.action === "category" && !(await db.category.findUnique({ where: { id: d.value } }))) throw new ApiError(400, "القسم غير موجود");
  const r = await db.product.updateMany({ where: { id: { in: d.ids } }, data: d.action === "status" ? { status: d.value } : { categoryId: d.value } });
  await audit(db, userId, `product.bulk.${d.action}`, "Product", null, { ids: d.ids, value: d.value });
  return json({ updated: r.count });
});
