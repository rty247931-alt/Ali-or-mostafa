import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { requireUser } from "@/lib/perm";

export const GET = route(async () => {
  const { userId } = await requireUser();
  const [balance, transactions] = await Promise.all([
    db.loyaltyTransaction.aggregate({ where: { userId }, _sum: { points: true } }),
    db.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, type: true, points: true, description: true, createdAt: true },
    }),
  ]);
  return json({ balance: balance._sum.points ?? 0, transactions });
});
