// public/sw.js
// A very basic service worker primarily to satisfy PWA criteria for 'beforeinstallprompt'.

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  // event.waitUntil(
  //   caches.open('dodi-deals-cache-v1').then((cache) => {
  //     return cache.addAll([
  //       // '/', // Add essential assets to cache for basic offline experience if desired
  //       // '/manifest.json',
  //       // Other critical assets
  //     ]);
  //   })
  // );
  self.skipWaiting(); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  // event.waitUntil(
  //   caches.keys().then((cacheNames) => {
  //     return Promise.all(
  //       cacheNames.map((cacheName) => {
  //         if (cacheName !== 'dodi-deals-cache-v1') {
  //           return caches.delete(cacheName);
  //         }
  //       })
  //     );
  //   })
  // );
  return self.clients.claim(); // Take control of all open clients
});

self.addEventListener('fetch', (event) => {
  // console.log('[Service Worker] Fetching:', event.request.url);
  // Basic network-first strategy example (can be expanded)
  // event.respondWith(
  //   caches.match(event.request).then((response) => {
  //     return response || fetch(event.request);
  //   })
  // );
});
