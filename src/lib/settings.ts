import { db } from "./db";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.storeSetting.findUnique({ where: { key } });
  return row ? (row.value as T) : fallback;
}

export async function getSettings(keys: string[]): Promise<Record<string, unknown>> {
  const rows = await db.storeSetting.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
