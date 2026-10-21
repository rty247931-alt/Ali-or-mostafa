// One command to prepare everything:  npm install && npm run setup
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import readline from "node:readline";

const win = process.platform === "win32";
const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: win, env: { ...process.env, ...env } });
  if (r.status !== 0) { console.error(`\n❌ فشلت الخطوة: ${cmd} ${args.join(" ")}`); process.exit(1); }
};
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));
const askHidden = (q) => new Promise((res) => {
  const out = process.stdout; let muted = false;
  rl._writeToOutput = (s) => { if (!muted) out.write(s); else if (s.includes("\n")) out.write("\n"); };
  rl.question(q, (a) => { muted = false; res(a); }); muted = true;
});

function readEnv() {
  const o = {};
  for (const l of readFileSync(".env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?(.*?)"?$/); if (m) o[m[1]] = m[2]; }
  return o;
}
function setEnv(key, value) {
  let t = readFileSync(".env", "utf8");
  const line = `${key}="${value}"`;
  t = new RegExp(`^${key}=.*$`, "m").test(t) ? t.replace(new RegExp(`^${key}=.*$`, "m"), line) : t + `\n${line}\n`;
  writeFileSync(".env", t);
}

console.log("\n=== إعداد متجر خُطوة ===\n");
if (!existsSync(".env")) copyFileSync(".env.example", ".env");
let env = readEnv();

if (!env.DATABASE_URL || env.DATABASE_URL.includes("USER:PASSWORD")) {
  const url = (await ask("رابط قاعدة بيانات PostgreSQL (DATABASE_URL): ")).trim();
  if (!url.startsWith("postgres")) { console.error("الرابط يجب أن يبدأ بـ postgresql://"); process.exit(1); }
  setEnv("DATABASE_URL", url);
}
if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) { setEnv("SESSION_SECRET", randomBytes(48).toString("base64")); console.log("✔ تم إنشاء SESSION_SECRET تلقائيًا"); }
if (!env.SITE_URL || env.SITE_URL === "http://localhost:3000") {
  const u = (await ask("رابط الموقع النهائي (Enter لـ http://localhost:3000): ")).trim();
  if (u) setEnv("SITE_URL", u);
}

console.log("\n1/4 تجهيز Prisma…");
run("npx", ["prisma", "generate"]);
console.log("\n2/4 إنشاء جداول قاعدة البيانات…");
if (existsSync("prisma/migrations")) run("npx", ["prisma", "migrate", "deploy"]);
else run("npx", ["prisma", "migrate", "dev", "--name", "init"]);
run("npx", ["prisma", "db", "execute", "--file", "prisma/constraints.sql", "--schema", "prisma/schema.prisma"]);
console.log("\n3/4 إدخال البيانات الأساسية (الأدوار، الأقسام، مناطق الشحن، الصفحات)…");
run("npx", ["tsx", "prisma/seed.ts"]);

console.log("\n4/4 حساب المالك");
const make = (await ask("إنشاء حساب المالك الآن؟ (y/n): ")).trim().toLowerCase();
if (make === "y") {
  const name = (await ask("الاسم: ")).trim();
  const email = (await ask("البريد الإلكتروني: ")).trim();
  const p1 = await askHidden("كلمة المرور (١٢ حرفًا على الأقل): ");
  const p2 = await askHidden("أعد كتابتها: ");
  if (p1 !== p2) { console.error("كلمتا المرور غير متطابقتين"); process.exit(1); }
  run("npx", ["tsx", "scripts/create-owner.ts"], { OWNER_NAME: name, OWNER_EMAIL: email, OWNER_PASSWORD: p1 });
}
rl.close();
console.log("\n✅ تم الإعداد. شغّل المتجر: npm run dev   (أو للإنتاج: npm run build && npm start)\nالإدارة: /admin/login\n");
