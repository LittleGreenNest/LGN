/* global self, caches, fetch */
const CACHE = "sprouttie-v2"; // bump version
const OFFLINE_URL = "/offline.html";
const BYPASS_PATHS = new Set(["/sw.js"]); // do not intercept the SW file itself

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([
      "/",
      OFFLINE_URL,
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
  const url = new URL(event.request.url);

  // ✅ Do not handle the service worker file
  if (BYPASS_PATHS.has(url.pathname)) return;

  // Network-first for APIs and non-GET
  if (url.pathname.startsWith("/api/") || event.request.method !== "GET") {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // App shell: network → cache → offline
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached || caches.match(OFFLINE_URL);
      })
  );
});
