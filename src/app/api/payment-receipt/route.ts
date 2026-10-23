import { ApiError, json, route } from "@/lib/errors";
import { rateLimit } from "@/lib/ratelimit";
import { saveImage } from "@/lib/storage";

export const POST = route(async (req) => {
  rateLimit(req, "payment-receipt", 8, 600);
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "اختر صورة إيصال التحويل");
  if (file.size > 8 * 1024 * 1024) throw new ApiError(413, "حجم صورة الإيصال يجب ألا يتجاوز 8 ميجابايت");
  return json({ url: await saveImage(file, "payment-receipts") }, 201);
});
