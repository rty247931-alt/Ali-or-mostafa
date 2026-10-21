import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

export async function issueToken(userId: string, type: "RESET" | "VERIFY", ttlMin: number): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  await db.verificationToken.create({ data: { userId, type, tokenHash: hash(raw), expiresAt: new Date(Date.now() + ttlMin * 60_000) } });
  return raw;
}

/** Single use: the updateMany guard makes a replayed link fail even under concurrent requests. */
export async function consumeToken(raw: string, type: "RESET" | "VERIFY"): Promise<string | null> {
  const t = await db.verificationToken.findUnique({ where: { tokenHash: hash(raw) } });
  if (!t || t.type !== type || t.usedAt || t.expiresAt < new Date()) return null;
  const r = await db.verificationToken.updateMany({ where: { id: t.id, usedAt: null }, data: { usedAt: new Date() } });
  return r.count === 1 ? t.userId : null;
}
