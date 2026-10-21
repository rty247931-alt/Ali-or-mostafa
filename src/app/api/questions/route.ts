import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { rateLimit } from "@/lib/ratelimit";

const schema = z.object({ productId: z.string().min(1), name: z.string().trim().min(2).max(60), question: z.string().trim().min(6).max(500) });

export const POST = route(async (req) => {
  rateLimit(req, "question", 5, 600);
  const d = schema.parse(await req.json());
  if (!(await db.product.findUnique({ where: { id: d.productId }, select: { id: true } }))) throw new ApiError(404, "المنتج غير موجود");
  await db.productQuestion.create({ data: d }); // unpublished until staff answers and publishes it
  return json({ ok: true, message: "تم استلام سؤالك وسيظهر بعد الرد عليه." }, 201);
});
