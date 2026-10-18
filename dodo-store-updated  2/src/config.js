// الإعدادات: بيقرا ملف .env (لو موجود) ويطلّع القيم للباقي
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const envPath = path.join(ROOT, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// مكان حفظ قاعدة البيانات والصور المرفوعة (على الاستضافة لازم يكون على قرص دائم)
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  ADMIN_KEY: process.env.ADMIN_KEY || "",
  ROOT,
  DATA_DIR,
  DB_FILE: path.join(DATA_DIR, "db.json"),
  UPLOADS_DIR: path.join(DATA_DIR, "uploads"),
};
