import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { getSession } from "@/lib/session";
import { getSetting } from "@/lib/settings";
import { rateLimit } from "@/lib/ratelimit";
import { createPaymentUrl, paymobConfigured } from "@/lib/paymob";
import { toCents } from "@/lib/core";

export const POST = route(async (req) => {
  rateLimit(req, "payinit", 10, 600);
  const { number, phone } = z.object({ number: z.string().min(5).max(40), phone: z.string().min(5).max(20) }).parse(await req.json());
  if (!paymobConfigured() || !(await getSetting("payments.online.enabled", false))) throw new ApiError(400, "الدفع الإلكتروني غير مفعل");
  const o = await db.order.findUnique({ where: { number } });
  const s = await getSession();
  if (!o || !((s && o.customerId === s.uid) || o.customerPhone === phone)) throw new ApiError(404, "الطلب غير موجود");
  if (o.paymentMethod !== "ONLINE" || o.paymentStatus !== "PENDING" || o.status === "CANCELLED") throw new ApiError(409, "هذا الطلب لا يحتاج دفعًا إلكترونيًا الآن");
  const url = await createPaymentUrl({ number: o.number, amountCents: toCents(o.grandTotal), name: o.customerName, phone: o.customerPhone, email: o.customerEmail, city: o.shipCity, address: o.shipAddress, governorate: o.shipGovernorate });
  return json({ url });
});
