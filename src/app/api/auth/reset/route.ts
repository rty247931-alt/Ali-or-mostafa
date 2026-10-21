import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { hashPassword } from "@/lib/hash";
import { rateLimit } from "@/lib/ratelimit";
import { consumeToken } from "@/lib/tokens";

export const POST = route(async (req) => {
  rateLimit(req, "reset", 10, 900);
  const d = z.object({ token: z.string().min(20).max(200), password: z.string().min(8, "كلمة المرور ٨ أحرف على الأقل").max(128) }).parse(await req.json());
  const userId = await consumeToken(d.token, "RESET");
  if (!userId) throw new ApiError(400, "الرابط غير صالح أو منتهي");
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(d.password), failedLogins: 0, lockedUntil: null } });
  return json({ ok: true });
});
