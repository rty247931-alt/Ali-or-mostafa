import { redirect } from "next/navigation";
import ProductsManager from "@/components/ProductsManager";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/perm";

export default async function AdminProducts() {
  const staff = await getStaff();
  if (!staff?.perms.has("product.view")) redirect("/admin");
  const [products, categories, brands] = await Promise.all([
    db.product.findMany({
      orderBy: { createdAt: "desc" }, take: 300,
      include: { images: { orderBy: { sortOrder: "asc" }, include: { color: true } }, variants: { include: { color: true, size: true, inventory: true }, orderBy: { size: { sortOrder: "asc" } } } },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <h1>المنتجات والمخزون</h1>
      <ProductsManager
        categories={categories} brands={brands} canCreate={staff.perms.has("product.create")}
        perms={{ price: staff.perms.has("price.update"), update: staff.perms.has("product.update"), stock: staff.perms.has("stock.update") }}
        products={products.map((p) => ({
          id: p.id, name: p.name, status: p.status, base: Number(p.basePrice), sale: p.salePrice ? Number(p.salePrice) : null,
          categoryId: p.categoryId, brandId: p.brandId, shortDesc: p.shortDesc ?? "", description: p.description ?? "", material: p.material ?? "", shoeType: p.shoeType ?? "",
          originCountry: p.originCountry ?? "", careInfo: p.careInfo ?? "", searchKeywords: p.searchKeywords ?? "", seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "",
          images: p.images.map((i) => ({ id: i.id, url: i.url, color: i.color?.name ?? null, isPrimary: i.isPrimary })),
          variants: p.variants.map((v) => ({ id: v.id, color: v.color.name, size: v.size.label, onHand: v.inventory?.onHand ?? 0, reserved: v.inventory?.reserved ?? 0 })),
        }))}
      />
    </>
  );
}
