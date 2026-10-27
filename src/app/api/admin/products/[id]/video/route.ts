import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { put } from "@vercel/blob";

export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { userId } = await requirePerm("product.update");
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) throw new ApiError(400, "اختر ملف فيديو");
  if (file.size < 16 || file.size > 100 * 1024 * 1024) throw new ApiError(400, "حجم الفيديو يجب أن يكون أقل من 100 ميجابايت");
  const allowed = new Set(["video/mp4", "video/webm", "video/quicktime"]);
  if (!allowed.has(file.type)) throw new ApiError(400, "استخدم فيديو MP4 أو WebM أو MOV");
  const p = await db.product.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!p) throw new ApiError(404, "المنتج غير موجود");
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new ApiError(500, "تخزين الفيديو غير مُعد؛ اربط Blob Store في Vercel");
  const ext = file.type === "video/webm" ? "webm" : file.type === "video/quicktime" ? "mov" : "mp4";
  const blob = await put(`products/videos/${params.id}-${Date.now()}.${ext}`, file, { access: "public", addRandomSuffix: true, contentType: file.type });
  await db.product.update({ where: { id: p.id }, data: { videoUrl: blob.url } });
  return json({ url: blob.url }, 201);
});

export const DELETE = route<{ params: { id: string } }>(async (_req, { params }) => {
  await requirePerm("product.update");
  const p = await db.product.update({ where: { id: params.id }, data: { videoUrl: null }, select: { id: true } });
  return json({ id: p.id, deleted: true });
});
