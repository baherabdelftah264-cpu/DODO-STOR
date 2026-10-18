// استقبال الطلبات من العملاء
const router = require("express").Router();
const db = require("../db");
const { validateOrder } = require("../validate");

// POST /api/orders
router.post("/", (req, res) => {
  const s = db.data.settings;
  if (!s.acceptingOrders) return res.status(403).json({ error: "المتجر مش بيستقبل طلبات حالياً، جرّب بعد شوية" });

  const { errors, customer, items } = validateOrder(req.body || {}, db.data.products);
  if (errors.length) return res.status(400).json({ error: errors[0], errors });

  // الحساب كله بيتم هنا في السيرفر
  const subtotal = Math.round(items.reduce((sum, i) => sum + i.price * i.qty, 0) * 100) / 100;
  if (s.minOrder > 0 && subtotal < s.minOrder) {
    return res.status(400).json({ error: `الحد الأدنى للطلب ${s.minOrder} ج.م` });
  }
  const shipping = s.freeShippingFrom > 0 && subtotal >= s.freeShippingFrom ? 0 : s.shippingFee;

  const order = {
    id: db.nextId("order"),
    createdAt: new Date().toISOString(),
    status: "new",
    customer, paymentMethod: customer.paymentMethod, items, subtotal, shipping,
    total: subtotal + shipping,
  };
  db.data.orders.push(order);
  db.save();
  res.status(201).json({ id: order.id, total: order.total });
});

module.exports = router;
