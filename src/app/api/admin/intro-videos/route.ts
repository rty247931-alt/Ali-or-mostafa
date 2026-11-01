import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { audit } from "@/lib/audit";
import { saveImage } from "@/lib/storage";
import { put } from "@vercel/blob";

const item = z.object({ title: z.string().trim().min(1).max(100), url: z.string().url().max(1000), cover: z.string().url().max(1000) });
export const GET = route(async () => {
  await requirePerm("settings.update");
  const row = await db.storeSetting.findUnique({ where: { key: "intro.videos" } });
  return json({ videos: Array.isArray(row?.value) ? row.value : [] });
});
export const POST = route(async (req) => {
  await requirePerm("settings.update");
  const fd = await req.formData();
  const file = fd.get("file");
  const kind = String(fd.get("kind") ?? "");
  if (!(file instanceof File) || file.size < 16) throw new ApiError(400, "اختر ملفًا صالحًا");
  if (kind === "cover") {
    if (!file.type.startsWith("image/")) throw new ApiError(400, "اختر صورة للغلاف");
    return json({ url: await saveImage(file, "intro-videos") }, 201);
  }
  if (kind !== "video") throw new ApiError(400, "نوع الملف غير مدعوم");
  const types: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "video/ogg": "ogv" };
  if (!types[file.type]) throw new ApiError(400, "استخدم MP4 أو WebM أو MOV أو OGG");
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new ApiError(500, "تخزين الفيديو غير مربوط بـ Vercel Blob");
  const blob = await put(`intro-videos/${Date.now()}.${types[file.type]}`, file, { access: "public", addRandomSuffix: true, contentType: file.type });
  return json({ url: blob.url }, 201);
});
export const PUT = route(async (req) => {
  const { userId } = await requirePerm("settings.update");
  const videos = z.array(item).max(30).parse((await req.json()).videos);
  await db.$transaction(async (tx) => {
    await tx.storeSetting.upsert({ where: { key: "intro.videos" }, update: { value: videos }, create: { key: "intro.videos", value: videos } });
    await audit(tx, userId, "settings.update", "StoreSetting", null, { key: "intro.videos", count: videos.length });
  });
  return json({ ok: true, videos });
});
