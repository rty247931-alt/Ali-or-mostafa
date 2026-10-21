import { z } from "zod";
import type { Perm } from "./perm-data";

export type FieldType = "text" | "number" | "textarea" | "checkbox" | "select" | "datetime";
export type Field = {
  key: string; label: string; type: FieldType; required?: boolean; readOnly?: boolean;
  options?: { value: string; label: string }[]; default?: unknown; hint?: string;
};

// Empty string -> null, but "not sent" stays "not sent" (so a partial update never wipes other fields).
const ostr = (n: number) => z.string().trim().max(n).nullish().transform((v) => (v === undefined ? undefined : v ? v : null));
const odate = z.string().nullish().transform((v) => (v === undefined ? undefined : v ? new Date(v) : null))
  .refine((v) => v == null || !isNaN(v.getTime()), "تاريخ غير صحيح");
const oint = z.number().int().min(0).max(1_000_000).nullish();
const onum = z.number().min(0).max(1_000_000).nullish();
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "حروف إنجليزية وأرقام وشرطات فقط");
const urlish = z.string().trim().regex(/^(https?:\/\/|\/)/, "رابط غير صحيح").max(500);

export type EntityDef = {
  model: string; title: string; perm: Perm; schema: z.ZodObject<z.ZodRawShape>; fields: Field[];
  orderBy: Record<string, "asc" | "desc">; canCreate?: boolean; canDelete?: boolean; include?: object;
  label: (r: Record<string, any>) => string;
  check?: (merged: Record<string, any>) => string | null;
};

const T = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, type: "text", ...extra });
const N = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, type: "number", ...extra });
const B = (key: string, label: string, def = true): Field => ({ key, label, type: "checkbox", default: def });
const D = (key: string, label: string): Field => ({ key, label, type: "datetime" });

