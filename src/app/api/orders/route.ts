import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { requireUser } from "@/lib/perm";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import { createOrder, orderInputSchema } from "@/services/orders";

export const POST = route(async (req) => {
  rateLimit(req, "order", 15, 600);
  const input = orderInputSchema.parse(await req.json());
  const s = await getSession();
  return json(await createOrder(input, s?.uid ?? null), 201);
});

// A customer only ever sees their own orders.
export const GET = route(async () => {
  const { userId } = await requireUser();
  const orders = await db.order.findMany({
    where: { customerId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { number: true, createdAt: true, grandTotal: true, status: true, paymentStatus: true, shippingStatus: true },
  });
  return json(orders);
});
