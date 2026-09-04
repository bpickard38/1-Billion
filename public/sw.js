// 1 Billion service worker.
// Phase 0: install + activate only. Push handlers arrive in Phase 9.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