export const ENTITIES: Record<string, EntityDef> = {
  categories: {
    model: "category", title: "الأقسام", perm: "product.update", orderBy: { sortOrder: "asc" },
    schema: z.object({ name: z.string().trim().min(1).max(80), slug, description: ostr(300), imageUrl: ostr(500), sortOrder: z.number().int().min(0).max(9999), isVisible: z.boolean() }),
    fields: [T("name", "الاسم", { required: true }), T("slug", "الرابط (إنجليزي)", { required: true }), T("description", "الوصف"), T("imageUrl", "رابط الصورة"), N("sortOrder", "الترتيب", { default: 0 }), B("isVisible", "ظاهر في المتجر")],
    label: (r) => r.name,
  },
  brands: {
    model: "brand", title: "الماركات", perm: "product.update", orderBy: { sortOrder: "asc" },
    schema: z.object({ name: z.string().trim().min(1).max(80), slug, logoUrl: ostr(500), description: ostr(300), sortOrder: z.number().int().min(0).max(9999), isVisible: z.boolean(), showOnHome: z.boolean() }),
    fields: [T("name", "الاسم", { required: true }), T("slug", "الرابط (إنجليزي)", { required: true }), T("logoUrl", "رابط الشعار"), T("description", "الوصف"), N("sortOrder", "الترتيب", { default: 0 }), B("isVisible", "ظاهرة"), B("showOnHome", "تظهر في الرئيسية", false)],
    label: (r) => r.name,
  },
  coupons: {
    model: "coupon", title: "الكوبونات", perm: "price.update", orderBy: { code: "asc" }, canDelete: false,
    schema: z.object({
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "٣–٣٠ حرفًا إنجليزيًا أو رقمًا"),
      type: z.enum(["PERCENT", "FIXED"]), value: z.number().positive().max(1_000_000),
      minOrderValue: onum, startsAt: odate, endsAt: odate, maxUses: oint, maxUsesPerUser: oint, isActive: z.boolean(),
    }),
    fields: [
      T("code", "الكود", { required: true }),
      { key: "type", label: "نوع الخصم", type: "select", options: [{ value: "PERCENT", label: "نسبة مئوية" }, { value: "FIXED", label: "مبلغ ثابت (ج.م)" }], default: "PERCENT" },
      N("value", "القيمة", { required: true, hint: "النسبة (١–١٠٠) أو المبلغ بالجنيه" }), N("minOrderValue", "الحد الأدنى للطلب"),
      D("startsAt", "يبدأ"), D("endsAt", "ينتهي"), N("maxUses", "أقصى عدد استخدامات"), N("maxUsesPerUser", "أقصى استخدام لكل عميل"), B("isActive", "مفعّل"),
    ],
    label: (r) => `${r.code} — ${r.type === "PERCENT" ? `${Number(r.value)}٪` : `${Number(r.value)} ج.م`}`,
    check: (d) => (d.type === "PERCENT" && Number(d.value) > 100 ? "النسبة لا تتجاوز ١٠٠" : d.startsAt && d.endsAt && new Date(d.endsAt) <= new Date(d.startsAt) ? "تاريخ النهاية قبل البداية" : null),
  },
  banners: {
    model: "banner", title: "البانرات", perm: "settings.update", orderBy: { sortOrder: "asc" },
    schema: z.object({ imageUrl: urlish, title: ostr(120), subtitle: ostr(250), buttonText: ostr(40), buttonUrl: ostr(500), placement: z.enum(["hero", "home", "promo"]), sortOrder: z.number().int().min(0).max(9999), startsAt: odate, endsAt: odate, isVisible: z.boolean() }),
    fields: [
      T("imageUrl", "رابط الصورة", { required: true }), T("title", "العنوان"), T("subtitle", "الوصف"), T("buttonText", "نص الزر"), T("buttonUrl", "رابط الزر"),
      { key: "placement", label: "المكان", type: "select", options: [{ value: "home", label: "الرئيسية" }, { value: "promo", label: "ترويجي" }], default: "home" },
      N("sortOrder", "الترتيب", { default: 0 }), D("startsAt", "يبدأ"), D("endsAt", "ينتهي"), B("isVisible", "ظاهر"),
    ],
    label: (r) => r.title || r.imageUrl,
  },
  pages: {
    model: "page", title: "صفحات المحتوى", perm: "settings.update", orderBy: { slug: "asc" },
    schema: z.object({ slug, title: z.string().trim().min(1).max(120), content: z.string().min(1).max(20000), seoTitle: ostr(120), seoDescription: ostr(250), isPublished: z.boolean() }),
    fields: [T("slug", "الرابط (about, privacy…)", { required: true }), T("title", "العنوان", { required: true }), { key: "content", label: "المحتوى (نص عادي)", type: "textarea", required: true }, T("seoTitle", "عنوان SEO"), T("seoDescription", "وصف SEO"), B("isPublished", "منشورة")],
    label: (r) => `${r.title} (${r.slug})`,
  },
  "shipping-zones": {
    model: "shippingZone", title: "مناطق الشحن", perm: "settings.update", orderBy: { governorate: "asc" }, canCreate: false, canDelete: false,
    schema: z.object({ isActive: z.boolean() }),
    fields: [T("governorate", "المحافظة", { readOnly: true }), B("isActive", "الشحن متاح")],
    label: (r) => r.governorate,
  },
  "shipping-methods": {
    model: "shippingMethod", title: "طرق وأسعار الشحن", perm: "settings.update", orderBy: { zoneId: "asc" }, include: { zone: true },
    schema: z.object({ zoneId: z.string().min(1), name: z.string().trim().min(1).max(80), cost: z.number().min(0).max(100000), freeOverAmount: onum, estimatedDays: ostr(60), isActive: z.boolean() }),
    fields: [{ key: "zoneId", label: "المحافظة", type: "select", options: [], required: true }, T("name", "اسم الطريقة", { required: true, default: "شحن عادي" }), N("cost", "التكلفة (ج.م)", { required: true }), N("freeOverAmount", "شحن مجاني من (ج.م)"), T("estimatedDays", "المدة المتوقعة (من شركة الشحن)"), B("isActive", "مفعّلة")],
    label: (r) => `${r.zone?.governorate ?? ""} — ${r.name} — ${Number(r.cost)} ج.م`,
  },
  reviews: {
    model: "review", title: "التقييمات", perm: "product.update", orderBy: { createdAt: "desc" }, canCreate: false, canDelete: false,
    include: { product: { select: { name: true } }, user: { select: { fullName: true } } },
    schema: z.object({ status: z.enum(["PENDING", "APPROVED", "HIDDEN"]), reply: ostr(500) }),
    fields: [
      N("rating", "التقييم", { readOnly: true }), { key: "body", label: "النص", type: "textarea", readOnly: true },
      { key: "status", label: "الحالة", type: "select", options: [{ value: "PENDING", label: "بانتظار المراجعة" }, { value: "APPROVED", label: "معتمد" }, { value: "HIDDEN", label: "مخفي" }] },
      T("reply", "رد المتجر"),
    ],
    label: (r) => `${r.product?.name ?? ""} — ${"★".repeat(r.rating)} — ${r.user?.fullName ?? ""} (${r.status === "PENDING" ? "بانتظار المراجعة" : r.status === "APPROVED" ? "معتمد" : "مخفي"})`,
  },
  questions: {
    model: "productQuestion", title: "أسئلة المنتجات", perm: "product.update", orderBy: { createdAt: "desc" }, canCreate: false, include: { product: { select: { name: true } } },
    schema: z.object({ answer: ostr(500), isPublished: z.boolean() }),
    fields: [T("name", "السائل", { readOnly: true }), { key: "question", label: "السؤال", type: "textarea", readOnly: true }, T("answer", "الإجابة"), B("isPublished", "منشور في صفحة المنتج", false)],
    label: (r) => `${r.product?.name ?? ""} — ${String(r.question).slice(0, 40)}${r.isPublished ? "" : " (غير منشور)"}`,
  },
  messages: {
    model: "contactMessage", title: "رسائل اتصل بنا", perm: "customer.view", orderBy: { createdAt: "desc" }, canCreate: false,
    schema: z.object({ isRead: z.boolean() }),
    fields: [T("name", "الاسم", { readOnly: true }), T("phone", "الهاتف", { readOnly: true }), T("email", "البريد", { readOnly: true }), { key: "message", label: "الرسالة", type: "textarea", readOnly: true }, B("isRead", "تمت القراءة", false)],
    label: (r) => `${r.name}${r.isRead ? "" : " ● جديدة"}`,
  },
};
