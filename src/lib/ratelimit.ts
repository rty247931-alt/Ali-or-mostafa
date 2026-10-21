import { ApiError } from "./errors";

// Best-effort, per server instance. On serverless hosts each instance has its own counter,
// so treat this as a speed bump; the login lockout in the database is the hard limit.
const hits = new Map<string, { n: number; reset: number }>();

export function rateLimit(req: Request, name: string, max: number, windowSec: number) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const key = `${name}:${ip}`, now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowSec * 1000 }); return; }
  if (++h.n > max) throw new ApiError(429, "محاولات كثيرة، حاول بعد قليل");
}
