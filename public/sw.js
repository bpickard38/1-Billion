// 1 Billion service worker: install + activate only, so the app can be
// added to the iPhone home screen. No push, no offline cache.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
