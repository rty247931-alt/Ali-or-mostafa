import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, dbError, json, route } from "@/lib/errors";
import { requireUser } from "@/lib/perm";
import { rateLimit } from "@/lib/ratelimit";

const schema = z.object({ productId: z.string().min(1), rating: z.number().int().min(1).max(5), body: z.string().trim().max(1000).optional() });

// Only a customer with a DELIVERED order containing this product can review it, and it is marked verified by that order.
export const POST = route(async (req) => {
  rateLimit(req, "review", 10, 600);
  const { userId } = await requireUser();
  const d = schema.parse(await req.json());
  const order = await db.order.findFirst({
    where: { customerId: userId, status: "DELIVERED", items: { some: { variant: { productId: d.productId } } } },
    orderBy: { createdAt: "desc" },
  });
  if (!order) throw new ApiError(403, "التقييم متاح بعد استلام طلب يحتوي على هذا المنتج");
  try {
    await db.review.create({ data: { productId: d.productId, userId, orderId: order.id, rating: d.rating, body: d.body || null, status: "PENDING" } });
  } catch (e) {
    throw (e as { code?: string }).code === "P2002" ? new ApiError(409, "قيّمت هذا المنتج من قبل") : dbError(e);
  }
  return json({ ok: true, message: "شكرًا لتقييمك. سيظهر بعد مراجعة الإدارة." }, 201);
});
