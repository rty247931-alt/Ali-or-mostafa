import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";

export const PATCH = route<{ params: { id: string } }>(async (req, { params }) => {
  await requirePerm("product.update");
  const body = z.object({ isPrimary: z.literal(true).optional(), sortOrder: z.number().int().min(0).max(100).optional() }).parse(await req.json());
  await db.$transaction(async (tx) => {
    const img = await tx.productImage.findUnique({ where: { id: params.id } });
    if (!img) throw new ApiError(404, "الصورة غير موجودة");
    if (body.isPrimary) {
      await tx.productImage.updateMany({ where: { productId: img.productId }, data: { isPrimary: false } });
      await tx.productImage.update({ where: { id: img.id }, data: { isPrimary: true } });
    }
    if (body.sortOrder !== undefined) await tx.productImage.update({ where: { id: img.id }, data: { sortOrder: body.sortOrder } });
  });
  return json({ ok: true });
});

export const DELETE = route<{ params: { id: string } }>(async (_req, { params }) => {
  await requirePerm("product.update");
  await db.$transaction(async (tx) => {
    const img = await tx.productImage.findUnique({ where: { id: params.id } });
    if (!img) throw new ApiError(404, "الصورة غير موجودة");
    await tx.productImage.delete({ where: { id: img.id } });
    if (img.isPrimary) {
      const next = await tx.productImage.findFirst({ where: { productId: img.productId }, orderBy: { sortOrder: "asc" } });
      if (next) await tx.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  });
  return json({ ok: true });
});
