import { z } from "zod";
import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { getSession } from "@/lib/session";
import { lineSchema, quote } from "@/services/pricing";

const schema = z.object({
  items: z.array(lineSchema).max(30),
  governorate: z.string().max(40).optional().nullable(),
  couponCode: z.string().max(40).optional().nullable(),
});

export const POST = route(async (req) => {
  const d = schema.parse(await req.json());
  const s = await getSession();
  if (d.items.length === 0)
    return json({ items: [], subtotalCents: 0, discountCents: 0, shippingCents: null, totalCents: 0, issues: [], couponError: null, shippingError: null });
  const q = await quote(db, d.items, { governorate: d.governorate, couponCode: d.couponCode, userId: s?.uid });
  return json(q);
});
