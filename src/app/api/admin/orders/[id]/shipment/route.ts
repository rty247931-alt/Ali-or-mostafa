import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { requirePerm } from "@/lib/perm";

const schema = z.object({ carrier: z.string().trim().min(2).max(80), trackingNo: z.string().trim().max(80).optional() });

// Records carrier data entered by staff. No live tracking is shown until a real carrier API is integrated.
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { userId } = await requirePerm("order.status");
  const d = schema.parse(await req.json());
  const o = await db.order.findUnique({ where: { id: params.id } });
  if (!o) throw new ApiError(404, "الطلب غير موجود");
  if (o.status === "CANCELLED") throw new ApiError(409, "الطلب ملغي");
  const s = await db.shipment.create({ data: { orderId: o.id, carrier: d.carrier, trackingNo: d.trackingNo || null, shippedAt: new Date(), status: "SHIPPED" } });
  await audit(db, userId, "shipment.add", "Order", o.id, d);
  return json({ id: s.id }, 201);
});
