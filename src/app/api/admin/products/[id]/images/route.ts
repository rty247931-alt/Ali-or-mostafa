import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { requirePerm } from "@/lib/perm";
import { saveImage } from "@/lib/storage";

export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { userId } = await requirePerm("product.update");
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "اختر ملف صورة");
  const p = await db.product.findUnique({ where: { id: params.id }, include: { images: true } });
  if (!p) throw new ApiError(404, "المنتج غير موجود");
  if (p.images.length >= 10) throw new ApiError(400, "الحد الأقصى ١٠ صور للمنتج");
  const colorName = String(fd.get("colorName") ?? "");
  let colorId: string | null = null;
  if (colorName) {
    const c = await db.color.findUnique({ where: { name: colorName } });
    if (!c) throw new ApiError(400, "اللون غير موجود");
    colorId = c.id;
  }
  const url = await saveImage(file);
  const img = await db.productImage.create({ data: { productId: p.id, url, colorId, isPrimary: p.images.length === 0, sortOrder: p.images.length } });
  await audit(db, userId, "image.add", "Product", p.id, { url });
  return json({ id: img.id, url }, 201);
});
