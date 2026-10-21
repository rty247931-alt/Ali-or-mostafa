// npm run restore -- backups/db-xxxx.dump   (REPLACES current data. Test on a spare database first.)
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const file = process.argv[2];
let url = process.env.DATABASE_URL;
if (!url && existsSync(".env")) url = readFileSync(".env", "utf8").match(/^DATABASE_URL="?(.*?)"?$/m)?.[1];
if (!file || !existsSync(file)) { console.error("استخدم: npm run restore -- <مسار ملف النسخة>"); process.exit(1); }
if (!url) { console.error("DATABASE_URL غير موجود"); process.exit(1); }
const r = spawnSync("pg_restore", ["--clean", "--if-exists", "--no-owner", "--dbname", url, file], { stdio: "inherit" });
process.exit(r.status ?? 1);
