import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { createProduct, productSchema } from "@/services/products";

export const GET = route(async () => {
  await requirePerm("product.view");
  return json(await db.product.findMany({
    orderBy: { createdAt: "desc" }, take: 200,
    include: { category: true, variants: { include: { color: true, size: true, inventory: true } } },
  }));
});

export const POST = route(async (req) => {
  const { userId } = await requirePerm("product.create");
  const d = productSchema.parse(await req.json());
  const created = await db.$transaction((tx) => createProduct(tx, d, userId), { timeout: 30000 });
  return json({ id: created.id, slug: created.slug }, 201);
});
