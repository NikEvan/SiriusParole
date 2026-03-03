import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAR_d84pgAreyt4dDqxgGvN8VPl8kmgCfc",
  authDomain: "parole-sirius.firebaseapp.com",
  projectId: "parole-sirius",
  storageBucket: "parole-sirius.firebasestorage.app",
  messagingSenderId: "429496599887",
  appId: "1:429496599887:web:1e609cf40b7c047ec8713a",
};

const LS_NAME_KEY = "parle_player_name_v1";
const LS_DAY_KEY = "parle_name_day_v1";
let currentDayOffset = null;

function openBackdrop(el) {
  el.style.display = "flex";
  el.setAttribute("aria-hidden", "false");
}
function closeBackdrop(el) {
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
}
function normalizeName(name) {
  return (name || "").trim().replace(/\s+/g, " ").slice(0, 20);
}
function getStoredName() {
  return normalizeName(localStorage.getItem(LS_NAME_KEY));
}
function setStoredName(name) {
  localStorage.setItem(LS_NAME_KEY, normalizeName(name));
}

// --- UI elements (devono esistere in index.html) ---
const nameBackdrop = document.getElementById("nameBackdrop");
const nameInput = document.getElementById("playerNameInput");
const nameOkBtn = document.getElementById("nameOkBtn");
const nameCloseBtn = document.getElementById("nameCloseBtn");

const lbBackdrop = document.getElementById("lbBackdrop");
const lbCloseBtn = document.getElementById("lbCloseBtn");
const lbList = document.getElementById("lbList");
const lbSubtitle = document.getElementById("lbSubtitle");
const lbHint = document.getElementById("lbHint");

// --- Block keyboard to prevent typing into the grid while a modal is open ---
function isAnyModalOpen() {
  const nameOpen = nameBackdrop && getComputedStyle(nameBackdrop).display === "flex";
  const lbOpen = lbBackdrop && getComputedStyle(lbBackdrop).display === "flex";
  return nameOpen || lbOpen;
}

function isTextInputTarget(t) {
  if (!t) return false;
  const tag = (t.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || t.isContentEditable === true;
}

window.addEventListener(
  "keydown",
  (e) => {
    if (!isAnyModalOpen()) return;

    // Se stai scrivendo dentro un input del modal, NON bloccare il default,
    // ma blocca la propagazione per evitare che il gioco legga i tasti.
    if (isTextInputTarget(e.target)) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }

    // Altrimenti blocca i tasti (così non finiscono nella griglia)
    if (e.key !== "Tab") e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  },
  true
);

// --- Modal buttons ---
nameCloseBtn.addEventListener("click", () => {
  // Non permettere di chiudere se non hai confermato il nome per il giorno corrente
  if (currentDayOffset === null) return;
  if (localStorage.getItem(LS_DAY_KEY) !== String(currentDayOffset)) return;
  closeBackdrop(nameBackdrop);
});

lbCloseBtn.addEventListener("click", () => closeBackdrop(lbBackdrop));

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    nameOkBtn.click();
  }
});

nameOkBtn.addEventListener("click", () => {
  const v = normalizeName(nameInput.value);
  if (!v) {
    nameInput.focus();
    nameInput.style.borderColor = "rgba(255,80,80,.8)";
    return;
  }
  nameInput.style.borderColor = "rgba(255,255,255,.12)";
  setStoredName(v);

  if (currentDayOffset !== null) {
    localStorage.setItem(LS_DAY_KEY, String(currentDayOffset));
  }
  closeBackdrop(nameBackdrop);
});

// --- Firebase init ---
let db, uid;

async function initFirebase() {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  const auth = getAuth(app);
  const res = await signInAnonymously(auth);
  uid = res.user.uid;
}

async function upsertScore(dayOffset, name, attempts, status) {
  const ref = doc(db, "leaderboards", String(dayOffset), "scores", uid);
  await setDoc(ref, { name, attempts, status, ts: serverTimestamp() }, { merge: true });
}

