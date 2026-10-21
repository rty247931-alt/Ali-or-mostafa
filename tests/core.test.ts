import { describe, it, expect } from "vitest";
import { computeDiscount, canTransition, discountPercent, effectiveCents, shippingCents, toCents, fromCents, normalizeDigits, EG_PHONE } from "../src/lib/core";

describe("pricing", () => {
  it("ignores a fake sale price (>= base)", () => {
    expect(effectiveCents(10000, 10000)).toBe(10000);
    expect(effectiveCents(10000, 12000)).toBe(10000);
    expect(discountPercent(10000, 12000)).toBe(0);
  });
  it("computes a real discount percent", () => {
    expect(discountPercent(145000, 119000)).toBe(18);
  });
  it("money round-trips without float drift", () => {
    expect(toCents("19.99")).toBe(1999);
    expect(fromCents(1999)).toBe("19.99");
  });
});

describe("coupons", () => {
  it("percent discount", () => expect(computeDiscount("PERCENT", 10, 50000)).toBe(5000));
  it("fixed discount is capped at the eligible amount", () => expect(computeDiscount("FIXED", 90000, 50000)).toBe(50000));
  it("nothing eligible = no discount", () => expect(computeDiscount("PERCENT", 10, 0)).toBe(0));
});

describe("shipping", () => {
  it("free over threshold", () => expect(shippingCents(5000, 150000, 150000)).toBe(0));
  it("charged under threshold", () => expect(shippingCents(5000, 150000, 149999)).toBe(5000));
});

describe("order status", () => {
  it("allows the normal flow", () => {
    expect(canTransition("NEW", "CONFIRMED")).toBe(true);
    expect(canTransition("PROCESSING", "SHIPPED")).toBe(true);
  });
  it("blocks skipping and reviving", () => {
    expect(canTransition("NEW", "DELIVERED")).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransition("DELIVERED", "CANCELLED")).toBe(false);
  });
});

describe("phone", () => {
  it("accepts Arabic digits after normalisation", () => {
    expect(EG_PHONE.test(normalizeDigits("٠١٠١٢٣٤٥٦٧٨"))).toBe(true);
    expect(EG_PHONE.test("0212345678")).toBe(false);
  });
});
