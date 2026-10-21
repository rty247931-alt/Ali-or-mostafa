import { describe, it, expect } from "vitest";
import { csvCell, parseCsv, toCsv } from "../src/lib/csv";
import { paymobHmac, verifyPaymobHmac } from "../src/lib/paymob";

describe("csv", () => {
  it("neutralises spreadsheet formulas but keeps negative numbers", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell(-5)).toBe("-5");
  });
  it("quotes commas, quotes and newlines", () => expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"'));
  it("round-trips Arabic text with commas", () => {
    const rows = [["اسم", "وصف"], ["حذاء، رياضي", 'قال "جيد"']];
    expect(parseCsv(toCsv(rows))).toEqual([["اسم", "وصف"], ["حذاء، رياضي", 'قال "جيد"']]);
  });
});

describe("paymob signature", () => {
  const obj = { amount_cents: 15000, created_at: "2026-01-01T00:00:00", currency: "EGP", error_occured: false, has_parent_transaction: false, id: 99, integration_id: 7, is_3d_secure: true, is_auth: false, is_capture: false, is_refunded: false, is_standalone_payment: true, is_voided: false, order: { id: 5 }, owner: 3, pending: false, source_data: { pan: "2346", sub_type: "MasterCard", type: "card" }, success: true };
  it("accepts a correctly signed payload", () => expect(verifyPaymobHmac(obj, paymobHmac(obj, "secret"), "secret")).toBe(true));
  it("rejects a tampered amount", () => expect(verifyPaymobHmac({ ...obj, amount_cents: 1 }, paymobHmac(obj, "secret"), "secret")).toBe(false));
  it("rejects a wrong secret", () => expect(verifyPaymobHmac(obj, paymobHmac(obj, "other"), "secret")).toBe(false));
});
