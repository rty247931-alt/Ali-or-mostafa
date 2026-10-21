import { createHmac, timingSafeEqual } from "node:crypto";

const key = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET is missing");
  return s;
};
export const unsubSig = (email: string) => createHmac("sha256", key()).update(`unsub:${email.toLowerCase()}`).digest("hex");
export const unsubUrl = (email: string) => `${process.env.SITE_URL ?? ""}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&sig=${unsubSig(email)}`;
export function unsubValid(email: string, sig: string) {
  const a = Buffer.from(unsubSig(email)), b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
