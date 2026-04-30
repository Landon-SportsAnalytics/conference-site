/* ── DATA ── */

const SPEAKERS = [
  { name: "Jordanna Court",    role: "Education Leadership Professional | Developer of Young Minds", org: "Pine Crest School",             color: "#B9975B", init: "JC", linkedin: "https://www.linkedin.com/in/jordannacourt/" },
  { name: "Mrs. Lisa Garrido", role: "Biology Teacher",                                              org: "Westminster Christian School",   color: "#2c5234", init: "LG", linkedin: "https://www.linkedin.com/in/lisa-garrido-bb5b1036/" },
];

const BREAKOUT_SESSIONS = [
  {
    id: 101,
    category: "Learn",
    title: "Cultivating Critical AI Literacy in the Classroom",
    desc: "This hands-on session will equip educators with practical strategies for teaching students how to become analytical users of generative AI across various subject areas. Attendees will explore essential AI Literacy skills, including prompt engineering and critical analysis, to help students move from passive consumption to active collaboration. Key concepts covered include algorithmic bias analysis, data synthesis, and the ethical use of AI. Participants will leave with lesson ideas designed to empower students to leverage AI as a sophisticated research and thinking partner, developing crucial critical thinking and discernment skills for the new era of education.",
    speaker: { name: "Jordanna Court", role: "Education Leadership Professional | Developer of Young Minds", org: "Pine Crest School", init: "JC", color: "#B9975B", linkedin: "https://www.linkedin.com/in/jordannacourt/" },
  },
];

/* ── STATE ── */
const STORAGE_KEY = "aiwithpurpose2026_registrations";
const GAS_ENDPOINT = ""; // Paste your Google Apps Script Web App URL here

let pendingSessionId = null;
let activeBreakoutCat = "All";

/* ── STORAGE ── */
function loadRegistrations() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function saveRegistrations(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function isRegistered(sessionId, email) {
  const regs = loadRegistrations();
  return !!(regs[sessionId] && regs[sessionId].some(r => r.email.toLowerCase() === email.toLowerCase()));
}

function getUserRegistration(sessionId) {
  const regs = loadRegistrations();
  return regs[sessionId] ? regs[sessionId][0] : null;
}

function registerForSession(sessionId, name, email) {
  const regs = loadRegistrations();
  if (!regs[sessionId]) regs[sessionId] = [];
  regs[sessionId].push({ name, email: email.toLowerCase(), ts: Date.now() });
  saveRegistrations(regs);

  if (GAS_ENDPOINT) {
    const s = BREAKOUT_SESSIONS.find(x => x.id === sessionId);
    fetch(GAS_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        sessionId: s.id, sessionTitle: s.title, category: s.category,
        speaker: s.speaker.name, org: s.speaker.org,
        name, email: email.toLowerCase()
      })
    }).catch(() => {});
  }
}

/* ── RENDER BREAKOUTS ── */
function renderBreakouts() {
  const grid = document.getElementById("breakoutGrid");
  const filtered = activeBreakoutCat === "All"
    ? BREAKOUT_SESSIONS
    : BREAKOUT_SESSIONS.filter(b => b.category === activeBreakoutCat);

  grid.innerHTML = filtered.map(b => {
    const regObj = getUserRegistration(b.id);
    const userRegistered = regObj !== null && sessionStorage.getItem("lastEmail") &&
      regObj.email.toLowerCase() === (sessionStorage.getItem("lastEmail") || "").toLowerCase();
    const sp = b.speaker;
    return `
      <div class="breakout-card ${userRegistered ? 'registered' : ''}" id="card-${b.id}">
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">
          <span class="cat-pill cat-${b.category}">${b.category}</span>
        </div>
        <h3>${b.title}</h3>
        <div class="desc">${b.desc}</div>
        <a class="breakout-speaker" href="${sp.linkedin}" target="_blank" rel="noopener noreferrer">
          <div class="bs-avatar" style="background:${sp.color}">${sp.init}</div>
          <div>
            <div class="bs-name">${sp.name}</div>
            <div class="bs-role">${sp.role}</div>
            <div class="bs-role">${sp.org}</div>
            <div class="bs-linkedin">View LinkedIn →</div>
          </div>
        </a>
        ${userRegistered
          ? `<button class="register-btn registered" disabled>You are Registered</button>`
          : `<button class="register-btn" onclick="openModal(${b.id})">Register for Session</button>`}
      </div>`;
  }).join("") || `<p style="color:var(--muted);">No sessions in this category yet.</p>`;
}

document.getElementById("breakoutFilter").addEventListener("click", e => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  document.querySelectorAll("#breakoutFilter .filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  activeBreakoutCat = btn.dataset.cat;
  renderBreakouts();
});

/* ── RENDER SPEAKERS ── */
function renderSpeakers() {
  document.getElementById("speakersGrid").innerHTML = SPEAKERS.map(sp => `
    <a class="speaker-card" href="${sp.linkedin || '#'}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit;">
      <div class="speaker-avatar" style="background:${sp.color}">${sp.init}</div>
      <h3>${sp.name}</h3>
      ${sp.role ? `<p>${sp.role}</p>` : ''}
      ${sp.org  ? `<p>${sp.org}</p>`  : ''}
      ${sp.linkedin ? `<p style="font-size:.75rem;color:var(--blue);margin-top:.4rem;">View LinkedIn →</p>` : ''}
    </a>
  `).join("");
}

/* ── MODAL ── */
function openModal(sessionId) {
  pendingSessionId = sessionId;
  const s = BREAKOUT_SESSIONS.find(x => x.id === sessionId);
  document.getElementById("modalSessionName").textContent = `"${s.title}"`;
  document.getElementById("inputName").value = "";
  document.getElementById("inputEmail").value = sessionStorage.getItem("lastEmail") || "";
  document.getElementById("nameError").style.display = "none";
  document.getElementById("emailError").style.display = "none";
  document.getElementById("duplicateError").style.display = "none";
  document.getElementById("modalOverlay").classList.add("open");
  document.getElementById("inputName").focus();
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  pendingSessionId = null;
}

document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("modalOverlay").addEventListener("click", e => {
  if (e.target === document.getElementById("modalOverlay")) closeModal();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

/* ── FORM SUBMIT ── */
document.getElementById("registrationForm").addEventListener("submit", e => {
  e.preventDefault();
  const name  = document.getElementById("inputName").value.trim();
  const email = document.getElementById("inputEmail").value.trim();
  let valid = true;

  document.getElementById("nameError").style.display = "none";
  document.getElementById("emailError").style.display = "none";
  document.getElementById("duplicateError").style.display = "none";

  if (!name) {
    document.getElementById("nameError").style.display = "block";
    valid = false;
  }
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRx.test(email)) {
    document.getElementById("emailError").style.display = "block";
    valid = false;
  }
  if (!valid) return;

  if (isRegistered(pendingSessionId, email)) {
    const err = document.getElementById("duplicateError");
    err.textContent = `${email} is already registered for this session.`;
    err.style.display = "block";
    return;
  }

  registerForSession(pendingSessionId, name, email);
  sessionStorage.setItem("lastEmail", email.toLowerCase());

  const s = BREAKOUT_SESSIONS.find(x => x.id === pendingSessionId);
  closeModal();
  renderBreakouts();
  showToast(`Registered! Confirmation for "${s.title}" will be sent to ${email}.`);
});

/* ── TOAST ── */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 5000);
}

/* ── INIT ── */
renderBreakouts();
renderSpeakers();
