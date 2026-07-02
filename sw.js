/* Cod373 service worker — stale-while-revalidate pentru pagini (rapid), cache-first pentru resurse */
const CACHE = 'cod373-v328';
const ASSETS = [
  './app.html', './mobil.html', './acces.html', './portal.html', './erp.html', './grafic.html', './deviz.html', './factura.html', './i18n.js',
  './manifest.webmanifest', './manifest-mobil.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(()=>{})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'Cod373', body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'Cod373';
  const opts = { body: d.body || '', icon: './icon-192.png', badge: './icon-192.png', data: { url: d.url || './app.html' }, tag: d.tag || 'cod373', requireInteraction: true, renotify: true };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './app.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
      for (const w of ws) { if ('focus' in w) { w.focus(); if ('navigate' in w) { try { w.navigate(target); } catch (_) {} } return; } }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
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
    // stale-while-revalidate: servim INSTANT din cache (rapid), reîmprospătăm în fundal.
    // Versiunea nouă se aplică la următoarea deschidere / prin actualizarea Service Worker-ului.
    e.respondWith(
      caches.open(CACHE).then(c => c.match(url.pathname).then(cached => {
        const net = fetch(req).then(resp => { c.put(url.pathname, resp.clone()).catch(()=>{}); return resp; })
          .catch(() => cached || caches.match('./app.html'));
        return cached || net;
      }))
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
