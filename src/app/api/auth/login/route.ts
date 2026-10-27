import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { fakeVerify, verifyPassword } from "@/lib/hash";
import { createSession } from "@/lib/session";
import { normalizeDigits } from "@/lib/core";
import { rateLimit } from "@/lib/ratelimit";

const schema = z.object({ identifier: z.string().trim().min(3).max(150), password: z.string().min(1).max(128) });
const MAX_FAILS = 5;
const LOCK_MIN = 15;
const BAD = "بيانات الدخول غير صحيحة";

export const POST = route(async (req) => {
  rateLimit(req, "login", 25, 600);
  const { identifier, password } = schema.parse(await req.json());
  const id = identifier.includes("@") ? identifier.toLowerCase() : normalizeDigits(identifier);
  const user = await db.user.findFirst({ where: { OR: [{ email: id }, { phone: id }, { username: identifier.trim().toLowerCase() }] } });

  if (!user) {
    await fakeVerify(password);
    throw new ApiError(401, BAD);
  }
  if (user.lockedUntil && user.lockedUntil > new Date())
    throw new ApiError(429, "تم إيقاف المحاولات مؤقتًا، جرّب بعد قليل");

  if (!user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    const fails = user.failedLogins + 1;
    await db.user.update({
      where: { id: user.id },
      data: fails >= MAX_FAILS
        ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MIN * 60_000) }
        : { failedLogins: fails },
    });
    throw new ApiError(401, BAD);
  }

  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  await createSession({ uid: user.id, kind: user.kind });
  return json({ ok: true, kind: user.kind });
});
