const CACHE_NAME = '2048-game-v1';
const urlsToCache = [
  './',
  './index.html',
  './game.js',
  './style.css',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});
