import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const COOKIE = "st_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET is missing or shorter than 32 characters");
  return new TextEncoder().encode(s);
}

export type Session = { uid: string; kind: "CUSTOMER" | "STAFF" };

export async function createSession(s: Session) {
  const token = await new SignJWT({ kind: s.kind })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.uid)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function destroySession() {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function verifyToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { uid: payload.sub, kind: payload.kind === "STAFF" ? "STAFF" : "CUSTOMER" };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  return verifyToken(cookies().get(COOKIE)?.value);
}
