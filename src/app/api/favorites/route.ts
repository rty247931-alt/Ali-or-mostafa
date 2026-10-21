import { z } from "zod";
import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { requireUser } from "@/lib/perm";

export const GET = route(async () => {
  const { userId } = await requireUser();
  const rows = await db.favorite.findMany({ where: { userId }, select: { productId: true } });
  return json(rows.map((r) => r.productId));
});

export const POST = route(async (req) => {
  const { userId } = await requireUser();
  const { productId } = z.object({ productId: z.string().min(1) }).parse(await req.json());
  const key = { userId_productId: { userId, productId } };
  const had = await db.favorite.findUnique({ where: key });
  if (had) await db.favorite.delete({ where: key });
  else await db.favorite.create({ data: { userId, productId } });
  return json({ favorite: !had });
});
