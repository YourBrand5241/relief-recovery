// ==== CONFIG ====
const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "relief-recovery";
const SLOT_MINUTES = 30; // length of each bookable slot shown in the picker

// Relief Recovery's diary: Monday to Friday, 9am–5pm, one schedule for everything
const SCHEDULES = {
  standard: { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17 },
};

// ---- Demo data ----
// Relief Recovery's real treatment list — this is the only part of the
// app that changes from business to business; everything else (basket,
// diary, booking) stays exactly the same.
const PRODUCTS = [
  { id: 1, name: "Deep Tissue Massage (60 min)", desc: "Firm-pressure massage targeting muscle tension and tightness.", price: 55.00, emoji: "💆", category: "standard" },
  { id: 2, name: "Sports Massage (30 min)", desc: "Focused pre/post-activity massage to aid performance and recovery.", price: 35.00, emoji: "🏃", category: "standard" },
  { id: 3, name: "Dry Cupping Therapy", desc: "Suction cupping to ease muscle tightness and improve circulation.", price: 40.00, emoji: "🫙", category: "standard" },
  { id: 4, name: "Dry Needling", desc: "Targeted needling to release tight muscle trigger points.", price: 35.00, emoji: "🪡", category: "standard" },
  { id: 5, name: "Full Recovery Session (90 min)", desc: "Combined massage, cupping and needling for a complete recovery session.", price: 85.00, emoji: "✨", category: "standard" },
];

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let basket = []; // { id, name, price, qty, category }

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

  // Keep one diary category per booking, so the date/time picker below
  // always matches a single, unambiguous schedule.
  if (basket.length > 0 && basket[0].category !== product.category) {
    alert("Please book this as a separate booking — this basket already contains a different type of session.");
    return;
  }

  const existing = basket.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    basket.push({ id: product.id, name: product.name, price: product.price, qty: 1, category: product.category });
  }
  renderBasket();
  refreshSlotsForCurrentDate();
}

function removeFromBasket(productId) {
  basket = basket.filter(item => item.id !== productId);
  renderBasket();
  refreshSlotsForCurrentDate();
}

function renderBasket() {
  const container = document.getElementById("basket-items");
  const totalEl = document.getElementById("basket-total");

  if (basket.length === 0) {
    container.innerHTML = `<p class="empty-basket">Nothing added yet</p>`;
    totalEl.textContent = formatPrice(0);
    updateCheckoutAvailability();
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
  updateCheckoutAvailability();
}

function getScheduleForBasket() {
  if (basket.length === 0) return null;
  return SCHEDULES[basket[0].category];
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatTimeLabel(t) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${period}`;
}

function buildAllSlotsForDay(schedule) {
  const slots = [];
  for (let mins = schedule.startHour * 60; mins < schedule.endHour * 60; mins += SLOT_MINUTES) {
    slots.push(`${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`);
  }
  return slots;
}

async function refreshSlotsForCurrentDate() {
  const dateInput = document.getElementById("booking-date");
  const timeSelect = document.getElementById("time-slot");
  const message = document.getElementById("slot-message");
  const schedule = getScheduleForBasket();

  if (!schedule) {
    timeSelect.innerHTML = "";
    message.textContent = "Add something to your booking first.";
    updateCheckoutAvailability();
    return;
  }

  if (!dateInput.value) {
    timeSelect.innerHTML = "";
    message.textContent = "";
    updateCheckoutAvailability();
    return;
  }

  const selectedDate = new Date(dateInput.value + "T00:00:00");
  const dayOfWeek = selectedDate.getDay();

  if (!schedule.days.includes(dayOfWeek)) {
    timeSelect.innerHTML = "";
    message.textContent = "Relief Recovery isn't open on that day — please pick a weekday.";
    updateCheckoutAvailability();
    return;
  }

  message.textContent = "Checking availability…";
  timeSelect.innerHTML = "";

  const allSlots = buildAllSlotsForDay(schedule);

  const { data, error } = await supabaseClient
    .from("bookings")
    .select("booking_time")
    .eq("business_id", BUSINESS_ID)
    .eq("booking_date", dateInput.value);

  const takenTimes = error ? [] : data.map(row => row.booking_time.slice(0, 5));
  const availableSlots = allSlots.filter(t => !takenTimes.includes(t));

  if (availableSlots.length === 0) {
    message.textContent = "No times left on that day — please try another date.";
  } else {
    message.textContent = "";
    availableSlots.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = formatTimeLabel(t);
      timeSelect.appendChild(opt);
    });
  }

  updateCheckoutAvailability();
}

function updateCheckoutAvailability() {
  const dateInput = document.getElementById("booking-date");
  const timeSelect = document.getElementById("time-slot");
  const nameInput = document.getElementById("customer-name");
  const phoneInput = document.getElementById("customer-phone");
  const checkoutBtn = document.getElementById("checkout-btn");
  checkoutBtn.disabled = basket.length === 0 || !dateInput.value || !timeSelect.value
    || !nameInput.value.trim() || !phoneInput.value.trim();
}

async function confirmBooking() {
  const dateInput = document.getElementById("booking-date");
  const timeSelect = document.getElementById("time-slot");
  const nameInput = document.getElementById("customer-name");
  const phoneInput = document.getElementById("customer-phone");
  const date = dateInput.value;
  const time = timeSelect.value;

  if (basket.length === 0 || !date || !time || !nameInput.value.trim() || !phoneInput.value.trim()) return;

  const serviceNames = basket.map(i => `${i.qty} x ${i.name}`).join(", ");
  const total = basket.reduce((sum, i) => sum + i.price * i.qty, 0);

  const { error } = await supabaseClient.from("bookings").insert({
    business_id: BUSINESS_ID,
    booking_date: date,
    booking_time: time,
    service_names: serviceNames,
    total_price: total,
    customer_name: nameInput.value.trim(),
    customer_phone: phoneInput.value.trim(),
  });

  if (error) {
    if (error.code === "23505") {
      alert("Sorry, someone just booked that exact slot. Please pick a different time.");
      refreshSlotsForCurrentDate();
    } else {
      alert("Something went wrong saving the booking — please try again.");
      console.error(error);
    }
    return;
  }

  document.getElementById("confirmation-overlay").classList.remove("hidden");
  basket = [];
  renderBasket();
  document.getElementById("time-slot").innerHTML = "";
  document.getElementById("slot-message").textContent = "";
  nameInput.value = "";
  phoneInput.value = "";
}

function setupCheckout() {
  const overlay = document.getElementById("confirmation-overlay");
  const closeBtn = document.getElementById("close-overlay");
  document.getElementById("checkout-btn").addEventListener("click", confirmBooking);
  closeBtn.addEventListener("click", () => overlay.classList.add("hidden"));
}

function setupDatePicker() {
  const dateInput = document.getElementById("booking-date");
  const today = new Date();
  dateInput.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  dateInput.addEventListener("change", refreshSlotsForCurrentDate);
}

document.getElementById("time-slot").addEventListener("change", updateCheckoutAvailability);
document.getElementById("customer-name").addEventListener("input", updateCheckoutAvailability);
document.getElementById("customer-phone").addEventListener("input", updateCheckoutAvailability);

renderProducts();
renderBasket();
setupDatePicker();
setupCheckout();
