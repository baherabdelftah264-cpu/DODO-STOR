/* =========================================================
   لوحة تحكم دودو ستور
   الطلبات | المنتجات (مع رفع الصور) | الأقسام | الإعدادات
   ========================================================= */
(() => {
  const $ = (id) => document.getElementById(id);
  const STATUS = { new: "جديد", confirmed: "تم التأكيد", shipped: "في الطريق", delivered: "تم التسليم", cancelled: "ملغي" };
  const UNITS = ["كيلو", "نصف كيلو", "ربع كيلو", "قطعة", "عبوة", "علبة", "كرتونة", "دستة", "لتر"];
  const money = (n) => (Number.isInteger(n) ? n : n.toFixed(2)) + " ج.م";

  // بيبني عنصر HTML بأمان (كل النصوص بتتحط كنص مش كود)
  function el(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") e.className = v;
      else if (k === "style") e.style.cssText = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k in e) e[k] = v;
      else e.setAttribute(k, v);
    }
    kids.flat().forEach((c) => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); });
    return e;
  }

  let KEY = localStorage.getItem("dodoKey") || "";
  let tab = "orders";
  let data = { orders: [], products: [], categories: [], settings: {} };
  let orderFilter = "all";
  let productSearch = "";
  let timer;

  function toast(msg) {
    const t = el("div", { class: "toast" }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 2200);
  }

  async function api(path, method = "GET", body) {
    const res = await fetch("/api/admin" + path, {
      method,
      headers: { "Content-Type": "application/json", "x-admin-key": KEY },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const out = await res.json().catch(() => ({}));
    if (res.status === 401) { logout(); throw new Error("كلمة السر غلط"); }
    if (!res.ok) throw new Error(out.error || "حصل خطأ");
    return out;
  }
  const guard = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast("⚠️ " + e.message); } };

  /* ---------- الدخول ---------- */
  async function login() {
    KEY = $("key").value || KEY;
    $("loginErr").textContent = "";
    const res = await fetch("/api/admin/ping", { headers: { "x-admin-key": KEY } }).catch(() => null);
    if (!res) { $("loginErr").textContent = "مفيش اتصال بالسيرفر"; return; }
    if (!res.ok) { $("loginErr").textContent = (await res.json().catch(() => ({}))).error || "حصل خطأ"; return; }
    localStorage.setItem("dodoKey", KEY);
    $("login").hidden = true;
    $("app").hidden = false;
    await refreshAll();
    draw();
    timer = setInterval(() => { loadOrders().then(() => { updateBadge(); if (tab === "orders" && !document.querySelector(".modal")) drawView(); }).catch(() => {}); }, 30000);
  }
  function logout() {
    localStorage.removeItem("dodoKey");
    clearInterval(timer);
    location.reload();
  }

  /* ---------- تحميل البيانات ---------- */
  const loadOrders = async () => { data.orders = await api("/orders"); };
  async function refreshAll() {
    [data.orders, data.products, data.categories, data.settings] = await Promise.all([
      api("/orders"), api("/products"), api("/categories"), api("/settings"),
    ]);
  }
  const newCount = () => data.orders.filter((o) => o.status === "new").length;
  function updateBadge() {
    const n = newCount();
    document.title = (n ? `(${n}) ` : "") + "لوحة تحكم دودو ستور";
    drawTabs();
  }

  /* ---------- الهيكل ---------- */
  function drawTabs() {
    const tabs = [["orders", "الطلبات"], ["products", "المنتجات"], ["cats", "الأقسام"], ["settings", "الإعدادات"]];
    $("tabs").replaceChildren(...tabs.map(([id, name]) =>
      el("button", { class: id === tab ? "on" : "", onclick: () => { tab = id; draw(); } },
        name, id === "orders" && newCount() ? el("span", { class: "badge" }, newCount()) : null)));
  }
  function draw() { drawTabs(); drawView(); window.scrollTo(0, 0); }
  function drawView() {
    const v = { orders: viewOrders, products: viewProducts, cats: viewCategories, settings: viewSettings }[tab]();
    $("view").replaceChildren(...v);
  }

  /* ---------- الطلبات ---------- */
  const waLink = (phone, text = "") => {
    let d = String(phone).replace(/\D/g, "");
    if (d.startsWith("0")) d = "20" + d.slice(1);
    return `https://wa.me/${d}` + (text ? `?text=${encodeURIComponent(text)}` : "");
  };

  function viewOrders() {
    const filters = [["all", "الكل"], ...Object.entries(STATUS)];
    const list = data.orders.filter((o) => orderFilter === "all" || o.status === orderFilter);
    return [
      el("div", { class: "chips" }, filters.map(([k, name]) =>
        el("button", { class: "chip" + (k === orderFilter ? " on" : ""), onclick: () => { orderFilter = k; drawView(); } }, name))),
      !list.length ? el("p", { class: "muted" }, "مفيش طلبات هنا") : null,
      ...list.map((o) => {
        const sel = el("select", { onchange: guard(async () => { await api("/orders/" + o.id, "PATCH", { status: sel.value }); o.status = sel.value; updateBadge(); toast("اتحدثت الحالة ✅"); }) },
          Object.entries(STATUS).map(([v, t]) => el("option", { value: v, selected: v === o.status }, t)));
        sel.style.marginBottom = "0";
        return el("div", { class: "card" },
          el("div", { class: "row" },
            el("b", { class: "grow" }, `طلب #${o.id} — ${money(o.total)}`),
            el("span", { class: "tag" }, STATUS[o.status])),
          el("div", { class: "muted" }, new Date(o.createdAt).toLocaleString("ar-EG")),
          el("div", {}, `👤 ${o.customer.name}`),
          el("div", {}, `📍 ${o.customer.governorate || "—"} — ${o.customer.address}`),
          el("div", {}, `💳 طريقة الدفع: ${{ cod: "الدفع عند الاستلام", vodafone_cash: "فودافون كاش", instapay: "إنستا باي", visa: "فيزا" }[o.paymentMethod || o.customer.paymentMethod] || "غير محددة"}`),
          o.customer.notes ? el("div", {}, `📝 ${o.customer.notes}`) : null,
          el("ul", { class: "items" }, o.items.map((i) => el("li", {}, `${i.name} × ${i.qty} (${i.unit}) = ${money(i.price * i.qty)}`))),
          el("div", { class: "muted" }, `المجموع ${money(o.subtotal)} + الشحن ${money(o.shipping)}`),
          el("div", { class: "row", style: "margin-top:8px" },
            el("a", { class: "btn sm", href: "tel:" + o.customer.phone, style: "text-decoration:none" }, "📞 اتصال"),
            el("a", { class: "btn mauve sm", href: waLink(o.customer.phone, `أهلاً ${o.customer.name}، بخصوص طلبك رقم ${o.id} من ${data.settings.shopName}`), target: "_blank", rel: "noopener", style: "text-decoration:none" }, "💬 واتساب"),
            el("div", { class: "grow" }, sel)));
      }),
    ];
  }

  /* ---------- المنتجات ---------- */
  function viewProducts() {
    const q = productSearch.trim().toLowerCase();
    const list = data.products.filter((p) => !q || p.name.toLowerCase().includes(q));
    const catName = (id) => (data.categories.find((c) => c.id === id) || {}).name || "—";
    const search = el("input", { placeholder: "🔍 ابحث في منتجاتك", value: productSearch, oninput: (e) => { productSearch = e.target.value; const pos = e.target.selectionStart; drawView(); const i = $("view").querySelector("input"); i.focus(); i.setSelectionRange(pos, pos); } });
    return [
      search,
      !list.length ? el("p", { class: "muted" }, "مفيش منتجات، دوسي على زرار ➕ إضافة منتج") : null,
      ...list.map((p) => el("div", { class: "card row" },
        el("div", { class: "thumb" }, p.image ? el("img", { src: p.image, alt: "" }) : "🧺"),
        el("div", { class: "grow" },
          el("b", {}, p.name),
          el("div", {}, `${money(p.price)} / ${p.unit}`),
          el("div", {}, el("span", { class: "tag" }, catName(p.catId)), " ", p.inStock ? null : el("span", { class: "tag off" }, "مخفي"))),
        el("div", { style: "display:flex;flex-direction:column;gap:6px" },
          el("button", { class: "btn sm", onclick: () => productForm(p) }, "✏️ تعديل"),
          el("button", { class: "btn gray sm", onclick: guard(async () => { await api("/products/" + p.id, "PUT", { inStock: !p.inStock }); p.inStock = !p.inStock; drawView(); }) }, p.inStock ? "إخفاء" : "إظهار"),
          el("button", { class: "btn red sm", onclick: guard(async () => { if (!confirm(`متأكدة إنك عايزة تحذفي "${p.name}"؟`)) return; await api("/products/" + p.id, "DELETE"); data.products = data.products.filter((x) => x.id !== p.id); drawView(); toast("اتحذف"); }) }, "حذف")))),
      el("button", { class: "btn mauve fab", onclick: () => productForm(null) }, "➕ إضافة منتج"),
    ];
  }

  // تصغير الصورة قبل رفعها (صور الموبايل بتبقى كبيرة جداً)
  async function resizeImage(file, max = 1000) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("تعذّر قراءة الصورة"))), "image/jpeg", 0.85));
  }
  async function uploadImage(file) {
    const blob = await resizeImage(file);
    const res = await fetch("/api/admin/upload", { method: "POST", headers: { "Content-Type": "image/jpeg", "x-admin-key": KEY }, body: blob });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || "فشل رفع الصورة");
    return out.path;
  }

  function closeModal() { const m = document.querySelector(".modal"); if (m) m.remove(); }

  function productForm(p) {
    let image = p ? p.image : "";
    const preview = el("div", { class: "thumb" });
    const showPreview = () => preview.replaceChildren(image ? el("img", { src: image, alt: "" }) : "🧺");
    showPreview();
    const status = el("div", { class: "muted" }, "");
    const file = el("input", { type: "file", accept: "image/*", hidden: true, onchange: guard(async () => {
      if (!file.files[0]) return;
      status.textContent = "⏳ جاري رفع الصورة...";
      try { image = await uploadImage(file.files[0]); showPreview(); status.textContent = "✅ اترفعت"; }
      catch (e) { status.textContent = ""; throw e; }
    }) });

    const name = el("input", { value: p ? p.name : "", placeholder: "مثال: جبنة رومي" });
    const price = el("input", { type: "number", inputMode: "decimal", min: "0", step: "any", value: p ? p.price : "", placeholder: "السعر بالجنيه" });
    const unit = el("select", {}, UNITS.map((u) => el("option", { value: u, selected: p ? p.unit === u : u === "كيلو" }, u)));
    if (p && !UNITS.includes(p.unit)) unit.append(el("option", { value: p.unit, selected: true }, p.unit));
    const cat = el("select", {}, data.categories.map((c) => el("option", { value: c.id, selected: p && p.catId === c.id }, c.name)));
    const desc = el("textarea", { rows: 3, placeholder: "وصف قصير (اختياري)" }, p ? p.desc : "");
    desc.value = p ? p.desc : "";
    const visible = el("input", { type: "checkbox", checked: p ? p.inStock : true, style: "width:auto;margin:0 0 0 8px" });

    const save = el("button", { class: "btn", style: "flex:1", onclick: guard(async () => {
      const body = { name: name.value, price: price.value, unit: unit.value, catId: Number(cat.value), desc: desc.value, image, inStock: visible.checked };
      save.disabled = true;
      try {
        if (p) { Object.assign(p, await api("/products/" + p.id, "PUT", body)); }
        else { data.products.unshift(await api("/products", "POST", body)); }
      } finally { save.disabled = false; }
      closeModal(); drawView(); toast("اتحفظ ✅");
    }) }, "حفظ");

    const modal = el("div", { class: "modal", onclick: (e) => { if (e.target === modal) closeModal(); } },
      el("div", {},
        el("h3", { style: "margin-top:0" }, p ? "تعديل منتج" : "منتج جديد"),
        el("div", { class: "uploader" }, preview,
          el("div", {}, el("button", { class: "btn mauve", type: "button", onclick: () => file.click() }, "📷 اختاري صورة"), file, status)),
        el("label", {}, "اسم المنتج"), name,
        el("label", {}, "السعر"), price,
        el("label", {}, "السعر ده لكل"), unit,
        el("label", {}, "القسم"), cat,
        el("label", {}, "الوصف"), desc,
        el("label", { style: "display:flex;align-items:center;margin-bottom:14px" }, visible, "ظاهر للعملاء"),
        el("div", { class: "row" }, save, el("button", { class: "btn gray", onclick: closeModal }, "إلغاء"))));
    document.body.append(modal);
  }

  /* ---------- الأقسام ---------- */
  function viewCategories() {
    const add = el("input", { placeholder: "اسم قسم جديد، مثال: ألبان" });
    return [
      el("div", { class: "card" },
        el("div", { class: "row" }, el("div", { class: "grow" }, add),
          el("button", { class: "btn", style: "margin-bottom:10px", onclick: guard(async () => {
            data.categories.push(await api("/categories", "POST", { name: add.value })); drawView(); toast("اتضاف ✅");
          }) }, "➕ إضافة"))),
      ...data.categories.map((c) => el("div", { class: "card row" },
        el("b", { class: "grow" }, c.name),
        el("span", { class: "muted" }, `${data.products.filter((p) => p.catId === c.id).length} منتج`),
        el("button", { class: "btn sm", onclick: guard(async () => {
          const n = prompt("الاسم الجديد للقسم:", c.name);
          if (!n || n === c.name) return;
          Object.assign(c, await api("/categories/" + c.id, "PUT", { name: n })); drawView();
        }) }, "✏️ تغيير الاسم"),
        el("button", { class: "btn red sm", onclick: guard(async () => {
          if (!confirm(`حذف قسم "${c.name}"؟`)) return;
          await api("/categories/" + c.id, "DELETE"); data.categories = data.categories.filter((x) => x.id !== c.id); drawView();
        }) }, "حذف"))),
    ];
  }

  /* ---------- الإعدادات ---------- */
  function viewSettings() {
    const s = data.settings;
    const f = {
      shopName: el("input", { value: s.shopName }),
      phone: el("input", { type: "tel", value: s.phone, placeholder: "01xxxxxxxxx" }),
      whatsapp: el("input", { type: "tel", value: s.whatsapp, placeholder: "01xxxxxxxxx" }),
      shippingFee: el("input", { type: "number", min: "0", value: s.shippingFee }),
      freeShippingFrom: el("input", { type: "number", min: "0", value: s.freeShippingFrom }),
      minOrder: el("input", { type: "number", min: "0", value: s.minOrder }),
      announcement: el("input", { value: s.announcement, placeholder: "مثال: عرض الجمعة: خصم على الأجبان" }),
    };
    const open = el("input", { type: "checkbox", checked: s.acceptingOrders, style: "width:auto;margin:0 0 0 8px" });
    const L = (t, k, hint) => [el("label", {}, t), f[k], hint ? el("div", { class: "hint" }, hint) : null];
    return [el("div", { class: "card" },
      ...L("اسم المتجر", "shopName"),
      ...L("رقم التليفون (بيظهر للعملاء)", "phone"),
      ...L("رقم الواتساب", "whatsapp", "بيظهر زرار واتساب للعملاء. سيبيه فاضي لو مش عايزاه."),
      ...L("سعر الشحن (ج.م)", "shippingFee"),
      ...L("الشحن مجاني من (ج.م)", "freeShippingFrom", "اكتبي 0 لو مفيش شحن مجاني."),
      ...L("أقل قيمة للطلب (ج.م)", "minOrder", "اكتبي 0 لو مفيش حد أدنى."),
      ...L("شريط إعلان أعلى الصفحة", "announcement", "سيبيه فاضي لو مش عايزة إعلان."),
      el("label", { style: "display:flex;align-items:center;margin-bottom:14px" }, open, "المتجر بيستقبل طلبات (شيلي العلامة لو هتقفلي مؤقتاً)"),
      el("button", { class: "btn", style: "width:100%", onclick: guard(async () => {
        const body = Object.fromEntries(Object.entries(f).map(([k, i]) => [k, i.value]));
        body.acceptingOrders = open.checked;
        data.settings = await api("/settings", "PUT", body);
        toast("اتحفظت الإعدادات ✅"); drawView();
      }) }, "حفظ الإعدادات"))];
  }

  /* ---------- التشغيل ---------- */
  $("loginBtn").addEventListener("click", guard(login));
  $("key").addEventListener("keydown", (e) => { if (e.key === "Enter") guard(login)(); });
  $("logout").addEventListener("click", logout);
  if (KEY) guard(login)();
})();
