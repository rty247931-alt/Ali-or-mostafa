import { z } from "zod";
import { json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { changeOrderStatus } from "@/services/orders";

const schema = z.object({
  status: z.enum(["PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED", "RETURN_REQUESTED"]),
  note: z.string().max(300).optional(),
});

export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { userId } = await requirePerm("order.status");
  const d = schema.parse(await req.json());
  return json(await changeOrderStatus(params.id, d.status, userId, d.note));
});
