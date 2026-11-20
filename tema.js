// ====== SIRIUS PAROLE — Temi stagionali ======
//
// Questo file e' completamente separato dal gioco: se lo togli dall'index.html
// tutto torna esattamente com'era. Non modifica punteggi, classifiche o partite.
//
// HALLOWEEN: dal 1 al 31 ottobre.
//   zucche, fantasmini, ragnatele, pipistrelli alla vittoria.
//
// NATALE: dal 23 novembre al 6 gennaio.
//   neve continua, Babbo Natale che cammina e si puo' trascinare col dito,
//   decorazioni e lucine, regali alla vittoria, contorni rossi.
//
// PER PROVARE UN TEMA FUORI STAGIONE, aggiungi all'indirizzo:
//   ?tema=natale     oppure   ?tema=halloween
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
      if (v === "off" || v === "no" || v === "niente") return null;
      return v;
    }
    const oggi = new Date();
    const mese = oggi.getMonth();   // 0 = gennaio
    const giorno = oggi.getDate();

    if (mese === 9) return "halloween";                       // ottobre
    if (mese === 10 && giorno >= 23) return "natale";         // dal 23 novembre
    if (mese === 11) return "natale";                         // dicembre
    if (mese === 0 && giorno <= 6) return "natale";           // fino all'Epifania
    return null;
  }

  const TEMA = temaAttivo();
  if (TEMA === "halloween") avviaHalloween();
  else if (TEMA === "natale") avviaNatale();
  // nessun tema riconosciuto: il gioco resta intatto


  // ══════════════════════════════════════════════════════════
  //  TEMA HALLOWEEN
  // ══════════════════════════════════════════════════════════
  function avviaHalloween() {
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
  }

  // ══════════════════════════════════════════════════════════
  //  TEMA NATALE
  // ══════════════════════════════════════════════════════════
  function avviaNatale() {
    const css = `
      #tema-layer {
        position: fixed; inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 5;
      }

      /* ---- Contorni delle caselle in rosso ---- */
      #board .tile:not(.correct):not(.present):not(.absent) {
        border-color: #8e2b2b;
      }
      #board .tile.filled:not(.correct):not(.present):not(.absent) {
        border-color: #e23b3b;
        box-shadow: 0 0 8px rgba(226,59,59,0.25);
      }
      #board-wrap { filter: drop-shadow(0 0 20px rgba(200,40,40,0.10)); }
      header { border-bottom-color: #8e2b2b !important; }
      #help-btn {
        border-color: rgba(226,59,59,0.55) !important;
        color: #e86b6b !important;
      }

      /* ---- Festone di lucine sotto l'intestazione ---- */
      .natale-filo {
        position: absolute;
        left: 0; right: 0;
        height: 18px;
        pointer-events: none;
      }
      .natale-luce {
        position: absolute;
        top: 0;
        width: 7px; height: 11px;
        border-radius: 50% 50% 55% 55%;
        animation: luceLampeggia 2.4s ease-in-out infinite;
      }
      .natale-luce::before {
        content: "";
        position: absolute;
        top: -3px; left: 2px;
        width: 3px; height: 3px;
        background: #6b5a3a;
        border-radius: 1px;
      }
      @keyframes luceLampeggia {
        0%, 100% { opacity: 1;   filter: brightness(1.25); }
        50%      { opacity: 0.45; filter: brightness(0.8); }
      }

      /* ---- Decorazioni nell'intestazione ---- */
      .natale-deco {
        position: absolute;
        top: 50%;
        line-height: 1;
        transform-origin: 50% 0%;
        animation: decoDondola 3s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes decoDondola {
        0%, 100% { transform: translateY(-50%) rotate(-7deg); }
        50%      { transform: translateY(-50%) rotate(7deg); }
      }

      /* ---- Babbo Natale ---- */
      #babbo {
        position: fixed;
        width: 64px; height: 76px;
        pointer-events: auto;      /* si puo' afferrare */
        cursor: grab;
        touch-action: none;        /* niente scroll mentre lo trascini */
        z-index: 30;
        filter: drop-shadow(0 3px 5px rgba(0,0,0,0.45));
        will-change: transform;
      }
      #babbo.preso { cursor: grabbing; }
      #babbo .gamba-sx, #babbo .gamba-dx,
      #babbo .braccio-sx { transform-origin: 50% 10%; }
      #babbo.cammina .gamba-sx { animation: passoA 0.46s ease-in-out infinite alternate; }
      #babbo.cammina .gamba-dx { animation: passoB 0.46s ease-in-out infinite alternate; }
      #babbo.cammina .braccio-sx { animation: passoB 0.46s ease-in-out infinite alternate; }
      @keyframes passoA { from { transform: rotate(16deg); }  to { transform: rotate(-16deg); } }
      @keyframes passoB { from { transform: rotate(-16deg); } to { transform: rotate(16deg); } }
      #babbo.preso .gamba-sx, #babbo.preso .gamba-dx,
      #babbo.preso .braccio-sx { animation: dondolaAppeso 0.7s ease-in-out infinite alternate; }
      @keyframes dondolaAppeso { from { transform: rotate(-8deg); } to { transform: rotate(8deg); } }

      /* ---- Regali della vittoria ---- */
      .regalo {
        position: absolute;
        border-radius: 2px;
        will-change: transform;
      }
      .regalo i {
        position: absolute;
        background: #f5e7b8;
      }
      .regalo .nastro-v { left: 38%; top: 0; width: 24%; height: 100%; }
      .regalo .nastro-o { top: 38%; left: 0; height: 24%; width: 100%; }
      .regalo .fiocco {
        top: -22%; left: 24%;
        width: 52%; height: 32%;
        border-radius: 50%;
        background: transparent;
        border: 2px solid #f5e7b8;
      }
    `;
    const stile = document.createElement("style");
    stile.id = "tema-stile";
    stile.textContent = css;
    document.head.appendChild(stile);

    const strato = document.createElement("div");
    strato.id = "tema-layer";
    document.body.appendChild(strato);

    const caso = (min, max) => min + Math.random() * (max - min);
    const inPausa = () => document.visibilityState !== "visible";

    // ─────────── Neve continua, leggera ───────────
    function neve() {
      const canvas = document.createElement("canvas");
      canvas.id = "neve-canvas";
      canvas.style.cssText =
        "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;";
      document.body.appendChild(canvas);
      const ctx = canvas.getContext("2d");

      let W = 0, H = 0, fiocchi = [];
      function dimensiona() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        // Densita' misurata: ne bastano pochi per dare l'idea senza appesantire
        const quanti = Math.round(Math.min(70, Math.max(28, (W * H) / 16000)));
        fiocchi = [];
        for (let i = 0; i < quanti; i++) {
          fiocchi.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: caso(1.1, 2.9),
            vy: caso(0.25, 0.85),
            onda: caso(0, Math.PI * 2),
            vel: caso(0.004, 0.014),
            amp: caso(0.3, 1.1),
            op: caso(0.45, 0.9),
          });
        }
      }
      dimensiona();
      window.addEventListener("resize", dimensiona);

      function passo() {
        if (!inPausa()) {
          ctx.clearRect(0, 0, W, H);
          for (const f of fiocchi) {
            f.onda += f.vel;
            f.y += f.vy;
            f.x += Math.sin(f.onda) * f.amp;
            if (f.y > H + 6) { f.y = -6; f.x = Math.random() * W; }
            if (f.x > W + 6) f.x = -6;
            if (f.x < -6) f.x = W + 6;
            ctx.beginPath();
            ctx.fillStyle = `rgba(255,255,255,${f.op})`;
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
    }

    // ─────────── Festone di lucine e decorazioni ───────────
    function decoraIntestazione() {
      const testata = document.querySelector("header");
      if (!testata || testata.querySelector(".natale-deco")) return;
      testata.style.position = "relative";

      const deco = [
        { right: "46px", txt: "🎄", delay: "0s",   size: "19px" },
        { right: "74px", txt: "🔔", delay: "0.6s", size: "15px" },
        { right: "98px", txt: "⭐", delay: "1.1s", size: "14px" },
        { left: "12px",  txt: "🎄", delay: "1.4s", size: "19px" },
        { left: "38px",  txt: "🎁", delay: "0.3s", size: "15px" },
        { left: "62px",  txt: "❄️", delay: "0.9s", size: "14px" },
      ];
      for (const d of deco) {
        const s = document.createElement("span");
        s.className = "natale-deco";
        s.textContent = d.txt;
        if (d.right) s.style.right = d.right;
        if (d.left) s.style.left = d.left;
        s.style.animationDelay = d.delay;
        s.style.fontSize = d.size;
        testata.appendChild(s);
      }

      // Filo di lucine appeso sotto l'intestazione
      const filo = document.createElement("div");
      filo.className = "natale-filo";
      const r = testata.getBoundingClientRect();
      filo.style.top = (r.bottom - 1) + "px";
      const colori = ["#e23b3b", "#3bb54a", "#f0c419", "#4a90e2", "#e87fd0"];
      const passo = 26;
      const quante = Math.ceil(window.innerWidth / passo);
      for (let i = 0; i < quante; i++) {
        const l = document.createElement("span");
        l.className = "natale-luce";
        l.style.left = (i * passo + 8) + "px";
        l.style.background = colori[i % colori.length];
        l.style.boxShadow = `0 0 7px ${colori[i % colori.length]}`;
        l.style.animationDelay = (i % 5) * 0.3 + "s";
        filo.appendChild(l);
      }
      strato.appendChild(filo);
    }

    // ─────────── Babbo Natale disegnato, cammina e si trascina ───────────
    const BABBO_SVG = `
      <svg viewBox="0 0 64 76" width="64" height="76" xmlns="http://www.w3.org/2000/svg">
        <!-- sacco -->
        <g>
          <path d="M44 30 q12 2 13 14 q1 11 -10 12 q-11 1 -12 -10 q-1 -13 9 -16 z" fill="#8a5a2b"/>
          <path d="M44 30 q5 -3 9 -1 q-3 3 -9 4 z" fill="#6f4621"/>
        </g>
        <!-- braccio dietro (tiene il sacco) -->
        <g class="braccio-dx">
          <rect x="38" y="33" width="9" height="20" rx="4.5" fill="#c62828"/>
        </g>
        <!-- gambe -->
        <g class="gamba-sx">
          <rect x="21" y="52" width="9" height="17" rx="4" fill="#7b1f1f"/>
          <rect x="18" y="66" width="14" height="8" rx="3" fill="#2b2b2b"/>
        </g>
        <g class="gamba-dx">
          <rect x="32" y="52" width="9" height="17" rx="4" fill="#8e2424"/>
          <rect x="30" y="66" width="14" height="8" rx="3" fill="#1f1f1f"/>
        </g>
        <!-- cappotto -->
        <path d="M20 32 q12 -5 24 0 l3 23 q-15 5 -30 0 z" fill="#d32f2f"/>
        <rect x="18" y="51" width="28" height="6" rx="2" fill="#2b2b2b"/>
        <rect x="28" y="50" width="8" height="8" rx="1.5" fill="#f0c419"/>
        <rect x="30.5" y="52.5" width="3" height="3" rx="0.6" fill="#b8950f"/>
        <!-- pelliccia del cappotto -->
        <rect x="18" y="29" width="28" height="6" rx="3" fill="#f7f7f7"/>
        <!-- braccio davanti -->
        <g class="braccio-sx">
          <rect x="15" y="33" width="9" height="20" rx="4.5" fill="#e03b3b"/>
          <circle cx="19.5" cy="55" r="5" fill="#f7f7f7"/>
        </g>
        <!-- testa -->
        <circle cx="32" cy="20" r="11" fill="#f3c8a0"/>
        <!-- barba -->
        <path d="M22 20 q2 16 10 17 q8 -1 10 -17 q-10 7 -20 0 z" fill="#f7f7f7"/>
        <ellipse cx="32" cy="27" rx="4" ry="2.6" fill="#e8b0a0"/>
        <!-- baffi -->
        <path d="M26 24 q6 3 12 0 q-6 5 -12 0 z" fill="#ffffff"/>
        <!-- occhi -->
        <circle cx="28" cy="18" r="1.5" fill="#2b2b2b"/>
        <circle cx="36" cy="18" r="1.5" fill="#2b2b2b"/>
        <!-- naso -->
        <circle cx="32" cy="21.5" r="2.4" fill="#e8846b"/>
        <!-- cappello -->
        <path d="M20 13 q12 -11 24 0 z" fill="#d32f2f"/>
        <path d="M43 13 q6 -4 8 -11 q-7 0 -11 5 z" fill="#d32f2f"/>
        <rect x="19" y="11" width="26" height="6" rx="3" fill="#f7f7f7"/>
        <circle cx="52" cy="2.5" r="4" fill="#f7f7f7"/>
      </svg>`;

    function babboNatale() {
      const b = document.createElement("div");
      b.id = "babbo";
      b.innerHTML = BABBO_SVG;
      b.title = "Trascinami!";
      document.body.appendChild(b);

      const L = 64, A = 76;
      let x = caso(20, Math.max(40, window.innerWidth - L - 20));
      let y = 0;                       // calcolata sotto
      let direzione = Math.random() < 0.5 ? 1 : -1;
      let velocita = caso(0.35, 0.75);
      let preso = false, caduta = 0;
      let scostamentoX = 0, scostamentoY = 0;

      function lineaCammino() {
        // Cammina appena sopra la tastiera, dove non copre la griglia
        const kb = document.getElementById("keyboard");
        if (kb) {
          const r = kb.getBoundingClientRect();
          return Math.max(60, r.top - A + 6);
        }
        return window.innerHeight - A - 180;
      }
      y = lineaCammino();

      function disegna() {
        b.style.transform =
          `translate(${x}px, ${y}px) scaleX(${direzione < 0 ? -1 : 1})`;
      }

      // ── Trascinamento ──
      function afferra(px, py) {
        preso = true;
        caduta = 0;
        b.classList.add("preso");
        b.classList.remove("cammina");
        scostamentoX = px - x;
        scostamentoY = py - y;
      }
      function muovi(px, py) {
        if (!preso) return;
        x = Math.min(window.innerWidth - L, Math.max(0, px - scostamentoX));
        y = Math.min(window.innerHeight - A, Math.max(0, py - scostamentoY));
        disegna();
      }
      function lascia() {
        if (!preso) return;
        preso = false;
        b.classList.remove("preso");
      }

      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        b.setPointerCapture && b.setPointerCapture(e.pointerId);
        afferra(e.clientX, e.clientY);
      });
      b.addEventListener("pointermove", (e) => { if (preso) muovi(e.clientX, e.clientY); });
      b.addEventListener("pointerup", lascia);
      b.addEventListener("pointercancel", lascia);

      // ── Movimento ──
      function passo() {
        if (!inPausa()) {
          const suolo = lineaCammino();
          if (preso) {
            b.classList.remove("cammina");
          } else if (y < suolo - 1) {
            // Cade dopo essere stato lasciato in alto
            caduta = Math.min(caduta + 0.55, 14);
            y = Math.min(suolo, y + caduta);
            b.classList.remove("cammina");
            disegna();
          } else {
            caduta = 0;
            y = suolo;
            b.classList.add("cammina");
            x += velocita * direzione;
            if (x <= 4) { x = 4; direzione = 1; velocita = caso(0.35, 0.75); }
            if (x >= window.innerWidth - L - 4) {
              x = window.innerWidth - L - 4; direzione = -1; velocita = caso(0.35, 0.75);
            }
            // Ogni tanto si ferma o cambia idea
            if (Math.random() < 0.0012) direzione *= -1;
            disegna();
          }
        }
        requestAnimationFrame(passo);
      }
      disegna();
      requestAnimationFrame(passo);
      window.addEventListener("resize", () => {
        x = Math.min(x, window.innerWidth - L - 4);
        disegna();
      });
    }

    // ─────────── Regali al posto dei coriandoli ───────────
    function lanciaRegali() {
      const vecchio = document.getElementById("regali-box");
      if (vecchio) vecchio.remove();

      const box = document.createElement("div");
      box.id = "regali-box";
      box.style.cssText =
        "position:fixed;inset:0;pointer-events:none;z-index:2000;overflow:hidden;";
      document.body.appendChild(box);

      const W = window.innerWidth, H = window.innerHeight;
      const colori = ["#e23b3b", "#2e9e4f", "#f0c419", "#4a90e2", "#d64fa0", "#e87c2a"];
      const pezzi = [];
      const quanti = 38;

      for (let i = 0; i < quanti; i++) {
        const lato = caso(11, 20);
        const el = document.createElement("div");
        el.className = "regalo";
        el.style.width = lato + "px";
        el.style.height = lato + "px";
        el.style.background = colori[Math.floor(Math.random() * colori.length)];
        el.innerHTML = `<i class="nastro-v"></i><i class="nastro-o"></i><i class="fiocco"></i>`;
        box.appendChild(el);
        pezzi.push({
          el,
          x: W / 2 + caso(-60, 60),
          y: H * 0.72,
          vx: caso(-5.5, 5.5),
          vy: caso(-15, -8),
          rot: caso(0, 360),
          vr: caso(-7, 7),
        });
      }

      const inizio = performance.now();
      function passo(ora) {
        const t = ora - inizio;
        for (const p of pezzi) {
          p.vy += 0.32;                 // gravita'
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vr;
          if (p.y > H - 14 && p.vy > 0) { p.vy *= -0.42; p.vx *= 0.7; p.y = H - 14; }
          p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`;
        }
        if (t < 3600) requestAnimationFrame(passo);
        else {
          box.style.transition = "opacity 0.6s";
          box.style.opacity = "0";
          setTimeout(() => box.remove(), 700);
        }
      }
      requestAnimationFrame(passo);

      try { if (navigator.vibrate) navigator.vibrate([90, 110, 90, 110, 200]); } catch (_) {}
    }

    window.__effettoVittoria = lanciaRegali;

    function avvia() {
      neve();
      decoraIntestazione();
      babboNatale();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", avvia);
    } else {
      avvia();
    }
    console.log("Tema attivo: natale 🎄");
  }

})();
