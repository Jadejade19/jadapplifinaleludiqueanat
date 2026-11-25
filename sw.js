const CACHE = "jadjeudanat-v19";
const FILES = ["./", "./index.html", "./style.css", "./app.js", "./corps-art.js", "./accessoires-art.js", "./animals-data.js", "./animals-data2.js", "./animals-data3.js", "./animals-art.js", "./animals-rates.js", "./rigolos-enfants.js", "./rigolos.js", "./compagnon-art.js", "./tableaux-data.js", "./cadeaux-art.js", "./garde-robe-art.js", "./parc.js",
  "./questions.js", "./fiches-images.js", "./manifest.json", "./nunito.woff2", "./icon.svg", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(FILES.map(f => c.add(new Request(f, { cache: "reload" }))))));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("jadjeudanat-") && k !== CACHE).map(async k => {
        const old = await caches.open(k), now = await caches.open(CACHE);
        for (const r of await old.keys()) if (/\/(images|tableaux)-\d+\.js$/.test(new URL(r.url).pathname)) { const x = await old.match(r); if (x) await now.put(r, x); }
        return caches.delete(k);
      })))
      .then(() => self.clients.claim())
  );
});

const put = (req, res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };

// Images du cours (lourdes, jamais modifiées) : cache d'abord.
// Le reste : réseau d'abord (pour recevoir les mises à jour), cache en secours hors ligne.
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  const hit = () => caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: true }));
  if (/\/(images|tableaux)-\d+\.js$/.test(url.pathname)) { e.respondWith(hit().then(h => h || fetch(e.request).then(r => put(e.request, r)))); return; }
  e.respondWith(
    fetch(e.request).then(r => put(e.request, r))
      .catch(() => hit().then(h => h || (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
