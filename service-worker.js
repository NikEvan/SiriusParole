// Service Worker — Sirius Parole 3.0
// Strategia NETWORK-FIRST: si prova sempre la rete, la cache serve solo da riserva
// quando si è offline. Così gli aggiornamenti arrivano subito, senza svuotare la cache.
//
// IMPORTANTE: quando cambi CACHE_VERSION, le vecchie cache vengono eliminate.
// Cambiala se in futuro serve forzare una pulizia completa su tutti i dispositivi.
const CACHE_VERSION = "sirius3-v2";

const ASSETS = [
  "./", "./index.html", "./style.css",
  "./game.js", "./words.js", "./leaderboard.js",
  "./manifest.json", "./images/sirius-parole-logo.png",
];

self.addEventListener("install", (e) => {
  // Precarico i file per il primo uso offline
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  // Elimino ogni cache che non sia la versione corrente
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Tutto ciò che è esterno (Firebase, Treccani, CDN) non viene intercettato
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        // Aggiorno la copia in cache per l'uso offline
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copia)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        // Offline: uso la cache; se manca e si tratta di una pagina, torno all'index
        caches.match(req).then((cached) =>
          cached || (req.mode === "navigate" ? caches.match("./index.html") : undefined)
        )
      )
  );
});
