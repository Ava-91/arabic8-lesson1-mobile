const CACHE = "arabic8-lesson1-shell-v11";
const ASSETS = [
  "./assets/lesson1/window.svg",
  "./assets/lesson1/shirt-pants.jpg",
  "./assets/lesson1/women-garden.jpg",
  "./assets/lesson1/Prvin_Etisaminin_evi.jpg",
  "./assets/lesson1/stones.jpg",
  "./assets/lesson1/saadi.jpg",
  "./",
  "./index.html",
  "./404.html",
  "./manifest.webmanifest",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
  "./css/styles.css?v=30",
  "./js/app.js?v=28",
  "./js/storage.js",
  "./js/utils.js",
  "./js/data.js",
  "./js/data/topics.js",
  "./js/data/questions.js",
  "./js/data/lesson.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE)
              .then(cache => cache.put(event.request, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") return caches.match("./index.html");
          throw new Error("Offline resource unavailable");
        });
    })
  );
});
