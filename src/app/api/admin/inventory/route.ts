import { json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { adjustSchema, adjustStock } from "@/services/inventory";

export const POST = route(async (req) => {
  const { userId } = await requirePerm("stock.update");
  return json(await adjustStock(adjustSchema.parse(await req.json()), userId));
});
