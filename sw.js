var SW_VERSION = "v1-0-0";
self.addEventListener("install", function() { self.skipWaiting(); });
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(n) {
        if (n.indexOf("v0-0-7") >= 0 || n.indexOf("language-cache") >= 0 || n.indexOf("image-cache") >= 0) {
          return caches.delete(n);
        }
      }));
    }).then(function() { return self.clients.claim(); })
  );
});
self.addEventListener("message", function(e) {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
