import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { audit } from "@/lib/audit";

export const adjustSchema = z.object({
  variantId: z.string().min(1),
  type: z.enum(["PURCHASE_IN", "RETURN_RESTOCK", "DAMAGED", "ADJUSTMENT"]),
  quantity: z.number().int().refine((n) => n !== 0, "الكمية لا يمكن أن تكون صفرًا").refine((n) => Math.abs(n) <= 100000),
  reason: z.string().trim().min(3, "اكتب سبب التعديل").max(200),
});

export async function adjustStock(input: z.infer<typeof adjustSchema>, actorId: string) {
  const delta =
    input.type === "DAMAGED" ? -Math.abs(input.quantity)
    : input.type === "ADJUSTMENT" ? input.quantity
    : Math.abs(input.quantity);

  return db.$transaction(async (tx) => {
    const n = await tx.$executeRaw`UPDATE "Inventory" SET "onHand" = "onHand" + ${delta}::int, "updatedAt" = NOW()
      WHERE "variantId" = ${input.variantId} AND "onHand" + ${delta}::int >= "reserved"`;
    if (n !== 1) throw new ApiError(409, "لا يمكن تخفيض المخزون أقل من الكمية المحجوزة أو أقل من صفر");
    const inv = await tx.inventory.findUniqueOrThrow({ where: { variantId: input.variantId } });
    await tx.inventoryMovement.create({
      data: { inventoryId: inv.id, type: input.type, quantity: delta, reason: input.reason, actorId },
    });
    await audit(tx, actorId, "stock.adjust", "Inventory", inv.id, { delta, type: input.type, reason: input.reason, onHand: inv.onHand });
    return { onHand: inv.onHand };
  });
}
