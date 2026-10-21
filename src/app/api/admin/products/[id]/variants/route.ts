import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, dbError, json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { addVariant } from "@/services/products";

const schema = z.object({
  colorName: z.string().trim().min(1).max(40), colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  sizeLabel: z.string().trim().min(1).max(10), quantity: z.number().int().min(0).max(100000),
});

export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { userId } = await requirePerm("product.update");
  const v = schema.parse(await req.json());
  try {
    await db.$transaction(async (tx) => {
      const p = await tx.product.findUnique({ where: { id: params.id }, include: { _count: { select: { variants: true } } } });
      if (!p) throw new ApiError(404, "المنتج غير موجود");
      await addVariant(tx, p.id, p.sku, v, p._count.variants, userId);
    });
  } catch (e) { throw dbError(e); }
  return json({ ok: true }, 201);
});
