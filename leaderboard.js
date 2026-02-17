import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAR_d84pgAreyt4dDqxgGvN8VPl8kmgCfc",
  authDomain: "parole-sirius.firebaseapp.com",
  projectId: "parole-sirius",
  storageBucket: "parole-sirius.firebasestorage.app",
  messagingSenderId: "429496599887",
  appId: "1:429496599887:web:1e609cf40b7c047ec8713a"
};

const LS_NAME_KEY = "parle_player_name_v1";

function openBackdrop(el){ el.style.display="flex"; el.setAttribute("aria-hidden","false"); }
function closeBackdrop(el){ el.style.display="none"; el.setAttribute("aria-hidden","true"); }
function normalizeName(name){ return (name||"").trim().replace(/\s+/g," ").slice(0,20); }
function getStoredName(){ return normalizeName(localStorage.getItem(LS_NAME_KEY)); }
function setStoredName(name){ localStorage.setItem(LS_NAME_KEY, normalizeName(name)); }

const nameBackdrop = document.getElementById("nameBackdrop");
const nameInput = document.getElementById("playerNameInput");
const nameOkBtn = document.getElementById("nameOkBtn");
const nameCloseBtn = document.getElementById("nameCloseBtn");

const lbBackdrop = document.getElementById("lbBackdrop");
const lbCloseBtn = document.getElementById("lbCloseBtn");
const lbList = document.getElementById("lbList");
const lbSubtitle = document.getElementById("lbSubtitle");
const lbHint = document.getElementById("lbHint");

nameCloseBtn.addEventListener("click", () => { if (!getStoredName()) return; closeBackdrop(nameBackdrop); });
lbCloseBtn.addEventListener("click", () => closeBackdrop(lbBackdrop));
nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") nameOkBtn.click(); });

nameOkBtn.addEventListener("click", () => {
  const v = normalizeName(nameInput.value);
  if (!v) { nameInput.focus(); nameInput.style.borderColor="rgba(255,80,80,.8)"; return; }
  nameInput.style.borderColor="rgba(255,255,255,.12)";
  setStoredName(v);
  closeBackdrop(nameBackdrop);
});

let db, uid;
async function initFirebase(){
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  const auth = getAuth(app);
  const res = await signInAnonymously(auth);
  uid = res.user.uid;
}

async function upsertScore(dayOffset, name, attempts, status){
  const ref = doc(db, "leaderboards", String(dayOffset), "scores", uid);
  await setDoc(ref, { name, attempts, status, ts: serverTimestamp() }, { merge: true });
}

async function fetchLeaderboard(dayOffset){
  const scoresCol = collection(db, "leaderboards", String(dayOffset), "scores");
  const q = query(scoresCol, orderBy("attempts","asc"), orderBy("ts","asc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

function renderLeaderboard(items){
  lbList.innerHTML = "";
  if (!items.length) { lbList.innerHTML = `<div class="muted">Nessun punteggio ancora. Sei il primo 🙂</div>`; return; }
  items.forEach((it, idx) => {
    const attemptsLabel = (it.status === "win") ? `${it.attempts}/6` : "X";
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

async function showLeaderboardModal(dayOffset){
  lbSubtitle.textContent = `Puzzle #${dayOffset}`;
  lbHint.textContent = `La classifica si aggiorna con i punteggi di oggi.`;
  openBackdrop(lbBackdrop);
  try {
    const items = await fetchLeaderboard(dayOffset);
    renderLeaderboard(items);
  } catch (e) {
    lbList.innerHTML = `<div class="muted">Errore nel caricare la classifica.</div>`;
    lbHint.textContent = String(e?.message || e);
  }
}

(async function main(){
  if (!getStoredName()){
    nameInput.value = "";
    openBackdrop(nameBackdrop);
    setTimeout(() => nameInput.focus(), 50);
  }

  await initFirebase();

  await customElements.whenDefined("game-app");
  const game = document.querySelector("game-app");
  if (!game) return;

  const originalShowStats = game.showStatsModal?.bind(game);

  game.showStatsModal = async function(){
    const name = getStoredName();
    if (!name){
      nameInput.value = "";
      openBackdrop(nameBackdrop);
      setTimeout(() => nameInput.focus(), 50);
      return;
    }

    const dayOffset = this.dayOffset;
    let attempts = (typeof this.rowIndex === "number" && this.rowIndex >= 1) ? this.rowIndex : 7;

    if (attempts >= 1 && attempts <= 6) {
      await upsertScore(dayOffset, name, attempts, "win");
    } else {
      await upsertScore(dayOffset, name, 7, "lose");
    }

    await showLeaderboardModal(dayOffset);

    // non mostrare più la finestra statistiche originale
    // originalShowStats?.();
  };

  // se per qualche motivo appare comunque <game-stats>, rimuovilo
  document.addEventListener("click", () => {
    const statsEl = document.querySelector("game-stats");
    if (statsEl) statsEl.remove();
  }, true);
})();
