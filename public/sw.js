// Service worker: la app funciona sin conexión después de la primera visita.
// Los módulos grandes (/modules/*) NO se guardan acá: la app los guarda en IndexedDB.
const CACHE = "teologia-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallbackKey) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(fallbackKey || request, res.clone());
    return res;
  } catch {
    const hit = await cache.match(fallbackKey || request);
    if (hit) return hit;
    throw new Error("Sin conexión");
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Lista de módulos incluidos: red primero, con copia para uso sin conexión.
  if (url.pathname === "/modules/manifest.json") {
    event.respondWith(networkFirst(req));
    return;
  }
  if (url.pathname.startsWith("/modules/")) return;

  // Navegación: siempre la página principal (app de una sola página).
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, "/"));
    return;
  }

  // Archivos de la app (con hash en el nombre): caché primero.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
