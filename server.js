// نقطة البداية: ده الملف اللي بتشغّله (npm start)
const path = require("path");
const express = require("express");
const { PORT, UPLOADS_DIR } = require("./src/config");
const { rateLimit, securityHeaders, keyIsSet } = require("./src/middleware");

const app = express();
app.set("trust proxy", 1); // مهم لما تنشره على استضافة
app.use(securityHeaders);
app.use(express.json({ limit: "20kb" }));

// الـ API
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api", require("./src/routes/public"));
app.use("/api/orders", rateLimit({ windowMs: 60_000, max: 10 }), require("./src/routes/orders"));
app.use("/api/admin", rateLimit({ windowMs: 60_000, max: 120 }), require("./src/routes/admin"));
app.use("/api", (req, res) => res.status(404).json({ error: "المسار غير موجود" }));

// الصور المرفوعة + الفرونت
app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "7d", index: false }));
app.use(express.static(path.join(__dirname, "public")));

// أي خطأ غير متوقع
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "بيانات غير صحيحة" });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "الملف كبير جداً" });
  console.error(err);
  res.status(500).json({ error: "حصل خطأ في السيرفر" });
});

app.listen(PORT, () => {
  console.log(`🚀 المتجر شغال على http://localhost:${PORT}`);
  console.log(`🔐 لوحة التحكم: http://localhost:${PORT}/admin.html`);
  if (!keyIsSet()) console.warn("⚠️  ADMIN_KEY مش متظبط في ملف .env — لوحة التحكم مقفولة لحد ما تظبطه");
});
