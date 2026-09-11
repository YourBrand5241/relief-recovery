// ==== CONFIG ====
const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "relief-recovery";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatTimeLabel(t) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${period}`;
}

function formatPrice(amount) {
  return `£${Number(amount).toFixed(2)}`;
}

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    await enterDashboard(session);
  }
}

async function enterDashboard(session) {
  // Confirm this login is actually linked to THIS business, not just any
  // Relief Recovery-shaped login someone might have — this is the real
  // security check, not just a password box.
  const { data: ownerRows, error } = await supabaseClient
    .from("business_owners")
    .select("business_id")
    .eq("business_id", BUSINESS_ID)
    .eq("owner_user_id", session.user.id);

  if (error || !ownerRows || ownerRows.length === 0) {
    document.getElementById("login-message").textContent = "This account isn't linked to Relief Recovery.";
    await supabaseClient.auth.signOut();
    return;
  }

  document.getElementById("login-section").classList.add("hidden");
  document.getElementById("dashboard-section").classList.remove("hidden");
  document.getElementById("signed-in-as").textContent = `Signed in as ${session.user.email}`;

  loadAppointments();
  loadBlockedSlots();
}

async function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const message = document.getElementById("login-message");

  if (!email || !password) {
    message.textContent = "Enter both email and password.";
    return;
  }

  message.textContent = "Signing in…";
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    message.textContent = "Sign in failed — check your email and password.";
    return;
  }

  message.textContent = "";
  await enterDashboard(data.session);
}

async function handleSignOut() {
  await supabaseClient.auth.signOut();
  document.getElementById("dashboard-section").classList.add("hidden");
  document.getElementById("login-section").classList.remove("hidden");
  document.getElementById("login-email").value = "";
  document.getElementById("login-password").value = "";
}

async function loadAppointments() {
  const listEl = document.getElementById("appointments-list");
  listEl.innerHTML = "<p class=\"empty-basket\">Loading…</p>";

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const { data, error } = await supabaseClient
    .from("bookings")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .gte("booking_date", todayStr)
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });

  if (error || !data || data.length === 0) {
    listEl.innerHTML = "<p class=\"empty-basket\">No upcoming appointments.</p>";
    return;
  }

  listEl.innerHTML = "";
  data.forEach(booking => {
    const row = document.createElement("div");
    row.className = "appointment-row";
    row.innerHTML = `
      <div>
        <strong>${booking.booking_date} — ${formatTimeLabel(booking.booking_time.slice(0, 5))}</strong><br>
        ${booking.customer_name || "No name"} · ${booking.customer_phone || "No phone"} · ${booking.customer_email || "No email"}<br>
        ${booking.service_names} — ${formatPrice(booking.total_price)}
      </div>
      <button class="secondary-btn cancel-btn" data-id="${booking.id}">Cancel</button>
    `;
    listEl.appendChild(row);
  });

  listEl.querySelectorAll(".cancel-btn").forEach(btn => {
    btn.addEventListener("click", () => cancelAppointment(btn.dataset.id));
  });
}

async function cancelAppointment(id) {
  if (!confirm("Cancel this appointment? This can't be undone.")) return;
  const { error } = await supabaseClient.from("bookings").delete().eq("id", id);
  if (error) {
    alert("Couldn't cancel — please try again.");
    console.error(error);
    return;
  }
  loadAppointments();
}

async function handleBlockTime() {
  const dateInput = document.getElementById("block-date");
  const timeInput = document.getElementById("block-time");
  const reasonInput = document.getElementById("block-reason");
  const message = document.getElementById("block-message");

  if (!dateInput.value) {
    message.textContent = "Choose a date first.";
    return;
  }

  const { error } = await supabaseClient.from("blocked_slots").insert({
    business_id: BUSINESS_ID,
    blocked_date: dateInput.value,
    blocked_time: timeInput.value || null,
    reason: reasonInput.value.trim() || null,
  });

  if (error) {
    message.textContent = "Something went wrong — please try again.";
    console.error(error);
    return;
  }

  message.textContent = "Blocked.";
  dateInput.value = "";
  timeInput.value = "";
  reasonInput.value = "";
  loadBlockedSlots();
}

async function loadBlockedSlots() {
  const listEl = document.getElementById("blocked-list");
  listEl.innerHTML = "<p class=\"empty-basket\">Loading…</p>";

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const { data, error } = await supabaseClient
    .from("blocked_slots")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .gte("blocked_date", todayStr)
    .order("blocked_date", { ascending: true });

  if (error || !data || data.length === 0) {
    listEl.innerHTML = "<p class=\"empty-basket\">Nothing currently blocked.</p>";
    return;
  }

  listEl.innerHTML = "";
  data.forEach(row => {
    const el = document.createElement("div");
    el.className = "appointment-row";
    const timeLabel = row.blocked_time ? formatTimeLabel(row.blocked_time.slice(0, 5)) : "Whole day";
    el.innerHTML = `
      <div>
        <strong>${row.blocked_date} — ${timeLabel}</strong><br>
        ${row.reason || "No reason given"}
      </div>
      <button class="secondary-btn unblock-btn" data-id="${row.id}">Unblock</button>
    `;
    listEl.appendChild(el);
  });

  listEl.querySelectorAll(".unblock-btn").forEach(btn => {
    btn.addEventListener("click", () => unblockSlot(btn.dataset.id));
  });
}

async function unblockSlot(id) {
  const { error } = await supabaseClient.from("blocked_slots").delete().eq("id", id);
  if (error) {
    alert("Couldn't remove — please try again.");
    return;
  }
  loadBlockedSlots();
}

document.getElementById("login-btn").addEventListener("click", handleLogin);
document.getElementById("sign-out-btn").addEventListener("click", handleSignOut);
document.getElementById("block-btn").addEventListener("click", handleBlockTime);

checkSession();
