import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

// scrypt (memory-hard) from Node's standard library: no native dependency to compile.
const N = 2 ** 15, R = 8, P = 1, KEYLEN = 64, MAXMEM = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, KEYLEN, { N: n, r, p, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, key] = stored.split("$");
  if (alg !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"), +n, +r, +p);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let dummy: Promise<string> | undefined;
/** Burns the same CPU time when the user does not exist, so login timing doesn't reveal accounts. */
export async function fakeVerify(password: string) {
  dummy ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(password, await dummy);
}
