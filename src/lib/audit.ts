import type { Prisma } from "@prisma/client";
import { db } from "./db";

type Tx = Prisma.TransactionClient | typeof db;

const SENSITIVE = /pass|secret|token|card|cvv/i;
function scrub(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(scrub);
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SENSITIVE.test(k) ? "[hidden]" : scrub(x)]));
  return v;
}

export async function audit(
  tx: Tx,
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  changes?: unknown,
) {
  await tx.auditLog.create({
    data: { actorId, action, entity, entityId, changes: changes === undefined ? undefined : (scrub(changes) as Prisma.InputJsonValue) },
  });
}
