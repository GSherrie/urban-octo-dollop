/* SherPay service worker — offline-first app shell (network-first with cache fallback) */
const CACHE = 'sherpay-v10';
const CORE = [
  './', 'index.html', 'styles.css?v=10', 'manifest.json',
  'js/store.js?v=10', 'js/ui.js?v=10', 'js/views-auth.js?v=10', 'js/views-main.js?v=10', 'js/views-editor.js?v=10', 'js/views-ops.js?v=10', 'js/views-biz.js?v=10', 'js/views-account.js?v=10',
  'assets/logo.png', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable.png', 'assets/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.open(CACHE).then((c) =>
          c.match(req).then((hit) => {
            if (hit) return hit;
            if (req.mode === 'navigate') return c.match('index.html');
            return Response.error();
          })
        )
      )
  );
});
