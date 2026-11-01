import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { requireUser } from "@/lib/perm";
import { rateLimit } from "@/lib/ratelimit";
import { createOrder, orderInputSchema } from "@/services/orders";

export const POST = route(async (req) => {
  rateLimit(req, "order", 15, 600);
  const { userId } = await requireUser();
  const input = orderInputSchema.parse(await req.json());
  const user = await db.user.findUnique({ where: { id: userId }, select: { fullName: true, phone: true, email: true } });
  if (!user) throw new Error("الحساب غير موجود");
  const result = await createOrder({
    ...input,
    customer: { name: user.fullName, phone: user.phone || input.customer.phone, email: user.email || input.customer.email || "" },
  }, userId);

  const address = input.address;
  const duplicate = await db.address.findFirst({ where: { userId, governorate: address.governorate, city: address.city, addressLine: address.addressLine } });
  if (!duplicate) {
    const count = await db.address.count({ where: { userId } });
    if (count < 10) {
      await db.$transaction(async (tx) => {
        if (count === 0) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
        await tx.address.create({ data: {
          userId, fullName: user.fullName, phone: user.phone || input.customer.phone,
          governorate: address.governorate, city: address.city, area: address.area || null,
          addressLine: address.addressLine, landmark: address.landmark || null, isDefault: count === 0,
        }});
      });
    }
  }
  return json(result, 201);
});

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
