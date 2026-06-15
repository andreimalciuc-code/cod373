/* Cod373 service worker — network-first pentru pagini, cache-first pentru resurse */
const CACHE = 'cod373-v63';
const ASSETS = [
  './app.html', './mobil.html', './portal.html', './erp.html', './grafic.html', './deviz.html', './factura.html', './i18n.js',
  './manifest.webmanifest', './manifest-mobil.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  const url = new URL(req.url);
  // nu interceptăm apelurile către Supabase / CDN-uri externe
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' || req.destination === 'document' || /\.html(\?|$)/.test(url.pathname);
  if (isPage) {
    // network-first: proaspăt online, din cache offline
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(url.pathname, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(url.pathname).then(h => h || caches.match('./app.html')))
    );
    return;
  }
  // cache-first pentru resurse statice locale
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return resp;
    }).catch(() => undefined))
  );
});
