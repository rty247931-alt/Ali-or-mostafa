import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { mailConfigured, sendMail } from "@/lib/mail";
import { rateLimit } from "@/lib/ratelimit";
import { issueToken } from "@/lib/tokens";

export const POST = route(async (req) => {
  rateLimit(req, "forgot", 5, 900);
  const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(await req.json());
  if (!mailConfigured()) throw new ApiError(503, "استعادة كلمة المرور غير مفعلة حاليًا. تواصل مع الإدارة.");
  const user = await db.user.findUnique({ where: { email } });
  if (user?.isActive) {
    const raw = await issueToken(user.id, "RESET", 60);
    const link = `${process.env.SITE_URL ?? ""}/account/reset?token=${raw}`;
    try { await sendMail(email, "استعادة كلمة المرور", `<div dir="rtl"><p>اضغط على الرابط لتعيين كلمة مرور جديدة (صالح لمدة ساعة):</p><p><a href="${link}">${link}</a></p></div>`); }
    catch { console.error("[mail] reset delivery failed"); }
  }
  // Same answer whether or not the account exists, so the form can't be used to discover accounts.
  return json({ ok: true, message: "إن كان البريد مسجلًا فستصلك رسالة بالخطوات." });
});
