import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { cardSelect, toCard } from "@/services/catalog";

export const GET = route(async (req) => {
  const slugs = (new URL(req.url).searchParams.get("slugs") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8);
  const rows = await db.product.findMany({ where: { slug: { in: slugs }, status: "ACTIVE" }, select: cardSelect });
  return json(slugs.map((s) => rows.find((r) => r.slug === s)).filter(Boolean).map((r) => toCard(r!)));
});
