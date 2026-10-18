// الراوتس العامة: أي زائر يقدر يشوفها
const router = require("express").Router();
const db = require("../db");

// بيانات المتجر كلها في طلب واحد: الإعدادات + الأقسام + المنتجات المتاحة
router.get("/store", (req, res) => {
  const s = db.data.settings;
  res.set("Cache-Control", "no-cache");
  res.json({
    settings: {
      shopName: s.shopName, phone: s.phone, whatsapp: s.whatsapp,
      shippingFee: s.shippingFee, freeShippingFrom: s.freeShippingFrom,
      minOrder: s.minOrder, acceptingOrders: s.acceptingOrders, announcement: s.announcement,
    },
    categories: db.data.categories,
    products: db.data.products.filter((p) => p.inStock).reverse(), // الأحدث الأول
  });
});

module.exports = router;
