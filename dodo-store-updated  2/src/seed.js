// بيانات البداية — بتتحمّل مرة واحدة أول ما السيرفر يشتغل
// المنتجات التجريبية مكتوب جنبها "(منتج تجريبي)" — احذفيها من لوحة التحكم بعد ما تضيفي منتجاتك
module.exports = {
  settings: {
    shopName: "دودو ستور",
    phone: "01099362407",
    whatsapp: "201099362407",
    shippingFee: 30,
    freeShippingFrom: 500,
    minOrder: 0,
    acceptingOrders: true,
    announcement: "",
  },
  categories: [
    { id: 1, name: "أجبان" },
    { id: 2, name: "سجق ومصنعات" },
    { id: 3, name: "منتجات منزلية" },
  ],
  products: [
    { id: 1, name: "جبنة رومي (منتج تجريبي)", price: 280, unit: "كيلو", catId: 1, desc: "منتج تجريبي لتجربة الشكل. احذفه من لوحة التحكم.", image: "", inStock: true },
    { id: 2, name: "سجق بلدي (منتج تجريبي)", price: 220, unit: "كيلو", catId: 2, desc: "منتج تجريبي لتجربة الشكل. احذفه من لوحة التحكم.", image: "", inStock: true },
    { id: 3, name: "مربى مشمش (منتج تجريبي)", price: 60, unit: "علبة", catId: 3, desc: "منتج تجريبي لتجربة الشكل. احذفه من لوحة التحكم.", image: "", inStock: true },
  ],
  counters: { category: 3, product: 3, order: 0 },
};
