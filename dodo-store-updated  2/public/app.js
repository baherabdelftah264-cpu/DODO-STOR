/* =========================================================
   دودو ستور — صفحة العملاء
   بتجيب كل حاجة (منتجات/أقسام/إعدادات) من السيرفر: GET /api/store
   ========================================================= */
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (Number.isInteger(n) ? n : n.toFixed(2)) + " ج.م";

  const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let store = { settings: {}, categories: [], products: [] };
  let cat = "all";
  let query = "";
  let cart = readJSON("dodoCart", []); // [{id, qty}]

  const byId = (id) => store.products.find((p) => p.id === id);
  const qtyOf = (id) => (cart.find((i) => i.id === id) || {}).qty || 0;
  const cartCount = () => cart.reduce((s, i) => s + i.qty, 0);

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------- السلة ---------- */
  function setQty(id, qty) {
    qty = Math.max(0, Math.min(99, qty));
    cart = cart.filter((i) => i.id !== id);
    if (qty > 0) cart.push({ id, qty });
    writeJSON("dodoCart", cart);
    $("cartCount").textContent = cartCount();
    refreshCard(id);
  }

  function totals() {
    const s = store.settings;
    const subtotal = cart.reduce((sum, i) => { const p = byId(i.id); return sum + (p ? p.price * i.qty : 0); }, 0);
    const free = s.freeShippingFrom > 0 && subtotal >= s.freeShippingFrom;
    const shipping = cart.length ? (free ? 0 : s.shippingFee || 0) : 0;
    return { subtotal, shipping, total: subtotal + shipping };
  }

  /* ---------- الكروت ---------- */
  function actHTML(p) {
    const q = qtyOf(p.id);
    if (!q) return `<button class="btn" data-add="${p.id}" type="button">أضف للسلة</button>`;
    return `<div class="stepper"><button data-inc="${p.id}" type="button">+</button><span>${q}</span><button data-dec="${p.id}" type="button">−</button></div>`;
  }
  const imgTag = (p) => (p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()">` : "");

  function renderGrid() {
    const q = query.trim().toLowerCase();
    const list = store.products.filter((p) => (cat === "all" || p.catId === cat) && (!q || p.name.toLowerCase().includes(q)));
    $("empty").hidden = list.length > 0;
    $("grid").innerHTML = list.map((p) => `
      <article class="card" data-card="${p.id}">
        <div class="pimg" data-open="${p.id}">${imgTag(p)}</div>
        <div class="cinfo">
          <div class="pname" data-open="${p.id}">${esc(p.name)}</div>
          <div class="pprice">${money(p.price)} <small>/ ${esc(p.unit)}</small></div>
          <div class="act">${actHTML(p)}</div>
        </div>
      </article>`).join("");
  }

  function refreshCard(id) {
    const p = byId(id);
    const card = document.querySelector(`[data-card="${id}"] .act`);
    if (p && card) card.innerHTML = actHTML(p);
    if (!$("sheet").hidden && $("sheetBody").dataset.view === "cart") renderCart();
  }

  function renderCats() {
    const chips = [{ id: "all", name: "الكل" }, ...store.categories.filter((c) => store.products.some((p) => p.catId === c.id))];
    $("cats").innerHTML = chips.map((c) => `<button class="chip ${c.id === cat ? "on" : ""}" data-cat="${c.id}" type="button">${esc(c.name)}</button>`).join("");
  }

  /* ---------- الشيت ---------- */
  function openSheet(html, view) {
    $("sheetBody").innerHTML = html;
    $("sheetBody").dataset.view = view;
    $("sheet").hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeSheet() {
    $("sheet").hidden = true;
    document.body.style.overflow = "";
  }

  function openProduct(id) {
    const p = byId(id);
    if (!p) return;
    let qty = qtyOf(id) || 1;
    const draw = () => {
      $("sheetBody").innerHTML = `
        <div class="sheet-head"><h2>${esc(p.name)}</h2><button class="x" data-close type="button">✕</button></div>
        <div class="big-img">${imgTag(p)}</div>
        <div class="pprice" style="font-size:22px">${money(p.price)} <small>/ ${esc(p.unit)}</small></div>
        ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ""}
        <div class="stepper" style="margin-bottom:12px"><button data-q="1" type="button">+</button><span>${qty}</span><button data-q="-1" type="button">−</button></div>
        <button class="btn" id="addNow" type="button">أضف للسلة — ${money(p.price * qty)}</button>`;
      $("sheetBody").querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => { qty = Math.max(1, Math.min(99, qty + Number(b.dataset.q))); draw(); }));
      $("addNow").addEventListener("click", () => { setQty(id, qty); closeSheet(); toast("تمت الإضافة للسلة ✅"); });
    };
    openSheet("", "product");
    draw();
  }

  function renderCart() {
    const s = store.settings;
    if (!cart.length) {
      openSheet(`<div class="sheet-head"><h2>🛒 سلتك</h2><button class="x" data-close type="button">✕</button></div>
        <p class="empty">السلة فاضية، ابدأ التسوق 🌿</p><button class="btn" data-close type="button">تصفح المنتجات</button>`, "cart");
      return;
    }
    const t = totals();
    const rows = cart.map((i) => {
      const p = byId(i.id);
      if (!p) return "";
      return `<div class="crow">
        <div class="thumb">${imgTag(p)}</div>
        <div><h4>${esc(p.name)}</h4><small>${money(p.price)} / ${esc(p.unit)}</small>
          <div class="stepper"><button data-inc="${p.id}" type="button">+</button><span>${i.qty}</span><button data-dec="${p.id}" type="button">−</button></div></div>
        <div class="line">${money(p.price * i.qty)}</div></div>`;
    }).join("");
    const c = readJSON("dodoCustomer", {});
    const belowMin = s.minOrder > 0 && t.subtotal < s.minOrder;
    const closed = s.acceptingOrders === false;
    const keepForm = $("sheetBody").dataset.view === "cart" && $("custName") ? {
      name: $("custName").value, phone: $("custPhone").value, address: $("custAddress").value, governorate: $("custGovernorate").value, paymentMethod: $("paymentMethod").value, notes: $("custNotes").value,
    } : null;
    const v = keepForm || c;
    openSheet(`
      <div class="sheet-head"><h2>🛒 سلتك</h2><button class="x" data-close type="button">✕</button></div>
      ${rows}
      <div class="sum">
        <div><span>المجموع</span><span>${money(t.subtotal)}</span></div>
        <div><span>الشحن</span><span>${t.shipping === 0 ? "مجاني 🎉" : money(t.shipping)}</span></div>
        <div class="tot"><span>الإجمالي</span><span>${money(t.total)}</span></div>
      </div>
      ${closed ? `<div class="warn">المتجر مش بيستقبل طلبات حالياً، جرّب بعد شوية.</div>` : ""}
      ${belowMin ? `<div class="warn">الحد الأدنى للطلب ${money(s.minOrder)}</div>` : ""}
      <div class="form">
        <input id="custName" placeholder="الاسم" maxlength="100" autocomplete="name" value="${esc(v.name || "")}">
        <input id="custPhone" type="tel" placeholder="رقم التليفون" maxlength="20" autocomplete="tel" value="${esc(v.phone || "")}">
        <select id="custGovernorate" aria-label="محافظة التوصيل">
          <option value="">اختار محافظة التوصيل</option>
          <option value="الفيوم" ${v.governorate === "الفيوم" ? "selected" : ""}>الفيوم</option>
          <option value="القاهرة" ${v.governorate === "القاهرة" ? "selected" : ""}>القاهرة</option>
        </select>
        <input id="custAddress" placeholder="العنوان بالتفصيل" maxlength="300" autocomplete="street-address" value="${esc(v.address || "")}">
        <select id="paymentMethod" aria-label="طريقة الدفع">
          <option value="cod" ${v.paymentMethod === "cod" ? "selected" : ""}>الدفع عند الاستلام</option>
          <option value="vodafone_cash" ${v.paymentMethod === "vodafone_cash" ? "selected" : ""}>فودافون كاش</option>
          <option value="instapay" ${v.paymentMethod === "instapay" ? "selected" : ""}>إنستا باي</option>
          <option value="visa" ${v.paymentMethod === "visa" ? "selected" : ""}>فيزا</option>
        </select>
        <div class="hint">للدفع الإلكتروني، هنتواصل معاك لتأكيد طريقة الدفع. ما تدخلش بيانات الفيزا هنا.</div>
        <input id="custNotes" placeholder="ملاحظات (اختياري)" maxlength="300" value="${esc(v.notes || "")}">
      </div>
      <div class="pay">💳 اختار طريقة الدفع المناسبة من القائمة. الدفع بالفيزا يحتاج بوابة دفع إلكترونية آمنة، لذلك لن نطلب رقم البطاقة هنا.</div>
      <button class="btn" id="checkout" type="button" ${closed || belowMin ? "disabled" : ""}>تأكيد الطلب — ${money(t.total)}</button>`, "cart");
    $("checkout").addEventListener("click", checkout);
  }

  async function checkout() {
    const body = {
      name: $("custName").value, phone: $("custPhone").value,
      address: $("custAddress").value, governorate: $("custGovernorate").value, paymentMethod: $("paymentMethod").value, notes: $("custNotes").value,
      items: cart,
    };
    const btn = $("checkout");
    btn.disabled = true;
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "حصل خطأ، جرّب تاني"); btn.disabled = false; return; }
      writeJSON("dodoCustomer", { name: body.name, phone: body.phone, address: body.address, governorate: body.governorate, paymentMethod: body.paymentMethod });
      const lines = cart.map((i) => { const p = byId(i.id); return p ? `• ${p.name} × ${i.qty}` : ""; }).filter(Boolean).join("\n");
      const paymentNames = { cod: "الدفع عند الاستلام", vodafone_cash: "فودافون كاش", instapay: "إنستا باي", visa: "فيزا" };
      const wa = store.settings.whatsapp
        ? `https://wa.me/${store.settings.whatsapp}?text=${encodeURIComponent(`طلب رقم ${data.id}\n${lines}\nالمحافظة: ${body.governorate}\nالعنوان: ${body.address}\nطريقة الدفع: ${paymentNames[body.paymentMethod] || body.paymentMethod}\nالإجمالي: ${data.total} ج.م`)}` : "";
      cart = []; writeJSON("dodoCart", cart);
      $("cartCount").textContent = 0;
      renderGrid();
      openSheet(`<div class="done"><div class="tick">✅</div><h2>تم استلام طلبك</h2>
        <p>رقم طلبك <b>#${data.id}</b> — الإجمالي ${money(data.total)}<br>هنكلمك على التليفون لتأكيد الطلب وطريقة الدفع.</p>
        ${wa ? `<a class="btn" style="display:block;text-decoration:none;margin-bottom:8px" href="${wa}" target="_blank" rel="noopener">ابعت تفاصيل الطلب واتساب 💬</a>` : ""}
        <button class="btn alt" data-close type="button">رجوع للمتجر</button></div>`, "done");
    } catch (e) {
      toast("مشكلة في الاتصال، جرّب تاني");
      btn.disabled = false;
    }
  }

  /* ---------- الأحداث ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-add],[data-inc],[data-dec],[data-open],[data-cat],[data-close]");
    if (!t) return;
    if (t.dataset.close !== undefined) return closeSheet();
    if (t.dataset.cat) { cat = t.dataset.cat === "all" ? "all" : Number(t.dataset.cat); renderCats(); return renderGrid(); }
    if (t.dataset.open) return openProduct(Number(t.dataset.open));
    const id = Number(t.dataset.add || t.dataset.inc || t.dataset.dec);
    setQty(id, qtyOf(id) + (t.dataset.dec ? -1 : 1));
  });
  $("cartBtn").addEventListener("click", renderCart);
  $("search").addEventListener("input", (e) => { query = e.target.value; renderGrid(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  /* ---------- التشغيل ---------- */
  function applySettings() {
    const s = store.settings;
    $("shopName").textContent = s.shopName || "دودو ستور";
    if (s.announcement) { $("announce").textContent = s.announcement; $("announce").hidden = false; }
    const ship = [];
    if (s.shippingFee >= 0) ship.push(`الشحن ${s.shippingFee} ج.م`);
    if (s.freeShippingFrom > 0) ship.push(`مجاني من ${s.freeShippingFrom} ج.م`);
    ship.push("التوصيل للفيوم والقاهرة فقط");
    $("shipInfo").textContent = ship.join(" • ");
    if (s.whatsapp) { $("wa").href = "https://wa.me/" + s.whatsapp; $("wa").hidden = false; }
    $("foot").innerHTML = `<div>© ${new Date().getFullYear()} ${esc(s.shopName || "دودو ستور")}</div>` +
      (s.phone ? `<div>📞 <a href="tel:${esc(s.phone)}">${esc(s.phone)}</a></div>` : "");
  }

  async function init() {
    try {
      const res = await fetch("/api/store");
      if (!res.ok) throw new Error();
      store = await res.json();
    } catch (e) {
      $("empty").textContent = "تعذّر تحميل المنتجات، حدّث الصفحة";
      $("empty").hidden = false;
      return;
    }
    cart = cart.filter((i) => byId(i.id)); // شيل أي منتج اتخفى
    writeJSON("dodoCart", cart);
    $("cartCount").textContent = cartCount();
    applySettings();
    renderCats();
    renderGrid();
  }
  init();
})();
