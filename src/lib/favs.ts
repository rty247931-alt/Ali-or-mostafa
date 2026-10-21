import { db } from "./db";
import { getSession } from "./session";

export async function getFavIds(): Promise<Set<string>> {
  const s = await getSession();
  if (!s) return new Set();
  const rows = await db.favorite.findMany({ where: { userId: s.uid }, select: { productId: true } });
  return new Set(rows.map((r) => r.productId));
}
