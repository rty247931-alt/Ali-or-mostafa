import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { requireUser } from "@/lib/perm";
import { EG_PHONE, normalizeDigits } from "@/lib/core";
import { GOVERNORATES } from "@/lib/geo";

const schema = z.object({
  fullName: z.string().trim().min(3).max(100),
  phone: z.string().transform(normalizeDigits).pipe(z.string().regex(EG_PHONE, "رقم موبايل مصري غير صحيح")),
  governorate: z.enum(GOVERNORATES), city: z.string().trim().min(2).max(100), area: z.string().trim().max(100).optional(),
  addressLine: z.string().trim().min(6).max(300), landmark: z.string().trim().max(150).optional(), isDefault: z.boolean().optional(),
});

export const POST = route(async (req) => {
  const { userId } = await requireUser();
  const d = schema.parse(await req.json());
  if ((await db.address.count({ where: { userId } })) >= 10) throw new ApiError(400, "الحد الأقصى ١٠ عناوين");
  await db.$transaction(async (tx) => {
    if (d.isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    await tx.address.create({ data: { ...d, userId } });
  });
  return json({ ok: true }, 201);
});

export const DELETE = route(async (req) => {
  const { userId } = await requireUser();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const r = await db.address.deleteMany({ where: { id, userId } }); // userId in the filter = you can only delete your own
  if (r.count === 0) throw new ApiError(404, "العنوان غير موجود");
  return json({ ok: true });
});
