import { json, route } from "@/lib/errors";
import { listProducts } from "@/services/catalog";

export const GET = route(async (req) => {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  return json(await listProducts(params));
});
