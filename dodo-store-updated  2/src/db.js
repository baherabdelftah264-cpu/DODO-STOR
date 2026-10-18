// قاعدة البيانات: ملف JSON واحد (db.json) — مناسب لمتجر صغير
const fs = require("fs");
const path = require("path");
const { DB_FILE, UPLOADS_DIR } = require("./config");
const seed = require("./seed");

let db;

function save() {
  // بنكتب في ملف مؤقت وبعدين نبدّله، عشان لو الكهربا قطعت الملف ما يبوظش
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function load() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    db.orders = db.orders || [];
    db.settings = { ...seed.settings, ...db.settings };
  } else {
    db = JSON.parse(JSON.stringify(seed));
    db.orders = [];
    save();
    console.log("✅ اتعملت قاعدة بيانات جديدة");
  }
}

// رقم جديد لكل نوع (قسم / منتج / طلب)
function nextId(kind) {
  db.counters[kind] += 1;
  return db.counters[kind];
}

load();

module.exports = {
  get data() { return db; },
  save,
  nextId,
};
