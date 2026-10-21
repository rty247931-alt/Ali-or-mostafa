import { db } from "@/lib/db";
import { route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { audit } from "@/lib/audit";
import { toCsv } from "@/lib/csv";

export const GET = route(async () => {
  const { userId } = await requirePerm("product.view");
  const rows = await db.productVariant.findMany({ include: { product: { include: { category: true } }, color: true, size: true, inventory: true }, orderBy: { productId: "asc" } });
  const head = ["sku", "name", "slug", "category_slug", "base_price", "sale_price", "material", "color", "size", "quantity", "status"];
  const csv = toCsv([head, ...rows.map((v) => [v.product.sku, v.product.name, v.product.slug, v.product.category.slug, Number(v.product.basePrice), v.product.salePrice ? Number(v.product.salePrice) : "", v.product.material ?? "", v.color.name, v.size.label, v.inventory?.onHand ?? 0, v.product.status])]);
  await audit(db, userId, "export.products", "Product", null, { rows: rows.length });
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="products.csv"' } });
});
