import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Wraps a route handler: Arabic error messages, no internal details leaked. */
export function route<C = unknown>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        return NextResponse.json({ error: "بيانات غير صحيحة، راجع الحقول", fields: e.flatten().fieldErrors }, { status: 400 });
      }
      console.error("[api]", e instanceof Error ? e.message : "unknown error");
      return NextResponse.json({ error: "حدث خطأ غير متوقع. حاول مرة أخرى." }, { status: 500 });
    }
  };
}

/** CSRF defence in depth (cookies are also SameSite=Lax): mutating requests must come from our own origin. */
export function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (new URL(origin).host !== host) throw new ApiError(403, "طلب غير مسموح");
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

import { Prisma } from "@prisma/client";
/** Turns common database failures into clear Arabic messages. */
export function dbError(e: unknown): unknown {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return new ApiError(409, "القيمة مستخدمة من قبل (مكررة)");
    if (e.code === "P2003") return new ApiError(409, "لا يمكن تنفيذ العملية لارتباطها ببيانات أخرى. يمكنك إخفاء العنصر بدلًا من حذفه");
    if (e.code === "P2025") return new ApiError(404, "العنصر غير موجود");
  }
  return e;
}
