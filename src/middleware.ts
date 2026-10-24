import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Middleware is only an early gate. Page and API authorization must still run server-side.
const PRIVATE = ["/account/orders", "/account/profile", "/account/favorites"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.SESSION_SECRET;
  let authenticated = false;
  let staffSession = false;
  const token = req.cookies.get("st_session")?.value;

  if (token && secret && secret.length >= 32) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        algorithms: ["HS256"],
      });
      authenticated = typeof payload.sub === "string";
      staffSession = authenticated && payload.kind === "STAFF";
    } catch {
      // Invalid/expired tokens are treated as unauthenticated.
    }
  }

  const isAdminLogin = pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  const isManifest = pathname === "/admin/manifest.webmanifest";
  const adminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  // A valid customer session is not an admin session.
  if (adminArea && !isAdminLogin && !isManifest && !staffSession) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (!authenticated && PRIVATE.includes(pathname)) {
    return NextResponse.redirect(new URL("/account", req.url));
  }

  const headers = new Headers(req.headers);
  headers.set("x-path", pathname); // lets the root layout apply maintenance mode
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|api/payments).*)"],
};
