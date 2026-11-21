const CACHE_NAME = 'longmon-hsk-v1.0.0';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/audio/sfx.js',
  './js/audio/tts.js',
  './js/audio/pitch.js',
  './js/data/loader.js',
  './js/game/engine.js',
  './js/game/modes.js',
  './js/memory/srs.js',
  './js/scoring/pinyin-util.js',
  './js/scoring/speech-grader.js',
  './js/storage/db.js',
  './js/ui/mascot.js',
  './js/ui/charts.js',
  './js/ui/views.js',
  './data/radicals.json',
  './data/stories.json',
  './data/hsk1.tsv',
  './data/hsk2.tsv',
  './data/hsk3.tsv',
  './data/hsk4.tsv',
  './data/hsk5.tsv'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});