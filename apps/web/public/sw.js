const CACHE_NAME = 'aero-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/gesture_recognizer.task',
  '/assets/vision_wasm_internal.js',
  '/assets/vision_wasm_internal.wasm',
  '/assets/vision_wasm_nosimd_internal.js',
  '/assets/vision_wasm_nosimd_internal.wasm',
  '/icons/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png'
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
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
