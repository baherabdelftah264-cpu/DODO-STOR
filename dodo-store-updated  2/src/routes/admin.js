// راوتس لوحة التحكم — كلها محمية بكلمة السر
const express = require("express");
const router = express.Router();
const db = require("../db");
const { adminAuth } = require("../middleware");
const { saveImage, removeImage } = require("../upload");
const {
  ORDER_STATUSES, validateProduct, validateCategoryName, validateSettings,
} = require("../validate");

router.use(adminAuth);

router.get("/ping", (req, res) => res.json({ ok: true }));

// ---------- الطلبات ----------
router.get("/orders", (req, res) => res.json([...db.data.orders].reverse())); // الأحدث الأول

router.patch("/orders/:id", (req, res) => {
  const order = db.data.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: "الطلب غير موجود" });
  if (!ORDER_STATUSES.includes(req.body.status)) return res.status(400).json({ error: "حالة غير صحيحة" });
  order.status = req.body.status;
  db.save();
  res.json(order);
});

// ---------- رفع صورة ----------
// المتصفح بيبعت الصورة نفسها (مصغّرة) في الـ body
router.post("/upload", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "4mb" }), (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: "مفيش صورة" });
  const path = saveImage(req.body);
  if (!path) return res.status(400).json({ error: "الملف ده مش صورة صالحة" });
  res.status(201).json({ path });
});

// ---------- المنتجات (بتشمل المخفية) ----------
router.get("/products", (req, res) => res.json([...db.data.products].reverse()));

router.post("/products", (req, res) => {
  const { errors, value } = validateProduct(req.body || {}, db.data.categories);
  if (errors.length) return res.status(400).json({ error: errors[0] });
  const product = { id: db.nextId("product"), ...value };
  db.data.products.push(product);
  db.save();
  res.status(201).json(product);
});

router.put("/products/:id", (req, res) => {
  const p = db.data.products.find((x) => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: "المنتج غير موجود" });
  const { errors, value } = validateProduct(req.body || {}, db.data.categories, true);
  if (errors.length) return res.status(400).json({ error: errors[0] });
  const oldImage = p.image;
  Object.assign(p, value);
  db.save();
  if (oldImage && oldImage !== p.image) removeImage(oldImage, db.data.products);
  res.json(p);
});

router.delete("/products/:id", (req, res) => {
  const i = db.data.products.findIndex((x) => x.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: "المنتج غير موجود" });
  const [removed] = db.data.products.splice(i, 1);
  db.save();
  removeImage(removed.image, db.data.products);
  res.json({ ok: true });
});

// ---------- الأقسام ----------
router.get("/categories", (req, res) => res.json(db.data.categories));

router.post("/categories", (req, res) => {
  const { error, value } = validateCategoryName((req.body || {}).name);
  if (error) return res.status(400).json({ error });
  const cat = { id: db.nextId("category"), name: value };
  db.data.categories.push(cat);
  db.save();
  res.status(201).json(cat);
});

router.put("/categories/:id", (req, res) => {
  const cat = db.data.categories.find((c) => c.id === Number(req.params.id));
  if (!cat) return res.status(404).json({ error: "القسم غير موجود" });
  const { error, value } = validateCategoryName((req.body || {}).name);
  if (error) return res.status(400).json({ error });
  cat.name = value;
  db.save();
  res.json(cat);
});

router.delete("/categories/:id", (req, res) => {
  const id = Number(req.params.id);
  const i = db.data.categories.findIndex((c) => c.id === id);
  if (i === -1) return res.status(404).json({ error: "القسم غير موجود" });
  if (db.data.products.some((p) => p.catId === id)) {
    return res.status(400).json({ error: "في منتجات جوه القسم ده، انقليها لقسم تاني أو احذفيها الأول" });
  }
  db.data.categories.splice(i, 1);
  db.save();
  res.json({ ok: true });
});

// ---------- إعدادات المتجر ----------
router.get("/settings", (req, res) => res.json(db.data.settings));

router.put("/settings", (req, res) => {
  const { errors, value } = validateSettings(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors[0] });
  Object.assign(db.data.settings, value);
  db.save();
  res.json(db.data.settings);
});

module.exports = router;
