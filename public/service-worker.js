self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Bypass the service worker for API calls to ensure backend requests succeed in PWA mode
  if (event.request.url.includes('/api/')) {
    return;
  }
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
