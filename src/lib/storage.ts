import { createHash, createHmac, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "./errors";

const MAX_BYTES = 5 * 1024 * 1024;

/** Detects the real type from the file's first bytes. The client-supplied MIME type is never trusted. */
export function sniffImage(b: Buffer): { ext: string; mime: string } | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (b.length > 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

const sha = (d: string | Buffer) => createHash("sha256").update(d).digest("hex");
const hmac = (k: string | Buffer, d: string) => createHmac("sha256", k).update(d).digest();

async function putS3(key: string, body: Buffer, contentType: string) {
  const { S3_ENDPOINT: ep, S3_BUCKET: bucket, S3_ACCESS_KEY_ID: ak, S3_SECRET_ACCESS_KEY: sk, S3_PUBLIC_URL: pub } = process.env;
  const region = process.env.S3_REGION || "auto";
  if (!ep || !bucket || !ak || !sk || !pub) throw new ApiError(500, "تخزين الصور غير مُعد. راجع إعدادات S3 في README");
  const host = new URL(ep).host;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = sha(body);
  const uri = "/" + [bucket, ...key.split("/")].map(encodeURIComponent).join("/");
  const headers = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signed = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonical = ["PUT", uri, "", headers, signed, payloadHash].join("\n");
  const scope = `${date}/${region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha(canonical)].join("\n");
  const kSigning = hmac(hmac(hmac(hmac("AWS4" + sk, date), region), "s3"), "aws4_request");
  const signature = createHmac("sha256", kSigning).update(toSign).digest("hex");
  const res = await fetch(`${ep.replace(/\/$/, "")}${uri}`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${ak}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
    },
    body: new Uint8Array(body),
  });
  if (!res.ok) throw new ApiError(502, "تعذر رفع الصورة إلى خدمة التخزين");
  return `${pub.replace(/\/$/, "")}/${key}`;
}

/** Resizes to max 1600px and converts to WebP when sharp is available; otherwise keeps the original bytes. */
async function optimize(buf: Buffer, type: { ext: string; mime: string }) {
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    return { buf: out, ext: "webp", mime: "image/webp" };
  } catch {
    return { buf, ...type };
  }
}

export async function saveImage(file: File, folder = "products"): Promise<string> {
  if (file.size > MAX_BYTES) throw new ApiError(400, "حجم الصورة أكبر من ٥ ميجابايت");
  const raw = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImage(raw);
  if (!sniffed) throw new ApiError(400, "الملف ليس صورة مدعومة (JPG أو PNG أو WEBP)");
  const { buf, ...type } = await optimize(raw, sniffed);
  const key = `${folder}/${randomUUID()}.${type.ext}`;
  if ((process.env.STORAGE_DRIVER ?? "local") === "s3") return putS3(key, buf, type.mime);
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_UPLOADS !== "1")
    throw new ApiError(500, "في الإنتاج استخدم STORAGE_DRIVER=s3 (الاستضافة لا تحفظ ملفات محلية)");
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", "uploads", key), buf);
  return `/uploads/${key}`;
}
