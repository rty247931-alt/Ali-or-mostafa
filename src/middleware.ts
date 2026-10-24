import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// First gate only (is there a valid session?). Real permission checks happen on the server for every operation.
const PRIVATE = ["/account/orders", "/account/profile", "/account/favorites"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.SESSION_SECRET;
  let ok = false;
  const token = req.cookies.get("st_session")?.value;
  if (token && secret) {
    try { await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] }); ok = true; } catch {}
  }
  const adminArea = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && pathname !== "/admin/manifest.webmanifest";
  if (!ok && (adminArea || PRIVATE.includes(pathname)))
    return NextResponse.redirect(new URL(adminArea ? "/admin/login" : "/account", req.url));

  const headers = new Headers(req.headers);
  headers.set("x-path", pathname); // lets the root layout apply maintenance mode
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|api/payments).*)"] };
