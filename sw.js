/* Service worker de KOSTOV: l'app s'obre també sense connexió.
   - La pàgina i les icones: primer la xarxa (per rebre les versions noves), i si no n'hi ha, la còpia desada.
   - Les tipografies de Google: es desen el primer cop i després es fan servir des de la memòria.
   - El temps i els festius no es desen aquí: la pàgina ja recorda els festius i, sense xarxa, mostra "No disponible". */
const VERSION = 'kostov-v4';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './favicon-48.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // pàgina i fitxers propis: xarxa primer, còpia desada si no hi ha connexió
  if (req.mode === 'navigate' || url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() =>
        caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))
      )
    );
    return;
  }

  // tipografies: memòria primer, i s'actualitzen en segon pla
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(VERSION).then(async c => {
        const hit = await c.match(req);
        const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    );
  }
  // la resta (temps, geolocalització inversa, festius): directament a la xarxa
});
