import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { parseCsv } from "@/lib/csv";
import { createProduct, type ProductInput } from "@/services/products";

const REQUIRED = ["sku", "name", "slug", "category_slug", "base_price", "color", "size", "quantity"];
const rowSchema = z.object({
  sku: z.string().trim().min(2).max(40), name: z.string().trim().min(2).max(150),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "الرابط غير صحيح"),
  category_slug: z.string().trim().min(1), base_price: z.coerce.number().positive().max(1_000_000),
  sale_price: z.string().trim().optional(), material: z.string().trim().max(60).optional(),
  color: z.string().trim().min(1).max(40), size: z.string().trim().min(1).max(10),
  quantity: z.coerce.number().int().min(0).max(100000), status: z.enum(["ACTIVE", "DRAFT"]).optional().or(z.literal("")),
});

// Validate EVERYTHING first; create nothing unless every row is valid (all-or-nothing).
export const POST = route(async (req) => {
  const { userId } = await requirePerm("product.create");
  const { csv } = z.object({ csv: z.string().min(10).max(2_000_000) }).parse(await req.json());
  const table = parseCsv(csv);
  if (table.length < 2) throw new ApiError(400, "الملف فارغ");
  const head = table[0].map((h) => h.trim().toLowerCase());
  const miss = REQUIRED.filter((c) => !head.includes(c));
  if (miss.length) throw new ApiError(400, `أعمدة ناقصة: ${miss.join("، ")}`);

  const errors: string[] = [];
  const cats = new Map((await db.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));
  const groups = new Map<string, ProductInput>();
  const seen = new Set<string>();

  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const obj = Object.fromEntries(head.map((h, k) => [h, (cells[k] ?? "").trim()]));
    const r = rowSchema.safeParse(obj);
    if (!r.success) { errors.push(`سطر ${line}: ${r.error.issues[0].message} (${r.error.issues[0].path.join(".")})`); return; }
    const d = r.data, catId = cats.get(d.category_slug);
    if (!catId) { errors.push(`سطر ${line}: القسم «${d.category_slug}» غير موجود`); return; }
    const sale = d.sale_price ? Number(d.sale_price) : null;
    if (sale != null && (!(sale > 0) || sale >= d.base_price)) { errors.push(`سطر ${line}: سعر البيع يجب أن يكون أقل من الأساسي`); return; }
    const key = `${d.sku}|${d.color}|${d.size}`;
    if (seen.has(key)) { errors.push(`سطر ${line}: لون ومقاس مكرر للمنتج ${d.sku}`); return; }
    seen.add(key);
    const g = groups.get(d.sku);
    if (g && (g.name !== d.name || g.slug !== d.slug || g.basePrice !== d.base_price)) { errors.push(`سطر ${line}: بيانات المنتج ${d.sku} غير متطابقة مع سطوره السابقة`); return; }
    const v = { colorName: d.color, sizeLabel: d.size, quantity: d.quantity };
    if (g) g.variants.push(v);
    else groups.set(d.sku, { name: d.name, slug: d.slug, sku: d.sku, categoryId: catId, basePrice: d.base_price, salePrice: sale, material: d.material || undefined, status: d.status || "DRAFT", variants: [v] });
  });
  if (errors.length) return json({ error: `يوجد ${errors.length} خطأ في الملف. لم يُستورد أي منتج.`, errors: errors.slice(0, 50) }, 400);
  if (groups.size > 300) throw new ApiError(400, "الحد الأقصى ٣٠٠ منتج في المرة");

  await db.$transaction(async (tx) => { for (const g of groups.values()) await createProduct(tx, g, userId); }, { timeout: 60000 });
  return json({ imported: groups.size }, 201);
});
