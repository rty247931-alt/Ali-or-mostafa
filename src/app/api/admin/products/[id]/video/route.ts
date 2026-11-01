import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    await requirePerm("product.update");
    const product = await db.product.findUnique({ where: { id: context.params.id }, select: { id: true } });
    if (!product) return Response.json({ error: "المنتج غير موجود" }, { status: 404 });
    if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "تخزين الفيديو غير مربوط بـ Vercel Blob" }, { status: 500 });
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body, request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime", "video/ogg"],
        maximumSizeInBytes: 5 * 1024 * 1024 * 1024,
        tokenPayload: JSON.stringify({ productId: product.id }),
      }),
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload ?? "{}") as { productId?: string };
        if (payload.productId !== product.id) throw new Error("معرّف المنتج غير مطابق");
        const current = await db.product.findUnique({ where: { id: product.id }, select: { videoUrls: true } });
        if (!current) throw new Error("المنتج غير موجود");
        await db.product.update({ where: { id: product.id }, data: { videoUrl: blob.url, videoUrls: [...current.videoUrls, blob.url] } });
      },
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل تجهيز رفع الفيديو";
    return Response.json({ error: message }, { status: 400 });
  }
}

export const DELETE = route<{ params: { id: string } }>(async (req, { params }) => {
  await requirePerm("product.update");
  const body = await req.json().catch(() => ({ url: null }));
  const product = await db.product.findUnique({ where: { id: params.id }, select: { id: true, videoUrls: true } });
  if (!product) throw new ApiError(404, "المنتج غير موجود");
  const urls = product.videoUrls.filter((u) => u !== body.url);
  await db.product.update({ where: { id: params.id }, data: { videoUrls: urls, videoUrl: urls[0] ?? null } });
  return json({ deleted: true });
});
