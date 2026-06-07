// SW_VERSION 由 build.sh 在 production 构建时自动注入（毫秒时间戳）
// dev 模式保留此默认值
var SW_VERSION = "v1780837491124";

self.addEventListener("install", function() {
  // 跳过等待，立即激活新 SW
  self.skipWaiting();
  // 当前版本缓存前缀——activate 阶段清理所有不是此前缀的缓存
  self.CURRENT_CACHE_PREFIX = "yukoli-v" + SW_VERSION + "-";
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(n) {
        // 删除所有非当前版本的 yukoli 缓存
        if (n.indexOf("yukoli-") === 0 && n.indexOf(self.CURRENT_CACHE_PREFIX) !== 0) {
          console.log("[SW] Deleting old cache:", n);
          return caches.delete(n);
        }
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener("message", function(e) {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
