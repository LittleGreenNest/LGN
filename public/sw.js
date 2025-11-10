/* global self, caches, fetch */
const SW_VERSION = "sprouttie-v4";   // <— bump this every deploy
const CACHE = SW_VERSION;            // keep using SW_VERSION for cache name
console.log("[SW] loaded", SW_VERSION);const OFFLINE_URL = "/offline.html";
const BYPASS = new Set(["/sw.js"]);      // don't intercept SW itself

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

  // let the SW file bypass the handler so it can update
  if (BYPASS.has(url.pathname)) return;

  // network-first for API and non-GET
  if (url.pathname.startsWith("/api/") || event.request.method !== "GET") {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // app shell strategy
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(event.request, copy));
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached || caches.match(OFFLINE_URL);
      })
  );
});
