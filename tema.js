// ====== SIRIUS PAROLE — Temi stagionali ======
//
// Questo file e' completamente separato dal gioco: se lo togli dall'index.html
// tutto torna esattamente com'era. Non modifica punteggi, classifiche o partite.
//
// HALLOWEEN: attivo automaticamente dal 1 al 31 ottobre.
//   - zucche che spuntano da dietro le caselle
//   - fantasmini che attraversano la griglia
//   - pipistrelli al posto dei coriandoli quando indovini
//
// PER PROVARLO PRIMA DI OTTOBRE:
//   aggiungi  ?tema=halloween  alla fine dell'indirizzo, cosi':
//   https://nikevan.github.io/SiriusParole/?tema=halloween
// PER SPEGNERLO:
//   ?tema=off

(function () {
  "use strict";

  // ─────────── Quale tema mostrare ───────────
  function temaAttivo() {
    let forzato = null;
    try {
      forzato = new URLSearchParams(location.search).get("tema");
    } catch (_) {}
    if (forzato) {
      const v = forzato.trim().toLowerCase();
      return (v === "off" || v === "no" || v === "niente") ? null : v;
    }
    // Automatico: ottobre = Halloween (getMonth() parte da 0, quindi 9 = ottobre)
    const oggi = new Date();
    if (oggi.getMonth() === 9) return "halloween";
    return null;
  }

  const TEMA = temaAttivo();
  if (TEMA !== "halloween") return;   // nessun tema: il gioco resta intatto

  // ─────────── Stili (iniettati, niente file CSS da toccare) ───────────
  const css = `
    #tema-layer {
      position: fixed; inset: 0;
      pointer-events: none;   /* non intercetta mai i tocchi */
      overflow: hidden;
      z-index: 5;             /* sopra la griglia, sotto i pannelli */
    }
    .tema-zucca {
      position: absolute;
      font-size: 26px;
      line-height: 1;
      opacity: 0;
      animation: zuccaSpunta 3.2s ease-in-out forwards;
      filter: drop-shadow(0 0 6px rgba(255,140,0,0.45));
    }
    @keyframes zuccaSpunta {
      0%   { transform: translateY(14px) scale(0.7); opacity: 0; }
      18%  { transform: translateY(-4px) scale(1);   opacity: 1; }
      30%  { transform: translateY(0px)  scale(1);   opacity: 1; }
      70%  { transform: translateY(0px)  scale(1);   opacity: 1; }
      100% { transform: translateY(16px) scale(0.7); opacity: 0; }
    }
    .tema-fantasma {
      position: absolute;
      font-size: 24px;
      line-height: 1;
      opacity: 0.85;
      animation: fantasmaCammina var(--durata, 9s) linear forwards;
      filter: drop-shadow(0 0 8px rgba(190,220,255,0.35));
    }
    @keyframes fantasmaCammina {
      0%   { transform: translateX(0) translateY(0) scaleX(var(--verso,1)); opacity: 0; }
      8%   { opacity: 0.85; }
      25%  { transform: translateX(25%) translateY(-7px) scaleX(var(--verso,1)); }
      50%  { transform: translateX(50%) translateY(0)    scaleX(var(--verso,1)); }
      75%  { transform: translateX(75%) translateY(-7px) scaleX(var(--verso,1)); }
      92%  { opacity: 0.85; }
      100% { transform: translateX(100%) translateY(0)   scaleX(var(--verso,1)); opacity: 0; }
    }
    /* Contorni della griglia in arancione. Le caselle gia' colorate
       (verde/giallo/grigio) restano come sono, per non confondere il gioco. */
    #board .tile:not(.correct):not(.present):not(.absent) {
      border-color: #a34d0b;
    }
    #board .tile.filled:not(.correct):not(.present):not(.absent) {
      border-color: #ff8c1a;
      box-shadow: 0 0 8px rgba(255,140,26,0.25);
    }
    #board-wrap {
      filter: drop-shadow(0 0 18px rgba(255,120,0,0.10));
    }
    header {
      border-bottom-color: #a34d0b !important;
    }
    /* Il punto interrogativo si intona al tema */
    #help-btn {
      border-color: rgba(255,140,26,0.55) !important;
      color: #ff8c1a !important;
    }
    /* Zucche accanto al punto interrogativo */
    .tema-zucca-header {
      position: absolute;
      top: 50%;
      font-size: 20px;
      line-height: 1;
      transform-origin: 50% 100%;
      animation: zuccaDondola 2.6s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes zuccaDondola {
      0%, 100% { transform: translateY(-50%) rotate(-9deg); }
      50%      { transform: translateY(-50%) rotate(9deg); }
    }

    /* Il contenitore viene spostato dal codice, il figlio anima le ali:
       se entrambi usassero transform l'animazione vincerebbe sul movimento. */
    .tema-ragnatela {
      position: absolute;
      font-size: 34px;
      line-height: 1;
      opacity: 0.22;
      pointer-events: none;
    }
    .tema-ragno {
      position: absolute;
      top: -30px;
      font-size: 20px;
      line-height: 1;
      animation: ragnoScende 8.5s ease-in-out forwards;
    }
    @keyframes ragnoScende {
      0%   { transform: translateY(0); opacity: 0; }
      10%  { opacity: 0.9; }
      45%  { transform: translateY(130px); }
      55%  { transform: translateY(118px); }
      90%  { opacity: 0.9; }
      100% { transform: translateY(-20px); opacity: 0; }
    }

    .tema-pipistrello {
      position: absolute;
      top: 0; left: 0;
      line-height: 1;
      will-change: transform;
    }
    .tema-ali {
      display: inline-block;
      animation: pipistrelloAli 0.28s ease-in-out infinite alternate;
    }
    @keyframes pipistrelloAli {
      from { transform: scaleX(1);    }
      to   { transform: scaleX(0.72); }
    }
  `;
  const stile = document.createElement("style");
  stile.id = "tema-stile";
  stile.textContent = css;
  document.head.appendChild(stile);

  // ─────────── Strato su cui disegnare ───────────
  const strato = document.createElement("div");
  strato.id = "tema-layer";
  document.body.appendChild(strato);

  const caso = (min, max) => min + Math.random() * (max - min);
  const inPausa = () => document.visibilityState !== "visible";

  function areaGriglia() {
    const b = document.getElementById("board");
    return b ? b.getBoundingClientRect() : null;
  }

  // ─────────── Zucca che spunta da dietro una casella ───────────
  function spuntaZucca() {
    if (inPausa()) return;
    const caselle = document.querySelectorAll("#board .tile");
    if (!caselle.length) return;
    const casella = caselle[Math.floor(Math.random() * caselle.length)];
    const r = casella.getBoundingClientRect();
    if (!r.width) return;

    const z = document.createElement("div");
    z.className = "tema-zucca";
    z.textContent = "🎃";
    // La posiziono al bordo inferiore della casella, cosi' sembra sbucare da dietro
    z.style.left = (r.left + r.width / 2 - 13) + "px";
    z.style.top = (r.top + r.height - 20) + "px";
    z.style.fontSize = caso(20, 28).toFixed(0) + "px";
    strato.appendChild(z);
    setTimeout(() => z.remove(), 3400);
  }

  // ─────────── Fantasmino che cammina sopra la griglia ───────────
  function passaFantasma() {
    if (inPausa()) return;
    const g = areaGriglia();
    if (!g) return;

    const f = document.createElement("div");
    f.className = "tema-fantasma";
    f.textContent = "👻";
    const altezza = caso(g.top + 10, g.bottom - 30);
    const versoDestra = Math.random() < 0.5;

    f.style.top = altezza + "px";
    f.style.fontSize = caso(18, 26).toFixed(0) + "px";
    f.style.setProperty("--durata", caso(7, 11).toFixed(1) + "s");
    if (versoDestra) {
      f.style.left = (g.left - 30) + "px";
      f.style.width = (g.width + 60) + "px";
      f.style.setProperty("--verso", "1");
    } else {
      f.style.left = (g.right + 30) + "px";
      f.style.width = (g.width + 60) + "px";
      f.style.setProperty("--verso", "-1");
      f.style.animationDirection = "reverse";
    }
    strato.appendChild(f);
    setTimeout(() => f.remove(), 12000);
  }

  // ─────────── Pipistrelli al posto dei coriandoli ───────────
  function lanciaPipistrelli() {
    const vecchio = document.getElementById("tema-pipistrelli");
    if (vecchio) vecchio.remove();

    const box = document.createElement("div");
    box.id = "tema-pipistrelli";
    box.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:2000;overflow:hidden;";
    document.body.appendChild(box);

    const W = window.innerWidth, H = window.innerHeight;
    const quanti = 22;
    const bestie = [];

    for (let i = 0; i < quanti; i++) {
      const el = document.createElement("div");
      el.className = "tema-pipistrello";
      el.style.fontSize = caso(16, 30).toFixed(0) + "px";
      const ali = document.createElement("span");
      ali.className = "tema-ali";
      ali.textContent = "🦇";
      ali.style.animationDuration = caso(0.18, 0.4).toFixed(2) + "s";
      el.appendChild(ali);
      box.appendChild(el);
      bestie.push({
        el,
        x: caso(0, W),
        y: H + caso(10, 200),
        vx: caso(-1.1, 1.1),
        vy: caso(-3.4, -1.7),
        onda: caso(0, Math.PI * 2),
        vel: caso(0.06, 0.14),
      });
    }

    const inizio = performance.now();
    function passo(ora) {
      const trascorso = ora - inizio;
      for (const b of bestie) {
        b.onda += b.vel;
        b.x += b.vx + Math.sin(b.onda) * 1.4;
        b.y += b.vy;
        b.el.style.transform = `translate(${b.x}px, ${b.y}px)`;
      }
      if (trascorso < 3200) {
        requestAnimationFrame(passo);
      } else {
        box.style.transition = "opacity 0.6s";
        box.style.opacity = "0";
        setTimeout(() => box.remove(), 700);
      }
    }
    requestAnimationFrame(passo);
  }

  // Il gioco chiamera' questa al posto dei coriandoli
  window.__effettoVittoria = lanciaPipistrelli;

  // ─────────── Zucche nell'intestazione, accanto al punto interrogativo ───────────
  function decoraIntestazione() {
    const testata = document.querySelector("header");
    if (!testata || testata.querySelector(".tema-zucca-header")) return;
    testata.style.position = "relative";

    // Fila di decorazioni: posizione, simbolo, ritardo del dondolio, dimensione
    const decorazioni = [
      { right: "46px", txt: "🎃", delay: "0s",   size: "20px" },
      { right: "76px", txt: "🦇", delay: "0.5s", size: "15px" },
      { right: "100px", txt: "🎃", delay: "1.0s", size: "15px" },
      { left: "12px",  txt: "🎃", delay: "1.3s", size: "20px" },
      { left: "40px",  txt: "🕸️", delay: "0.8s", size: "16px" },
      { left: "64px",  txt: "🎃", delay: "0.2s", size: "14px" },
    ];
    for (const d of decorazioni) {
      const s = document.createElement("span");
      s.className = "tema-zucca-header";
      s.textContent = d.txt;
      if (d.right) s.style.right = d.right;
      if (d.left) s.style.left = d.left;
      s.style.animationDelay = d.delay;
      s.style.fontSize = d.size;
      testata.appendChild(s);
    }
  }

  // ─────────── Ragnatele fisse negli angoli dello schermo ───────────
  function ragnatele() {
    const angoli = [
      { top: "0", left: "0", rot: "0deg" },
      { top: "0", right: "0", rot: "90deg" },
    ];
    for (const a of angoli) {
      const r = document.createElement("div");
      r.className = "tema-ragnatela";
      r.textContent = "🕸️";
      if (a.top) r.style.top = a.top;
      if (a.left) r.style.left = a.left;
      if (a.right) r.style.right = a.right;
      r.style.transform = `rotate(${a.rot})`;
      strato.appendChild(r);
    }
    // Un ragnetto che scende e risale da un filo, ogni tanto
    setInterval(() => {
      if (inPausa() || Math.random() > 0.5) return;
      const ragno = document.createElement("div");
      ragno.className = "tema-ragno";
      ragno.textContent = "🕷️";
      ragno.style.left = caso(30, window.innerWidth - 60).toFixed(0) + "px";
      strato.appendChild(ragno);
      setTimeout(() => ragno.remove(), 9000);
    }, 25000);
  }

  // ─────────── Avvio degli effetti ambientali ───────────
  // Ogni circa 20 secondi, sfasati tra loro per non farli comparire insieme.
  function avvia() {
    decoraIntestazione();

    // INTERVALLI: abbassa i numeri per renderli piu' frequenti, alzali per diradarli.
    ragnatele();

    setTimeout(() => {
      spuntaZucca();
      setInterval(() => {
        spuntaZucca();
        // Ogni tanto ne spuntano due insieme da caselle diverse
        if (Math.random() < 0.5) setTimeout(spuntaZucca, 900);
      }, 8000);
    }, 3000);

    setTimeout(() => {
      passaFantasma();
      setInterval(() => {
        passaFantasma();
        if (Math.random() < 0.45) setTimeout(passaFantasma, 2200);
      }, 9000);
    }, 6000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avvia);
  } else {
    avvia();
  }

  console.log("Tema attivo: halloween 🎃");
})();
