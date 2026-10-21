import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";

export const GET = route(async (req) => {
  await requirePerm("order.view");
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const q = sp.get("q")?.trim();
  const rows = await db.order.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { customerPhone: { contains: q } }, { customerName: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: true },
  });
  return json(rows);
});
