// App estática para abrirla sin conexión. Solo toca el cache directorio-v*, no cobros ni el resto del origin.
const C = "directorio-v1";
const FILES = ["./","index.html","app.js","data.js","manifest.json","icon.svg","icon-192.png","icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(C).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith("directorio-") && k !== C).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (!url.pathname.startsWith(new URL("./", location.href).pathname)) return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request)
        .then((r) => {
          if (r && r.ok) {
            const copy = r.clone();
            caches.open(C).then((c) => c.put(e.request, copy));
          }
          return r;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
