// ==== CONFIG ====
const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "relief-recovery";
const SLOT_MINUTES = 30;

// NOTE: this password only hides the owner view on screen — it is not
// real security, since the underlying data is still fetched with the
// same public key the whole site uses. Fine for a demo; swap for proper
// login (Supabase Auth) before this handles real customer data.
const OWNER_PASSWORD = "reliefowner2026";

const SCHEDULES = {
  standard: { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17 },
};

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let ownerUnlocked = false;
let currentBookings = [];

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

function getScheduleForDate(dateStr) {
  const day = new Date(dateStr + "T00:00:00").getDay();
  for (const key in SCHEDULES) {
    if (SCHEDULES[key].days.includes(day)) return SCHEDULES[key];
  }
  return null;
}

async function loadDiary() {
  const dateInput = document.getElementById("diary-date");
  const listEl = document.getElementById("diary-list");
  const messageEl = document.getElementById("diary-message");
  const date = dateInput.value;
  if (!date) return;

  const schedule = getScheduleForDate(date);
  if (!schedule) {
    listEl.innerHTML = "";
    messageEl.textContent = "Relief Recovery isn't open on that day.";
    return;
  }

  messageEl.textContent = "Loading…";
  listEl.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("bookings")
    .select("booking_time, customer_name, customer_phone, service_names, total_price")
    .eq("business_id", BUSINESS_ID)
    .eq("booking_date", date);

  currentBookings = error ? [] : data;
  messageEl.textContent = "";
  renderDiary(schedule);
}

function renderDiary(schedule) {
  const listEl = document.getElementById("diary-list");
  const allSlots = buildAllSlotsForDay(schedule);
  listEl.innerHTML = "";

  allSlots.forEach(t => {
    const booking = currentBookings.find(b => b.booking_time.slice(0, 5) === t);
    const row = document.createElement("div");
    row.className = `diary-row ${booking ? "diary-booked" : "diary-available"}`;

    let statusText = booking ? "Booked" : "Available";
    if (booking && ownerUnlocked) {
      statusText = `Booked — ${booking.customer_name || "no name given"} (${booking.customer_phone || "no phone"}) — ${booking.service_names}`;
    }

    row.innerHTML = `<span>${formatTimeLabel(t)}</span><span>${statusText}</span>`;
    listEl.appendChild(row);
  });
}

function setupOwnerUnlock() {
  document.getElementById("owner-unlock-btn").addEventListener("click", () => {
    const input = document.getElementById("owner-password");
    const status = document.getElementById("owner-status");
    if (input.value === OWNER_PASSWORD) {
      ownerUnlocked = true;
      status.textContent = "Owner view unlocked — showing customer details below.";
      const schedule = getScheduleForDate(document.getElementById("diary-date").value);
      if (schedule) renderDiary(schedule);
    } else {
      status.textContent = "Incorrect password.";
    }
  });
}

function setupDatePicker() {
  const dateInput = document.getElementById("diary-date");
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  dateInput.min = todayStr;
  dateInput.value = todayStr;
  dateInput.addEventListener("change", loadDiary);
}

setupDatePicker();
setupOwnerUnlock();
loadDiary();
