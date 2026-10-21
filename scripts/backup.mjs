// npm run backup   -> backups/db-<date>.dump   (needs pg_dump from PostgreSQL client tools)
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";

let url = process.env.DATABASE_URL;
if (!url && existsSync(".env")) url = readFileSync(".env", "utf8").match(/^DATABASE_URL="?(.*?)"?$/m)?.[1];
if (!url) { console.error("DATABASE_URL غير موجود"); process.exit(1); }
mkdirSync("backups", { recursive: true });
const file = `backups/db-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;
const r = spawnSync("pg_dump", ["--format=custom", "--no-owner", "--file", file, url], { stdio: "inherit" });
if (r.error || r.status !== 0) { console.error("فشل النسخ. ثبّت أدوات PostgreSQL (pg_dump) أو استخدم النسخ التلقائي في Neon/Supabase."); process.exit(1); }
console.log(`✔ تم حفظ النسخة: ${file}`);
