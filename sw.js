// App-shell cache for the Sound Visualiser suite — the home hub
// (index.html, a plain landing page, no camera/mic of its own), Sound
// Nebula (nebula.html), Property Colour Reference (restore.html), and
// Video Production. Colour Vision Extreme/Colour Assist/Viewer/Tutorials
// are deliberately left out: that family is a separate product, packaged
// and marketed on its own (AR-glasses focused), not part of this bundle.
// getUserMedia/MediaRecorder/mic input need real hardware and only work
// with the page actually running — this is what makes the shell
// installable as a PWA and lets it still load (to whatever extent the
// shell alone can) on a flaky connection, not offline camera/mic use.
const CACHE_NAME = "sound-visualiser-shell-v12";
const SHELL_FILES = [
  "index.html",
  "home.css",
  "nebula.html",
  "script.js",
  "colorvision.css",
  "restore.html",
  "restore.js",
  "restore.css",
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
