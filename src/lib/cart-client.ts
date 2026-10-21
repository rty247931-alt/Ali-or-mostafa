// The browser stores ONLY variant ids and quantities. Prices, stock and discounts always come from the server.
export type CartLine = { variantId: string; quantity: number };
const KEY = "st_cart_v1";

export function readCart(): CartLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((l) => typeof l?.variantId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0) : [];
  } catch { return []; }
}
export function writeCart(lines: CartLine[]) {
  try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
  window.dispatchEvent(new Event("cart-changed"));
}
export const cartCount = () => readCart().reduce((a, l) => a + l.quantity, 0);
export function addLine(variantId: string, quantity: number) {
  const lines = readCart();
  const e = lines.find((l) => l.variantId === variantId);
  if (e) e.quantity = Math.min(10, e.quantity + quantity); else lines.push({ variantId, quantity });
  writeCart(lines);
}
export const egp = (cents: number) => `${(cents / 100).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;
