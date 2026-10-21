// Pure business rules: no database, no framework. Fully unit-testable.

export type DiscountType = "PERCENT" | "FIXED";

export const toCents = (v: number | string | { toString(): string }): number =>
  Math.round(Number(v.toString()) * 100);

export const fromCents = (c: number): string => (c / 100).toFixed(2);

/** A sale price only counts when it is strictly below the base price. */
export function effectiveCents(baseCents: number, saleCents?: number | null): number {
  return saleCents != null && saleCents > 0 && saleCents < baseCents ? saleCents : baseCents;
}

export function discountPercent(baseCents: number, saleCents?: number | null): number {
  const eff = effectiveCents(baseCents, saleCents);
  return eff < baseCents ? Math.round((1 - eff / baseCents) * 100) : 0;
}

/** value = percent (e.g. 10) for PERCENT, cents for FIXED. Never exceeds eligible amount. */
export function computeDiscount(type: DiscountType, value: number, eligibleCents: number): number {
  if (eligibleCents <= 0 || value <= 0) return 0;
  const raw = type === "PERCENT" ? Math.round((eligibleCents * Math.min(value, 100)) / 100) : Math.round(value);
  return Math.min(raw, eligibleCents);
}

export function shippingCents(costCents: number, freeOverCents: number | null, afterDiscountCents: number): number {
  return freeOverCents != null && afterDiscountCents >= freeOverCents ? 0 : costCents;
}

export type OrderStatus =
  | "NEW" | "PENDING_CONFIRMATION" | "CONFIRMED" | "PROCESSING" | "SHIPPED"
  | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED" | "RETURNED" | "RETURN_REQUESTED";

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["PENDING_CONFIRMATION", "CONFIRMED", "CANCELLED"],
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "RETURN_REQUESTED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURN_REQUESTED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED"],
  CANCELLED: [],
  RETURNED: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  TRANSITIONS[from]?.includes(to) ?? false;

export const nextStatuses = (from: OrderStatus): OrderStatus[] => TRANSITIONS[from] ?? [];

export const STATUS_AR: Record<OrderStatus, string> = {
  NEW: "طلب جديد", PENDING_CONFIRMATION: "في انتظار التأكيد", CONFIRMED: "تم التأكيد",
  PROCESSING: "قيد التجهيز", SHIPPED: "تم الشحن", OUT_FOR_DELIVERY: "خرج للتوصيل",
  DELIVERED: "تم التسليم", CANCELLED: "ملغي", RETURNED: "مرتجع", RETURN_REQUESTED: "قيد الاسترجاع",
};

export const PAYMENT_AR: Record<string, string> = {
  UNPAID: "غير مدفوع", PENDING: "في انتظار التأكيد", PAID: "مدفوع", FAILED: "فشل الدفع",
  PARTIALLY_REFUNDED: "مسترد جزئيًا", REFUNDED: "مسترد بالكامل",
};

export const SHIPPING_AR: Record<string, string> = {
  NOT_SHIPPED: "لم يُشحن", PREPARING: "قيد التجهيز", SHIPPED: "تم الشحن",
  OUT_FOR_DELIVERY: "خرج للتوصيل", DELIVERED: "تم التسليم", RETURNED: "مرتجع",
};

export const EG_PHONE = /^01[0125]\d{8}$/;

/** Converts Arabic-Indic digits to ASCII so "٠١٠..." phone numbers validate. */
export const normalizeDigits = (s: string): string =>
  s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
