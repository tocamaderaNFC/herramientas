// Guarda la app para abrirla sin conexión. Las llamadas a GitHub no se cachean acá.
const C='cobros-v2', FILES=['./','index.html','generador.js','manifest.json','icon.svg','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>{
  if(new URL(e.request.url).origin!==location.origin) return;
  e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(C).then(c=>c.put(e.request,cp)); return r; }).catch(()=>caches.match(e.request)));
});
