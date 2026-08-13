// App-shell cache for Visual Performance Studio (video-production.html).
// getUserMedia/MediaRecorder need a real camera and only work with the page
// actually running, so this isn't about using the app with no camera —
// it's what makes the shell installable as a PWA and lets it still load
// (to whatever extent the shell alone can) on a flaky connection.
const CACHE_NAME = "vp-studio-shell-v1";
const SHELL_FILES = [
  "video-production.html",
  "video-production.css",
  "video-production.js",
  "video-production-app.js",
  "style.css",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for the shell files themselves, network otherwise (never
// intercepts camera/media requests — those aren't normal fetch() calls).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
