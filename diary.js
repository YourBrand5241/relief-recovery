// ==== CONFIG ====
const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "relief-recovery";
const SLOT_MINUTES = 30;

const SCHEDULES = {
  standard: { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17 },
};

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let currentBookings = [];
let currentBlocked = [];

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatTimeLabel(t) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${period}`;
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
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
    .from("public_diary_slots")
    .select("booking_time, duration_minutes")
    .eq("business_id", BUSINESS_ID)
    .eq("booking_date", date);

  const { data: blockedData } = await supabaseClient
    .from("blocked_slots")
    .select("blocked_time")
    .eq("business_id", BUSINESS_ID)
    .eq("blocked_date", date);

  currentBookings = error ? [] : data;
  currentBlocked = blockedData || [];

  const wholeDayBlocked = currentBlocked.some(row => row.blocked_time === null);
  if (wholeDayBlocked) {
    messageEl.textContent = "Closed on this date.";
    listEl.innerHTML = "";
    return;
  }

  messageEl.textContent = "";
  renderDiary(schedule);
}

function renderDiary(schedule) {
  const listEl = document.getElementById("diary-list");
  const allSlots = buildAllSlotsForDay(schedule);
  listEl.innerHTML = "";

  allSlots.forEach(t => {
    const slotMinutes = timeToMinutes(t);

    const isBooked = currentBookings.some(b => {
      const start = timeToMinutes(b.booking_time.slice(0, 5));
      const end = start + (b.duration_minutes || SLOT_MINUTES);
      return slotMinutes >= start && slotMinutes < end;
    });

    const isBlocked = currentBlocked.some(b => b.blocked_time && timeToMinutes(b.blocked_time.slice(0, 5)) === slotMinutes);

    const row = document.createElement("div");
    let statusText = "Available";
    let statusClass = "diary-available";
    if (isBooked) {
      statusText = "Booked";
      statusClass = "diary-booked";
    } else if (isBlocked) {
      statusText = "Unavailable";
      statusClass = "diary-blocked";
    }

    row.className = `diary-row ${statusClass}`;
    row.innerHTML = `<span>${formatTimeLabel(t)}</span><span>${statusText}</span>`;
    listEl.appendChild(row);
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
loadDiary();
