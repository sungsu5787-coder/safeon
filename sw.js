// ============================================================
//  SAMHWA SafeOn - Service Worker  v30
//  Stale-While-Revalidate  /api/* 캐시 금지
// ============================================================
const CACHE_VER    = 'safeon-v32';
const CACHE_STATIC = CACHE_VER + '-static';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/firebase-config.js',
  '/js/signature-canvas.js',
  '/js/html2canvas.min.js',
  '/js/qrcode.min.js',
  '/js/qr-modal.js',
  '/js/app.js',
  '/js/tbm.js',
  '/js/risk.js',
  '/js/checklist.js',
  '/js/history.js',
  '/js/workplan.js',
  '/js/ptw.js',
  '/js/accident.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192.svg',
  '/icons/mascot.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache =>
        Promise.allSettled(
          PRECACHE_URLS.map(url =>
            fetch(url, { cache: 'no-store' })
              .then(res => { if (res && res.status === 200) return cache.put(url, res); })
              .catch(() => {})
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_STATIC).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(async () => {
        const cache = await caches.open(CACHE_STATIC);
        const keys  = await cache.keys();
        self.clients.matchAll({ type: 'window' }).then(clients =>
          clients.forEach(c => {
            c.postMessage({ type: 'CACHE_READY',   version: CACHE_VER, count: keys.length, total: PRECACHE_URLS.length });
            c.postMessage({ type: 'CACHE_UPDATED', version: CACHE_VER });
          })
        );
      })
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.hostname !== self.location.hostname) return;
  // 동적 파일 — 캐시 완전 우회 (CF URL 자동갱신을 위해 필수)
  if (url.pathname === '/tunnel-url.txt' || url.pathname === '/cf-url.txt' || url.pathname === '/tunnel.log') {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => new Response('', { status: 200 })));
    return;
  }
  // API 요청 — 절대 캐시 금지, 항상 서버에서 직접 받음 (저장 후 이력 즉시 반영)
  if (url.pathname.startsWith('/api/')) return;
  const isAppFile = /\.(html|js|css|json)$/.test(url.pathname) || url.pathname === '/';
  if (isAppFile) { event.respondWith(staleWhileRevalidate(req)); return; }
  event.respondWith(cacheFirst(req));
});

async function staleWhileRevalidate(req) {
  const cache  = await caches.open(CACHE_STATIC);
  const cached = await cache.match(req);
  const networkUpdate = fetch(req, { cache: 'no-store' })
    .then(res => { if (res && res.status === 200 && res.type !== 'opaque') cache.put(req, res.clone()); return res; })
    .catch(() => null);
  if (cached) return cached;
  const res = await networkUpdate;
  if (res && res.status < 400) return res;
  const indexCache = await cache.match('/index.html');
  if (indexCache) return indexCache;
  return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
}

async function cacheFirst(req) {
  const cache  = await caches.open(CACHE_STATIC);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.status === 200) cache.put(req, res.clone());
    return res;
  } catch { return new Response('', { status: 404 }); }
}

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CACHE_REFRESH') {
    caches.open(CACHE_STATIC)
      .then(cache => Promise.allSettled(
        PRECACHE_URLS.map(url =>
          fetch(url, { cache: 'no-store' })
            .then(res => { if (res && res.status === 200) cache.put(url, res); })
            .catch(() => {})
        )
      ))
      .then(async () => {
        const cache = await caches.open(CACHE_STATIC);
        const keys  = await cache.keys();
        if (event.source) {
          event.source.postMessage('CACHE_REFRESHED');
          event.source.postMessage({ type: 'CACHE_READY', version: CACHE_VER, count: keys.length, total: PRECACHE_URLS.length });
        }
      });
  }
  if (event.data && event.data.type === 'CACHE_CHECK') {
    (async () => {
      const cache   = await caches.open(CACHE_STATIC);
      const keys    = await cache.keys();
      const cached  = new Set(keys.map(r => new URL(r.url).pathname));
      const missing = PRECACHE_URLS.filter(u => !cached.has(u));
      if (event.source) event.source.postMessage({ type: 'CACHE_STATUS', version: CACHE_VER, count: cached.size, total: PRECACHE_URLS.length, missing });
    })();
  }
});
