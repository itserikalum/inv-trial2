/* ============================================================
   Millo & Miji — Wedding Invitation
   ============================================================ */
 
/* ---- 1. CONFIG ----
   SCRIPT_URL is now set directly in index.html (search for
   "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") so you don't need to
   open this file to connect your Google Sheet. */
 
/* ---- 2. WEDDING DATE (Bali time, UTC+8) ---- */
const WEDDING_DATE = new Date("2027-01-01T10:00:00+08:00");
 
/* ============ GATE / OPEN INVITATION ============ */
const gate = document.getElementById('gate');
const openBtn = document.getElementById('openBtn');
const main = document.getElementById('main');
const bgm = document.getElementById('bgm');
const musicToggle = document.getElementById('musicToggle');
 
openBtn.addEventListener('click', () => {
  main.hidden = false;
  requestAnimationFrame(() => {
    gate.classList.add('hide');
    document.body.style.overflow = 'auto';
  });
  bgm.volume = 0.6;
  bgm.play().catch(() => { /* autoplay might still be blocked; user can tap music toggle */ });
  musicToggle.classList.remove('paused');
  musicToggle.setAttribute('aria-pressed', 'true');
  setTimeout(initScrollObservers, 900);
});
 
musicToggle.addEventListener('click', () => {
  if (bgm.paused) {
    bgm.play();
    musicToggle.classList.remove('paused');
    musicToggle.setAttribute('aria-pressed', 'true');
  } else {
    bgm.pause();
    musicToggle.classList.add('paused');
    musicToggle.setAttribute('aria-pressed', 'false');
  }
});
 
/* lock scroll until opened */
document.body.style.overflow = 'hidden';
 
/* ============ COUNTDOWN ============ */
const elDays = document.getElementById('cd-days');
const elHours = document.getElementById('cd-hours');
const elMinutes = document.getElementById('cd-minutes');
const elSeconds = document.getElementById('cd-seconds');
 
function pad(n){ return String(n).padStart(2, '0'); }
 
function tickCountdown(){
  const now = new Date();
  let diff = WEDDING_DATE - now;
  if (diff < 0) diff = 0;
 
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
 
  elDays.textContent = pad(days);
  elHours.textContent = pad(hours);
  elMinutes.textContent = pad(minutes);
  elSeconds.textContent = pad(seconds);
}
tickCountdown();
setInterval(tickCountdown, 1000);
 
/* ============ RIBBON THREAD (draws with scroll) ============ */
const ribbonPath = document.getElementById('ribbonPath');
function updateRibbon(){
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
  const offset = 1000 - (progress * 1000);
  ribbonPath.style.strokeDashoffset = String(offset);
}
window.addEventListener('scroll', updateRibbon, { passive: true });
updateRibbon();
 
/* ============ SCROLL REVEAL ============ */
function initScrollObservers(){
  const targets = document.querySelectorAll('.section, .closing');
  targets.forEach(t => t.classList.add('reveal'));
 
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
 
  targets.forEach(t => io.observe(t));
}
 
/* ============ RSVP FORM -> GOOGLE SHEETS ============ */
const rsvpForm = document.getElementById('rsvpForm');
const rsvpSubmit = document.getElementById('rsvpSubmit');
const rsvpStatus = document.getElementById('rsvpStatus');
const wishesList = document.getElementById('wishesList');
 
rsvpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
 
  const payload = {
    name: document.getElementById('rsvpName').value.trim(),
    attendance: document.getElementById('rsvpAttendance').value,
    guests: document.getElementById('rsvpGuests').value,
    message: document.getElementById('rsvpMessage').value.trim()
  };
 
  if (!payload.name || !payload.attendance || payload.guests === ""){
    rsvpStatus.textContent = "Please fill in all required fields.";
    rsvpStatus.classList.add('error');
    return;
  }
 
  if (SCRIPT_URL.includes("PASTE_YOUR_GOOGLE_APPS_SCRIPT")){
    rsvpStatus.textContent = "RSVP backend not connected yet — see README.md to link your Google Sheet.";
    rsvpStatus.classList.add('error');
    return;
  }
 
  rsvpSubmit.disabled = true;
  rsvpStatus.classList.remove('error');
  rsvpStatus.textContent = "Sending...";
 
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload)
    });
 
    rsvpStatus.textContent = "Thank you! Your RSVP has been received. 💌";
    addWishToList(payload.name, payload.message);
    rsvpForm.reset();
  } catch (err) {
    rsvpStatus.classList.add('error');
    rsvpStatus.textContent = "Something went wrong. Please try again in a moment.";
  } finally {
    rsvpSubmit.disabled = false;
  }
});
 
function addWishToList(name, message){
  if (!message) return;
  const empty = wishesList.querySelector('.wishes-empty');
  if (empty) empty.remove();
 
  const item = document.createElement('div');
  item.className = 'wish-item';
  item.innerHTML = `<p class="wish-name">${escapeHtml(name)}</p><p class="wish-msg">${escapeHtml(message)}</p>`;
  wishesList.prepend(item);
}
 
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
 
async function loadWishes(){
  if (SCRIPT_URL.includes("PASTE_YOUR_GOOGLE_APPS_SCRIPT")) return;
  try {
    const res = await fetch(SCRIPT_URL);
    const data = await res.json();
    if (Array.isArray(data) && data.length){
      wishesList.innerHTML = '';
      data
        .filter(row => row.message && row.message.trim())
        .reverse()
        .forEach(row => addWishToList(row.name, row.message));
    }
  } catch (err) {
    /* silently ignore — form still works even if list can't load */
  }
}
loadWishes();
 
/* ============ COPY ACCOUNT NUMBER ============ */
const copyBtn = document.getElementById('copyAccount');
copyBtn.addEventListener('click', async () => {
  const value = copyBtn.dataset.value;
  try {
    await navigator.clipboard.writeText(value);
    const original = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    setTimeout(() => { copyBtn.textContent = original; }, 1800);
  } catch (err) {
    /* fallback: select text manually */
    alert("Account number: " + value);
  }
});
