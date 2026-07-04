// Spare Part Inventory — Service Worker
// Cache-first, fully offline. Bump CACHE_VERSION on any asset change to force refresh.
const CACHE_VERSION = "v4";
const CACHE_NAME = `spareparts-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/app.js",
  "./js/router.js",
  "./js/db.js",
  "./js/state.js",
  "./js/license.js",
  "./js/protection.js",
  "./js/seed.js",
  "./js/components/activation.js",
  "./js/components/modal.js",
  "./js/components/nav.js",
  "./js/components/scanner.js",
  "./js/components/toast.js",
  "./js/utils/helpers.js",
  "./js/utils/icons.js",
  "./js/utils/print.js",
  "./js/utils/qrlabels.js",
  "./js/views/byEquipment.js",
  "./js/views/dashboard.js",
  "./js/views/help.js",
  "./js/views/importExport.js",
  "./js/views/partDetail.js",
  "./js/views/parts.js",
  "./js/views/reorder.js",
  "./js/views/settings.js",
  "./vendor/xlsx.full.min.js",
  "./vendor/jsQR.js",
  "./vendor/qrcode.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          if (request.mode === "navigate") return caches.match("./index.html");
          return caches.match(request);
        });
    })
  );
});
