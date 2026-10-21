import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { hashPassword } from "@/lib/hash";
import { createSession } from "@/lib/session";
import { mailConfigured, sendMail } from "@/lib/mail";
import { rateLimit } from "@/lib/ratelimit";
import { issueToken } from "@/lib/tokens";
import { EG_PHONE, normalizeDigits } from "@/lib/core";

const schema = z
  .object({
    fullName: z.string().trim().min(3, "اكتب الاسم الأول والأخير").max(100),
    email: z.string().trim().toLowerCase().email("بريد غير صحيح").optional().or(z.literal("")),
    phone: z.string().transform(normalizeDigits).pipe(z.string().regex(EG_PHONE, "رقم موبايل مصري غير صحيح")).optional().or(z.literal("")),
    password: z.string().min(8, "كلمة المرور ٨ أحرف على الأقل").max(128),
  })
  .refine((d) => d.email || d.phone, { message: "اكتب البريد أو رقم الموبايل", path: ["email"] });

export const POST = route(async (req) => {
  rateLimit(req, "register", 10, 900);
  const d = schema.parse(await req.json());
  try {
    const user = await db.user.create({
      data: {
        kind: "CUSTOMER",
        fullName: d.fullName,
        email: d.email || null,
        phone: d.phone || null,
        passwordHash: await hashPassword(d.password),
        profile: { create: {} },
      },
    });
    if (user.email && mailConfigured()) {
      try {
        const raw = await issueToken(user.id, "VERIFY", 1440);
        const link = `${process.env.SITE_URL ?? ""}/api/auth/verify?token=${raw}`;
        await sendMail(user.email, "تأكيد بريدك الإلكتروني", `<div dir="rtl"><p>اضغط لتأكيد بريدك:</p><p><a href="${link}">${link}</a></p></div>`);
      } catch { console.error("[mail] verify delivery failed"); }
    }
    await createSession({ uid: user.id, kind: "CUSTOMER" });
    return json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new ApiError(409, "يوجد حساب بهذا البريد أو الموبايل بالفعل");
    throw e;
  }
});
