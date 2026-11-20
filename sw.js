/* Offline support for the investor questionnaire.
   It stores only the page, icons and manifest. It never stores a client's answers.
   To release a new version, change CACHE below so phones drop the old copy. */
const CACHE = 'investor-qq-v17';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* The settings file: use the network when it answers, so a changed address arrives, otherwise use the saved copy. */
  if (url.pathname.endsWith('/config.js')) {
    e.respondWith(
      fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(hit => hit || new Response('', {headers: {'Content-Type': 'text/javascript'}})))
    );
    return;
  }

  /* Opening the app: use the network when it answers within 4 seconds so updates arrive, otherwise use the saved copy. */
  if (req.mode === 'navigate') {
    e.respondWith(
      Promise.race([fetch(req), new Promise((_, reject) => setTimeout(reject, 4000))])
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }

  /* Everything else: saved copy first, then the network. */
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    }))
  );
});
