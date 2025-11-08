/* global self, caches, fetch */
const CACHE = "sprouttie-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([
      "/",
      "/offline.html",
      "/manifest.json",
      "/icons/icon-192.png",
      "/icons/icon-512.png"
    ]);
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))));
  })());
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // API: network-first for dynamic calls
  if (req.url.includes("/api/") || req.method !== "GET") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // App shell routes: try network, fall back to cache, then offline
  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, resClone));
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        return cached || caches.match(OFFLINE_URL);
      })
  );
});