async function fetchLeaderboard(dayOffset) {
  const scoresCol = collection(db, "leaderboards", String(dayOffset), "scores");
  const q = query(scoresCol, orderBy("attempts", "asc"), orderBy("ts", "asc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

function renderLeaderboard(items) {
  lbList.innerHTML = "";
  if (!items.length) {
    lbList.innerHTML = `<div class="muted">Nessun punteggio ancora. Sei il primo 🙂</div>`;
    return;
  }

  items.forEach((it, idx) => {
    const attemptsLabel =
      it.status === "win"
        ? `${it.attempts}/6`
        : `<span style="color:#ff4d4d;font-weight:900">X</span>`;

    const safeName = String(it.name || "Anon").replace(/[<>&]/g, "");
    const row = document.createElement("div");
    row.className = "lb-item";
    row.innerHTML = `
      <div class="lb-left">
        <div class="pill">${idx + 1}</div>
        <div>${safeName}</div>
      </div>
      <div class="pill">${attemptsLabel}</div>
    `;
    lbList.appendChild(row);
  });
}

async function showLeaderboardModal(dayOffset) {
  lbSubtitle.textContent = `Puzzle #${dayOffset}`;
  lbHint.textContent = `Classifica di oggi (si resetta automaticamente ogni giorno! ).`;
  openBackdrop(lbBackdrop);

  try {
    const items = await fetchLeaderboard(dayOffset);
    renderLeaderboard(items);
  } catch (e) {
    lbList.innerHTML = `<div class="muted">Errore nel caricare la classifica.</div>`;
    lbHint.textContent = String(e?.message || e);
  }
}

(async function main() {
  // 1) Firebase
  await initFirebase();

  // 2) Wait for game component
  await customElements.whenDefined("game-app");
  const game = document.querySelector("game-app");
  if (!game) return;

  const LOGO_SRC = "images/sirius-parole-logo.png";

  const applyHeaderBranding = () => {
    try {
      const header = game.shadowRoot?.querySelector("header");
      if (!header) return;

      const titleEl =
        header.querySelector(".title") ||
        header.querySelector("#title") ||
        header.querySelector("h1") ||
        header.querySelector("h2");
      if (!titleEl) return;

      header.style.position = "relative";
      const menus = header.querySelectorAll(".menu");
      menus.forEach((m) => {
        m.style.minWidth = "44px";
        m.style.display = "flex";
        m.style.alignItems = "center";
        m.style.justifyContent = "center";
        m.style.zIndex = "1";
      });

      titleEl.style.position = "absolute";
      titleEl.style.left = "50%";
      titleEl.style.top = "50%";
      titleEl.style.transform = "translate(-50%, -50%)";
      titleEl.style.display = "flex";
      titleEl.style.justifyContent = "center";
      titleEl.style.alignItems = "center";
      titleEl.style.width = "100%";
      titleEl.style.pointerEvents = "none";

      let img = titleEl.querySelector("img#siriusHeaderLogo");
      if (!img) {
        titleEl.textContent = "";
        img = document.createElement("img");
        img.id = "siriusHeaderLogo";
        img.src = LOGO_SRC;
        img.alt = "Sirius Parole";
        titleEl.appendChild(img);
      }

      img.style.height = "40px";
      img.style.width = "auto";
      img.style.display = "block";
      img.style.margin = "0 auto";
    } catch (_) {}
  };

  const removeSettings = () => {
    try {
      const btn = game.shadowRoot?.getElementById("settings");
      if (btn) btn.remove();
    } catch (_) {}
  };

  const killStats = () => {
    try {
      const root = game.shadowRoot;
      if (!root) return;
      root.querySelectorAll("game-stats").forEach((el) => el.remove());
      root.querySelectorAll("countdown-timer").forEach((el) => el.remove());

      const gameModal = root.querySelector("game-modal");
      if (gameModal?.shadowRoot) {
        gameModal.shadowRoot.querySelectorAll("game-stats, countdown-timer").forEach((el) => el.remove());
        const overlay = gameModal.shadowRoot.querySelector(".overlay");
        if (overlay) overlay.classList.remove("open");
      }
    } catch (_) {}
  };

  const openLeaderboardFlow = async (ctxGame) => {
    const name = getStoredName();
    if (!name) {
      nameInput.value = "";
      openBackdrop(nameBackdrop);
      setTimeout(() => nameInput.focus(), 50);
      return;
    }

    const dayOffset = ctxGame.dayOffset;
    const gs = String(ctxGame.gameStatus || "").toLowerCase();
    const isWin = gs.includes("win") || gs.includes("won");

    let attempts =
      typeof ctxGame.rowIndex === "number" && ctxGame.rowIndex >= 1 ? ctxGame.rowIndex : 7;

    if (isWin) {
      attempts = Math.min(Math.max(attempts, 1), 6);
      await upsertScore(dayOffset, name, attempts, "win");
    } else {
      await upsertScore(dayOffset, name, 7, "lose");
    }

    await showLeaderboardModal(dayOffset);
  };

  // Apply immediately and on rerender
  applyHeaderBranding();
  removeSettings();
  killStats();

  const rootObserver = new MutationObserver(() => {
    applyHeaderBranding();
    removeSettings();
    killStats();
  });
  rootObserver.observe(game.shadowRoot, { childList: true, subtree: true });

  // 3) Name gate per day
  currentDayOffset = game.dayOffset;
  const lastDay = localStorage.getItem(LS_DAY_KEY);
  const existingName = getStoredName();
  if (lastDay !== String(currentDayOffset)) {
    nameInput.value = existingName || "";
    openBackdrop(nameBackdrop);
    setTimeout(() => nameInput.focus(), 50);
  }

  // 4) Replace original stats modal with our leaderboard
  game.showStatsModal = async function () {
    killStats();
    await openLeaderboardFlow(this);
  };

  // 5) Intercept stats button clicks in capture phase (no old modal / no timer)
  const interceptStatsOpen = (e) => {
    const path = e.composedPath ? e.composedPath() : [];
    const isStatsTrigger = path.some(
      (el) =>
        el &&
        ((el.id && el.id.toLowerCase() === "statistics") ||
          (el.getAttribute && el.getAttribute("data-id") === "statistics") ||
          (el.getAttribute && el.getAttribute("aria-label") === "statistics"))
    );

    if (!isStatsTrigger) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    killStats();
    openLeaderboardFlow(game);
  };

  game.shadowRoot?.addEventListener("click", interceptStatsOpen, true);
  document.addEventListener("click", killStats, true);
  document.addEventListener("keydown", killStats, true);
})();
