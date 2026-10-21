import { PrismaClient } from "@prisma/client";
import { PERMISSIONS, ROLE_PERMS } from "../src/lib/perm-data";
import { GOVERNORATES } from "../src/lib/geo";

const db = new PrismaClient();

async function main() {
  for (const code of PERMISSIONS) await db.permission.upsert({ where: { code }, update: {}, create: { code } });
  for (const [name, perms] of Object.entries(ROLE_PERMS)) {
    const role = await db.role.upsert({ where: { name }, update: {}, create: { name } });
    for (const code of perms) {
      const p = await db.permission.findUniqueOrThrow({ where: { code } });
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } }, update: {}, create: { roleId: role.id, permissionId: p.id },
      });
    }
  }

  const cats: [string, string][] = [
    ["رجالي", "men"], ["حريمي", "women"], ["أطفال", "kids"], ["رياضي", "sports"],
    ["كاجوال", "casual"], ["رسمي", "formal"], ["صنادل وشباشب", "sandals"],
  ];
  for (const [i, [name, slug]] of cats.entries())
    await db.category.upsert({ where: { slug }, update: {}, create: { name, slug, sortOrder: i } });

  // Starter shipping rules. Owner edits these (they are defaults, not real carrier quotes).
  const cost = (g: string) => (["القاهرة", "الجيزة"].includes(g) ? 50 : ["الإسكندرية", "القليوبية"].includes(g) ? 60 : 85);
  for (const g of GOVERNORATES) {
    const zone = await db.shippingZone.upsert({ where: { governorate: g }, update: {}, create: { governorate: g } });
    if ((await db.shippingMethod.count({ where: { zoneId: zone.id } })) === 0)
      await db.shippingMethod.create({ data: { zoneId: zone.id, name: "شحن عادي", cost: cost(g).toFixed(2), freeOverAmount: "1500.00", estimatedDays: null } });
  }

  const settings: Record<string, unknown> = {
    "store.name": "خُطوة", "store.description": "متجر أحذية رجالي وحريمي وأطفال",
    "theme.primary": "#FF4A1C", "theme.ink": "#0E0E10",
    "currency": "EGP", "checkout.guest.enabled": true,
    "payments.online.enabled": false, // flip only after a real gateway is integrated and tested
    "order.minTotal": 0,
  };
  for (const [key, value] of Object.entries(settings))
    await db.storeSetting.upsert({ where: { key }, update: {}, create: { key, value: value as never } });

  const pages: [string, string, string][] = [
    ["about", "من نحن", "اكتب هنا قصة المتجر. هذا نص مبدئي يُعدَّل قبل الإطلاق."],
    ["contact", "اتصل بنا", "أضف هنا أرقام الهاتف والبريد والعنوان."],
    ["faq", "الأسئلة الشائعة", "أضف هنا الأسئلة الشائعة وإجاباتها."],
    ["privacy", "سياسة الخصوصية", "نص مبدئي. يجب مراجعته قانونيًا قبل الإطلاق."],
    ["terms", "الشروط والأحكام", "نص مبدئي. يجب مراجعته قانونيًا قبل الإطلاق."],
    ["shipping", "سياسة الشحن", "اشرح هنا تكلفة ومدة الشحن لكل منطقة."],
    ["returns", "الاستبدال والاسترجاع", "اكتب هنا شروط ومدة الاستبدال والاسترجاع."],
    ["size-guide", "دليل المقاسات", "أضف هنا جدول المقاسات."],
  ];
  for (const [slug, title, content] of pages)
    await db.page.upsert({ where: { slug }, update: {}, create: { slug, title, content } });

  if (process.env.SEED_DEMO === "1" && process.env.NODE_ENV !== "production") {
    const cat = await db.category.findUniqueOrThrow({ where: { slug: "sports" } });
    const exists = await db.product.findUnique({ where: { slug: "demo-runner" } });
    if (!exists) {
      const color = await db.color.upsert({ where: { name: "أسود" }, update: {}, create: { name: "أسود", hex: "#1c1c1f" } });
      const p = await db.product.create({
        data: { name: "[تجريبي] حذاء ركض", slug: "demo-runner", sku: "DEMO-1", categoryId: cat.id, basePrice: "1450.00", salePrice: "1190.00",
          currentPrice: "1190.00", discountPercent: 18, status: "ACTIVE", description: "منتج تجريبي للتطوير فقط. احذفه قبل الإطلاق." },
      });
      for (const label of ["40", "41", "42", "43"]) {
        const size = await db.size.upsert({ where: { label }, update: {}, create: { label, sortOrder: +label } });
        const v = await db.productVariant.create({ data: { productId: p.id, colorId: color.id, sizeId: size.id, sku: `DEMO-1-${label}` } });
        await db.inventory.create({ data: { variantId: v.id, onHand: 5 } });
      }
    }
  }
  console.log("Seed complete.");
}

main().finally(() => db.$disconnect());
