import { createHmac, timingSafeEqual } from "node:crypto";

// Paymob (Accept) integration. It does nothing until the four PAYMOB_* variables exist AND the owner
// has run the connection test in Settings. It has NOT been exercised against a live account yet.
const BASE = "https://accept.paymob.com/api";
export const paymobConfigured = () =>
  !!(process.env.PAYMOB_API_KEY && process.env.PAYMOB_INTEGRATION_ID && process.env.PAYMOB_IFRAME_ID && process.env.PAYMOB_HMAC_SECRET);

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`paymob ${path} ${r.status}`);
  return r.json() as Promise<T>;
}

export async function authToken(): Promise<string> {
  const d = await post<{ token: string }>("/auth/tokens", { api_key: process.env.PAYMOB_API_KEY });
  if (!d.token) throw new Error("paymob: no token");
  return d.token;
}

export async function createPaymentUrl(o: { number: string; amountCents: number; name: string; phone: string; email?: string | null; city: string; address: string; governorate: string }) {
  const token = await authToken();
  const [first, ...rest] = o.name.trim().split(/\s+/);
  const order = await post<{ id: number }>("/ecommerce/orders", {
    auth_token: token, delivery_needed: false, amount_cents: o.amountCents, currency: "EGP",
    merchant_order_id: `${o.number}~${Date.now().toString(36)}`, items: [],
  });
  const key = await post<{ token: string }>("/acceptance/payment_keys", {
    auth_token: token, amount_cents: o.amountCents, expiration: 3600, order_id: order.id, currency: "EGP",
    integration_id: Number(process.env.PAYMOB_INTEGRATION_ID),
    billing_data: {
      first_name: first, last_name: rest.join(" ") || "NA", email: o.email || "na@example.com", phone_number: o.phone,
      apartment: "NA", floor: "NA", street: o.address, building: "NA", shipping_method: "NA", postal_code: "NA",
      city: o.city, country: "EG", state: o.governorate,
    },
  });
  return `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${key.token}`;
}

const FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction", "id", "integration_id",
  "is_3d_secure", "is_auth", "is_capture", "is_refunded", "is_standalone_payment", "is_voided", "order.id", "owner",
  "pending", "source_data.pan", "source_data.sub_type", "source_data.type", "success",
];
const pick = (o: Record<string, unknown>, path: string): string => {
  const v = path.split(".").reduce<unknown>((a, k) => (a && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o);
  return v === undefined || v === null ? "" : String(v);
};

export const paymobHmac = (obj: Record<string, unknown>, secret: string) =>
  createHmac("sha512", secret).update(FIELDS.map((f) => pick(obj, f)).join("")).digest("hex");

export function verifyPaymobHmac(obj: Record<string, unknown>, received: string, secret: string): boolean {
  const a = Buffer.from(paymobHmac(obj, secret)), b = Buffer.from(received.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
