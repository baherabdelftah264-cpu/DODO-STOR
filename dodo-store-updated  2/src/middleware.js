// ميدل وير = كود صغير بيشتغل على كل طلب قبل ما يوصل للراوت
const crypto = require("crypto");
const { ADMIN_KEY } = require("./config");

const keyIsSet = () => ADMIN_KEY && ADMIN_KEY !== "change-me";

// محاولات الدخول الغلط لكل جهاز (حماية من تخمين كلمة السر)
const fails = new Map();
setInterval(() => fails.clear(), 15 * 60 * 1000).unref();

function adminAuth(req, res, next) {
  if (!keyIsSet()) return res.status(503).json({ error: "لوحة التحكم مقفولة: اظبط ADMIN_KEY في ملف .env" });
  if ((fails.get(req.ip) || 0) >= 10) return res.status(429).json({ error: "محاولات كتير، جرّب بعد 15 دقيقة" });

  const given = Buffer.from(String(req.get("x-admin-key") || ""));
  const real = Buffer.from(ADMIN_KEY);
  const ok = given.length === real.length && crypto.timingSafeEqual(given, real);
  if (!ok) {
    fails.set(req.ip, (fails.get(req.ip) || 0) + 1);
    return res.status(401).json({ error: "كلمة السر غلط" });
  }
  next();
}

// تحديد عدد الطلبات من نفس الجهاز (حماية من السبام)
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();
  return (req, res, next) => {
    const n = (hits.get(req.ip) || 0) + 1;
    hits.set(req.ip, n);
    if (n > max) return res.status(429).json({ error: "طلبات كتير، جرّب بعد شوية" });
    next();
  };
}

function securityHeaders(req, res, next) {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
  });
  next();
}

module.exports = { adminAuth, rateLimit, securityHeaders, keyIsSet };
