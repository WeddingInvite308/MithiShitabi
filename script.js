// ==========================================================
// SETTINGS: fill these in
// ==========================================================
const SETTINGS = {
  // Date and time of the shower, for the countdown (UAE time is +04:00)
  showerDate: "2026-11-14T16:00:00+04:00",

  // RSVP: replies are sent to a Google Form.
  // 1. Make a Google Form with these 4 questions: Name, Attending, Guests, Wish
  // 2. Paste the form's "formResponse" address and each question's entry number below.
  googleForm: {
    action: "",                // e.g. "https://docs.google.com/forms/d/e/XXXX/formResponse"
    name: "entry.0000000001",
    attending: "entry.0000000002",
    guests: "entry.0000000003",
    wish: "entry.0000000004",
    guess: "",                 // optional: also save the boy/girl guess
  },

  // Your own photos for the envelope (put the files in the images folder)
  photo1: "",                  // e.g. "images/photo-1.jpg"  (bump photo)
  photo2: "",                  // e.g. "images/photo-2.jpg"  (scan photo)
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sheet = document.getElementById("sheet");

// ==========================================================
// Fit the 390px-wide design to narrower phones
// ==========================================================
function fitSheet() {
  const w = Math.min(window.innerWidth, 430);
  sheet.style.zoom = w < 390 ? (w / 390).toFixed(4) : "";
}
fitSheet();
window.addEventListener("resize", fitSheet);

// ==========================================================
// Page 1: tap the balloon to open the invitation
// ==========================================================
let opened = false;
function openInvite() {
  if (opened) return;
  opened = true;
  document.body.classList.add("is-opening");
  setTimeout(() => {
    document.body.classList.add("is-open");
    window.scrollTo(0, 0);
  }, reduceMotion ? 450 : 1850);
}
document.getElementById("openBtn").addEventListener("click", openInvite);

// ==========================================================
// Pages 2 and 3: #rsvp shows the RSVP card, #invite goes back
// ==========================================================
const rsvpPage = document.getElementById("rsvp");
function route() {
  const onRsvp = location.hash === "#rsvp";
  if ((onRsvp || location.hash === "#invite") && !opened) {
    opened = true;                      // a shared link straight to a page skips the opening
    document.body.classList.add("is-opening", "is-open");
  }
  document.body.classList.toggle("on-rsvp", onRsvp);
  rsvpPage.hidden = !onRsvp;
  window.scrollTo(0, 0);
  if (onRsvp) document.getElementById("rsvpTitle").focus({ preventScroll: true });
}
window.addEventListener("hashchange", route);
if (location.hash) route();

// ==========================================================
// Envelope photos
// ==========================================================
[["photo1", ".photo.p1 .ph"], ["photo2", ".photo.p2 .ph"]].forEach(([key, sel]) => {
  if (!SETTINGS[key]) return;
  const el = document.querySelector(sel);
  el.style.backgroundImage = `url("${SETTINGS[key]}")`;
  el.classList.add("has-photo");
});

// ==========================================================
// Countdown
// ==========================================================
const target = new Date(SETTINGS.showerDate).getTime();
const nums = {};
document.querySelectorAll("#countdown .num").forEach((n) => (nums[n.dataset.unit] = n));
function tick() {
  const left = target - Date.now();
  if (isNaN(left) || left <= 0) {
    document.getElementById("countdown").hidden = true;
    document.getElementById("countDone").hidden = false;
    return;
  }
  const s = Math.floor(left / 1000);
  const parts = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  for (const k in parts) nums[k].textContent = String(parts[k]).padStart(2, "0");
  setTimeout(tick, 1000 - (Date.now() % 1000));
}
tick();

// ==========================================================
// Boy or girl guess (remembered on this phone)
// ==========================================================
const guessRow = document.querySelector(".guess-row");
const guessResult = document.getElementById("guessResult");
let myGuess = null;
function showGuess(g) {
  myGuess = g;
  guessRow.classList.add("has-guess");
  guessRow.querySelectorAll(".guess-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.guess === g)));
  guessResult.innerHTML = `You buzzed: <strong>${g === "girl" ? "girl bee" : "boy bee"}</strong>!<br>Tap again to switch`;
}
guessRow.querySelectorAll(".guess-btn").forEach((b) =>
  b.addEventListener("click", () => {
    showGuess(b.dataset.guess);
    try { localStorage.setItem("babyGuess", b.dataset.guess); } catch (e) {}
  })
);
try { const saved = localStorage.getItem("babyGuess"); if (saved) showGuess(saved); } catch (e) {}

// ==========================================================
// RSVP form
// ==========================================================
const form = document.getElementById("rsvpForm");
const guestsRow = document.getElementById("guestsRow");
form.querySelectorAll('input[name="attending"]').forEach((r) =>
  r.addEventListener("change", () => {
    guestsRow.hidden = form.attending.value === "No";
    document.getElementById("attError").hidden = true;
  })
);
document.getElementById("guestName").addEventListener("input", () => (document.getElementById("nameError").hidden = true));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("guestName").value.trim();
  const attending = form.attending.value;
  document.getElementById("nameError").hidden = !!name;
  document.getElementById("attError").hidden = !!attending;
  if (!name) { document.getElementById("guestName").focus(); return; }
  if (!attending) { document.getElementById("attYes").focus(); return; }

  const btn = document.getElementById("sendBtn");
  btn.disabled = true;
  btn.textContent = "Buzzing…";

  const gf = SETTINGS.googleForm;
  if (gf.action) {
    const data = new FormData();
    data.append(gf.name, name);
    data.append(gf.attending, attending === "Yes" ? "Yes, I'll be there" : "Sorry, can't make it");
    data.append(gf.guests, attending === "Yes" ? form.guests.value : "0");
    data.append(gf.wish, form.wish.value.trim());
    if (gf.guess && myGuess) data.append(gf.guess, myGuess);
    try { await fetch(gf.action, { method: "POST", mode: "no-cors", body: data }); } catch (err) {}
  }

  const first = name.split(" ")[0];
  document.getElementById("thanksTitle").textContent = `Thank you, ${first}!`;
  document.getElementById("thanksText").textContent =
    attending === "Yes" ? "We can't wait to bee with you!" : "We'll miss you, and we're so grateful for your love.";
  form.hidden = true;
  const thanks = document.getElementById("thanks");
  thanks.hidden = false;
  thanks.focus();
});
