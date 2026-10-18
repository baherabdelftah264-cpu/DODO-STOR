// التحقق من البيانات الجاية من الزوار ومن لوحة التحكم — مفيش حاجة بتتصدّق من المتصفح
const { IMG_PATH_RE } = require("./upload");

const ORDER_STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"];

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bool = (v) => v === true || v === "true" || v === 1 || v === "1";
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// ---------- الطلبات ----------
function validateOrder(body, products) {
  const errors = [];
  const customer = {
    name: str(body.name, 100),
    phone: str(body.phone, 20),
    address: str(body.address, 300),
    governorate: str(body.governorate, 30),
    paymentMethod: str(body.paymentMethod, 30),
    notes: str(body.notes, 300),
  };
  if (customer.name.length < 2) errors.push("اكتب الاسم");
  if (!/^[0-9+\s-]{8,15}$/.test(customer.phone)) errors.push("رقم التليفون غير صحيح");
  if (customer.address.length < 5) errors.push("اكتب العنوان بالتفصيل");
  if (!["الفيوم", "القاهرة"].includes(customer.governorate)) errors.push("التوصيل متاح داخل الفيوم والقاهرة فقط");
  if (!["cod", "vodafone_cash", "instapay", "visa"].includes(customer.paymentMethod)) errors.push("اختار طريقة الدفع");

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0 || rawItems.length > 60) errors.push("السلة فاضية");

  // بنجمّع المنتجات المتكررة، وبناخد الاسم والسعر من عندنا إحنا مش من المتصفح
  const merged = new Map();
  for (const it of rawItems) {
    const id = Number(it && it.id);
    const qty = Number(it && it.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) { errors.push("كمية غير صحيحة"); break; }
    const p = products.find((x) => x.id === id);
    if (!p || !p.inStock) { errors.push("فيه منتج في السلة مبقاش متاح، حدّث الصفحة"); break; }
    merged.set(id, (merged.get(id) || 0) + qty);
  }
  const items = [...merged].map(([id, qty]) => {
    const p = products.find((x) => x.id === id);
    return { id, name: p.name, price: p.price, unit: p.unit, qty };
  });
  return { errors, customer, items };
}

// ---------- المنتجات ----------
function validateProduct(body, categories, partial = false) {
  const errors = [];
  const out = {};
  if (!partial || has(body, "name")) {
    out.name = str(body.name, 120);
    if (out.name.length < 2) errors.push("اسم المنتج مطلوب");
  }
  if (!partial || has(body, "price")) {
    out.price = Number(body.price);
    if (!Number.isFinite(out.price) || out.price <= 0 || out.price > 1000000) errors.push("السعر غير صحيح");
    else out.price = Math.round(out.price * 100) / 100;
  }
  if (!partial || has(body, "unit")) out.unit = str(body.unit, 20) || "قطعة";
  if (!partial || has(body, "catId")) {
    out.catId = Number(body.catId);
    if (!categories.some((c) => c.id === out.catId)) errors.push("اختار القسم");
  }
  if (!partial || has(body, "desc")) out.desc = str(body.desc, 1000);
  if (!partial || has(body, "image")) {
    out.image = str(body.image, 100);
    if (out.image && !IMG_PATH_RE.test(out.image)) errors.push("الصورة غير صحيحة");
  }
  if (has(body, "inStock")) out.inStock = bool(body.inStock);
  else if (!partial) out.inStock = true;
  return { errors, value: out };
}

// ---------- الأقسام ----------
function validateCategoryName(name) {
  const v = str(name, 40);
  return v.length < 2 ? { error: "اسم القسم مطلوب" } : { value: v };
}

// ---------- إعدادات المتجر ----------
function validateSettings(body) {
  const errors = [];
  const out = {};
  const money = (key, label, max) => {
    if (!has(body, key)) return;
    const n = Number(body[key]);
    if (!Number.isFinite(n) || n < 0 || n > max) errors.push(label + " غير صحيح");
    else out[key] = n;
  };
  if (has(body, "shopName")) {
    out.shopName = str(body.shopName, 60);
    if (!out.shopName) errors.push("اسم المتجر مطلوب");
  }
  if (has(body, "phone")) {
    out.phone = str(body.phone, 20);
    if (out.phone && !/^[0-9+\s-]{8,20}$/.test(out.phone)) errors.push("رقم التليفون غير صحيح");
  }
  if (has(body, "whatsapp")) {
    let d = str(body.whatsapp, 20).replace(/\D/g, "");
    if (d.startsWith("0")) d = "20" + d.slice(1); // رقم مصري محلي → دولي
    if (d && (d.length < 10 || d.length > 15)) errors.push("رقم الواتساب غير صحيح");
    else out.whatsapp = d;
  }
  money("shippingFee", "سعر الشحن", 5000);
  money("freeShippingFrom", "حد الشحن المجاني", 1000000);
  money("minOrder", "الحد الأدنى للطلب", 1000000);
  if (has(body, "acceptingOrders")) out.acceptingOrders = bool(body.acceptingOrders);
  if (has(body, "announcement")) out.announcement = str(body.announcement, 150);
  return { errors, value: out };
}

module.exports = { ORDER_STATUSES, validateOrder, validateProduct, validateCategoryName, validateSettings };
