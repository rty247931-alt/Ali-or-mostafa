import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { audit } from "@/lib/audit";
import { saveImage } from "@/lib/storage";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

const item = z.object({
  title: z.string().trim().min(1).max(100),
  url: z.string().url().max(1000),
  cover: z.string().url().max(1000)
});

export const GET = route(async () => {
  await requirePerm("settings.update");
  const row = await db.storeSetting.findUnique({ where: { key: "intro.videos" } });
  return json({ videos: Array.isArray(row?.value) ? row.value : [] });
});

export async function POST(req: Request) {
  try {
    await requirePerm("settings.update");
    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = (await req.json()) as HandleUploadBody;
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime", "video/ogg"],
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024
        }),
        onUploadCompleted: async () => {
          // Upload metadata is saved separately by the admin.
        }
      });
      return Response.json(result);
    }

    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File) || file.size < 16) throw new ApiError(400, "اختر صورة غلاف صالحة");
    if (String(fd.get("kind") ?? "") !== "cover" || !file.type.startsWith("image/")) {
      throw new ApiError(400, "نوع الملف غير مدعوم");
    }
    return json({ url: await saveImage(file, "intro-videos") }, 201);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 400;
    return Response.json(
      { error: error instanceof Error ? error.message : "فشل رفع الملف" },
      { status }
    );
  }
}

export const PUT = route(async (req) => {
  const { userId } = await requirePerm("settings.update");
  const videos = z.array(item).max(30).parse((await req.json()).videos);
  await db.$transaction(async (tx) => {
    await tx.storeSetting.upsert({
      where: { key: "intro.videos" },
      update: { value: videos },
      create: { key: "intro.videos", value: videos }
    });
    await audit(tx, userId, "settings.update", "StoreSetting", null, {
      key: "intro.videos",
      count: videos.length
    });
  });
  return json({ ok: true, videos });
});
