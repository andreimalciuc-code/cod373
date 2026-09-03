/* Cod373 service worker — stale-while-revalidate pentru pagini (rapid), cache-first pentru resurse */
/* Versiunea LIVE curentă e constanta CACHE de mai jos — ea e sursa de adevăr, nu
   comentariul și nu numărul din mesajul de commit. v372 = INVITE1-B.1 (linkul de
   invitație duce la ecranul de activare). v373 = TASK2-A.2 (Task Center Pro,
   acceptarea responsabilității, notificări live). */
const CACHE = 'cod373-v428';
const ASSETS = [
  './app.html', './mobil.html', './acces.html', './portal.html', './erp.html', './grafic.html', './deviz.html', './factura.html', './i18n.js', './catalog-form.js', './client-shell.css',
  './manifest.webmanifest', './manifest-mobil.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png'
];

/* `cache.add(url)` trece prin cache-ul HTTP al browserului: dacă acolo stă încă
   sub-resursa de la versiunea anterioară (i18n.js și catalog-form.js se cer FĂRĂ
   cache-buster), noul cache se umple cu fișiere VECHI — adică exact combinația
   pe care versionarea trebuia s-o excludă: pagină nouă + dicționar/formular vechi.
   `{cache:'reload'}` obligă fiecare intrare din precache să vină de pe rețea.
   Reprodus la testarea UX2: SW-ul v360 a preluat un `i18n.js` cu 1319 octeți mai
   mic decât cel servit de server, fără nicio eroare. */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(a => c.add(new Request(a, { cache: 'reload' })).catch(()=>{}))))
      .then(() => self.skipWaiting())
  );
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
  // TASK2-A.2: payload-ul poartă DOUĂ ținte — una de teren, una de birou. Alegerea se face
  // la clic, după fereastra care e deschisă, nu aici.
  const opts = { body: d.body || '', icon: './icon-192.png', badge: './icon-192.png',
    data: { url: d.url || './app.html', appUrl: d.app_url || '' },
    tag: d.tag || 'cod373', requireInteraction: true, renotify: true };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const dt = e.notification.data || {};
  const target = dt.url || './app.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
      for (const w of ws) {
        if ('focus' in w) {
          // Cine lucrează la birou nu vrea să fie aruncat în aplicația de teren doar
          // pentru că a atins o notificare — și invers.
          const t = (dt.appUrl && String(w.url || '').indexOf('app.html') >= 0) ? dt.appUrl : target;
          w.focus(); if ('navigate' in w) { try { w.navigate(t); } catch (_) {} } return;
        }
      }
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
