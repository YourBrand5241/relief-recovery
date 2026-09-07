// ---- Demo data ----
// Relief Recovery's real treatment list — this is the only part of the
// app that changes from business to business; everything else (basket,
// booking, checkout) stays exactly the same.
const PRODUCTS = [
  { id: 1, name: "Deep Tissue Massage (60 min)", desc: "Firm-pressure massage targeting muscle tension and tightness.", price: 55.00, emoji: "💆" },
  { id: 2, name: "Sports Massage (30 min)", desc: "Focused pre/post-activity massage to aid performance and recovery.", price: 35.00, emoji: "🏃" },
  { id: 3, name: "Dry Cupping Therapy", desc: "Suction cupping to ease muscle tightness and improve circulation.", price: 40.00, emoji: "🫙" },
  { id: 4, name: "Dry Needling", desc: "Targeted needling to release tight muscle trigger points.", price: 35.00, emoji: "🪡" },
  { id: 5, name: "Full Recovery Session (90 min)", desc: "Combined massage, cupping and needling for a complete recovery session.", price: 85.00, emoji: "✨" },
];

let basket = []; // { id, name, price, qty }

function formatPrice(amount) {
  return `£${amount.toFixed(2)}`;
}

function renderProducts() {
  const list = document.getElementById("product-list");
  list.innerHTML = "";
  PRODUCTS.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-photo">${product.emoji}</div>
      <div class="product-name">${product.name}</div>
      <div class="product-desc">${product.desc}</div>
      <div class="product-footer">
        <span class="product-price">${formatPrice(product.price)}</span>
        <button class="add-btn" data-id="${product.id}">Add</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll(".add-btn").forEach(btn => {
    btn.addEventListener("click", () => addToBasket(Number(btn.dataset.id)));
  });
}

function addToBasket(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  const existing = basket.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    basket.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  }
  renderBasket();
}

function removeFromBasket(productId) {
  basket = basket.filter(item => item.id !== productId);
  renderBasket();
}

function renderBasket() {
  const container = document.getElementById("basket-items");
  const totalEl = document.getElementById("basket-total");
  const checkoutBtn = document.getElementById("checkout-btn");

  if (basket.length === 0) {
    container.innerHTML = `<p class="empty-basket">Nothing added yet</p>`;
    totalEl.textContent = formatPrice(0);
    checkoutBtn.disabled = true;
    return;
  }

  container.innerHTML = "";
  let total = 0;
  basket.forEach(item => {
    const lineTotal = item.price * item.qty;
    total += lineTotal;
    const row = document.createElement("div");
    row.className = "basket-row";
    row.innerHTML = `
      <span>${item.qty} × ${item.name}</span>
      <span>${formatPrice(lineTotal)} <button data-id="${item.id}">remove</button></span>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => removeFromBasket(Number(btn.dataset.id)));
  });

  totalEl.textContent = formatPrice(total);
  checkoutBtn.disabled = false;
}

function populateTimeSlots() {
  const select = document.getElementById("time-slot");
  select.innerHTML = "";
  const slots = ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM"];
  slots.forEach(slot => {
    const opt = document.createElement("option");
    opt.value = slot;
    opt.textContent = slot;
    select.appendChild(opt);
  });
}

function setupCheckout() {
  const btn = document.getElementById("checkout-btn");
  const overlay = document.getElementById("confirmation-overlay");
  const closeBtn = document.getElementById("close-overlay");

  btn.addEventListener("click", () => overlay.classList.remove("hidden"));
  closeBtn.addEventListener("click", () => overlay.classList.add("hidden"));
}

renderProducts();
renderBasket();
populateTimeSlots();
setupCheckout();
