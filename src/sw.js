// sw.js - Service Worker for caching language files and images
// Implements offline caching and intelligent cache management
//
// Environment-aware caching:
// - Development: Cache disabled for live reload
// - Production: Cache enabled for offline support and performance

const CACHE_VERSION = 'v0-0-5';

// Cache names (will be skipped in development)
const CACHE_NAME = `language-cache-${CACHE_VERSION}`;
const LANGUAGE_FILES_CACHE = `language-files-${CACHE_VERSION}`;
const IMAGE_CACHE = `image-cache-${CACHE_VERSION}`;

// ─── 环境检测 ────────────────────────────────────────────────────────────────
// 检测是否为开发环境
function isDevelopment() {
  // 方法 1: 通过环境变量（webpack 注入）
  // 支持注入 __SW_ENV__ = 'development' | 'production' | 'test' 或单独的布尔标志
  if (typeof __SW_ENV__ !== 'undefined') {
    try {
      const env = String(__SW_ENV__).toLowerCase();
      if (env === 'development' || env === 'test') return true;
    } catch (e) {
      // fallthrough
    }
  }
  if (typeof __DEVELOPMENT__ !== 'undefined' && __DEVELOPMENT__) {
    return true;
  }
  // 兼容旧项目：直接注入 __TEST__ 也视为开发/测试模式
  if (typeof __TEST__ !== 'undefined' && __TEST__) {
    return true;
  }
  // 方法 2: 通过 hostname 判断
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    return true;
  }
  // 方法 3: 通过 URL 路径判断（webpack-dev-server 通常使用 devServer 的端口）
  const devServerPorts = ['8080', '3000', '3001', '5000', '9000'];
  if (devServerPorts.includes(self.location.port)) {
    return true;
  }
  // 方法 4: 通过 hostname 关键词识别测试/预发环境
  const hostname = self.location.hostname.toLowerCase();
  if (/\b(test|staging|preview|dev|internal|local)\b/.test(hostname)) {
    return true;
  }
  return false;
}

const DEV_MODE = isDevelopment();

console.log('[SW] Mode:', DEV_MODE ? 'DEVELOPMENT (cache disabled)' : 'PRODUCTION (cache enabled)');

// ─── 图片缓存配置 ──────────────────────────────────────────────────────────────
const LOCAL_IMAGE_PATTERN = /^\/assets\/images\/.*\.(png|webp|jpg|jpeg|gif|svg)$/i;
const EXTERNAL_IMAGE_ORIGINS = [
  'img0.baidu.com',
  'img1.baidu.com',
  'img2.baidu.com',
  'img3.baidu.com',
  'liuzhoume.com',
  'images.unsplash.com',
];
const IMAGE_CACHE_MAX_ENTRIES = 100;

// Install-time pre-cache: only default languages (zh-CN + en).
const INSTALL_LANGUAGE_FILES = [
  './assets/lang/zh-CN-ui.json',
  './assets/lang/en-ui.json',
];

const LANGUAGE_FILES = INSTALL_LANGUAGE_FILES;

// Install event - cache language files (only in production)
self.addEventListener('install', (event) => {
  if (DEV_MODE) {
    console.log('[SW] Development mode: skipping install caching');
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    caches.open(LANGUAGE_FILES_CACHE).then((cache) => {
      return cache.addAll(LANGUAGE_FILES).then(() => {
        console.log('[SW] Pre-cached language files:', LANGUAGE_FILES);
      }).catch((error) => {
        console.error('[SW] Failed to cache language files:', error);
        return Promise.allSettled(
          LANGUAGE_FILES.map(file => {
            return cache.add(file).catch(err => {
              console.warn(`[SW] Failed to cache ${file}:`, err);
            });
          })
        );
      });
    })
  );
});

// Activate event - clean up old caches (only in production)
self.addEventListener('activate', (event) => {
  if (DEV_MODE) {
    // Dev mode: nuke ALL caches so stale production-build responses never bleed through
    console.log('[SW] Development mode: clearing all caches');
    event.waitUntil(
      caches.keys()
        .then(names => Promise.all(names.map(n => {
          console.log('[SW] Dev: deleting cache', n);
          return caches.delete(n);
        })))
        .then(() => self.clients.claim())
    );
    return;
  }

  const VALID_CACHES = [LANGUAGE_FILES_CACHE, CACHE_NAME, IMAGE_CACHE];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('[SW] Current caches:', cacheNames);
      console.log('[SW] Valid caches (current version):', VALID_CACHES);
      
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete if not in valid caches
          if (!VALID_CACHES.includes(cacheName)) {
            console.log('[SW] Deleting old/invalid cache:', cacheName);
            return caches.delete(cacheName).then(() => {
              console.log('[SW] Successfully deleted cache:', cacheName);
            }).catch(err => {
              console.error('[SW] Failed to delete cache:', cacheName, err);
            });
          }
        })
      );
    }).then(() => {
      console.log('[SW] Cache cleanup complete. Current version:', CACHE_VERSION);
      return self.clients.claim();
    }).catch((error) => {
      console.error('[SW] Error during cache cleanup:', error);
    })
  );
});

// Fetch event - serve from cache, fallback to network (only in production)
self.addEventListener('fetch', (event) => {
  // 开发环境直接使用网络，不进行缓存
  if (DEV_MODE) {
    return;
  }

  const url = new URL(event.request.url);

  // ── 1. 本地图片：Cache First ───────────────────────────────────────────────
  if (LOCAL_IMAGE_PATTERN.test(url.pathname)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          return cached;
        }
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            cache.put(event.request, response.clone()).then(() => trimImageCache(cache));
          }
          return response;
        } catch {
          return new Response('Image not found', { status: 404 });
        }
      })
    );
    return;
  }

  // ── 2. 外链图片：Stale-While-Revalidate ───────────────────────────────────
  if (EXTERNAL_IMAGE_ORIGINS.some(origin => url.hostname.includes(origin))) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);

        const networkFetch = fetch(event.request)
          .then(response => {
            if (response.ok) {
              cache.put(event.request, response.clone()).then(() => trimImageCache(cache));
            }
            return response;
          })
          .catch(() => null);

        if (cached) {
          return cached;
        }
        return networkFetch || new Response('Image not available offline', { status: 503 });
      })
    );
    return;
  }

  // ── 3. 语言文件：Cache First ─────────────────────────────────────────────
  if ((url.pathname.startsWith('/assets/lang/') || url.pathname.includes('/assets/lang/')) && url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(LANGUAGE_FILES_CACHE).then((cache) => {
        const normalizedRequest = new Request(url.origin + url.pathname, { headers: event.request.headers });

        return cache.match(normalizedRequest, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(event.request).then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              console.warn('[SW] Invalid network response for:', url.pathname);
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            cache.put(normalizedRequest, responseToCache).catch(err => {
              console.warn('[SW] Failed to cache language file:', err);
            });

            return networkResponse;
          }).catch((error) => {
            console.error('[SW] Network fetch failed, trying fallback:', error);

            if (!url.pathname.includes('/zh-CN-ui.json')) {
              const lang = url.pathname.match(/\/([^/]+?)(?:-ui|-product)?\.json$/);
              const fallbackUrl = lang
                ? url.pathname.replace(/\/[^/]+\.json$/, '/zh-CN-ui.json')
                : null;

              if (fallbackUrl) {
                const fallbackRequest = new Request(fallbackUrl, event.request);
                return cache.match(fallbackRequest).then((fallbackResponse) => {
                  if (fallbackResponse) {
                    return fallbackResponse;
                  }
                  throw error;
                });
              }
            }

            throw error;
          });
        });
      })
    );
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  // 开发环境跳过缓存相关消息
  if (DEV_MODE && ['CACHE_LANGUAGE', 'CLEAR_CACHE', 'GET_CACHE_STATUS'].includes(type)) {
    console.log('[SW] Development mode: ignoring message:', type);
    return;
  }

  switch (type) {
  case 'SKIP_WAITING':
    self.skipWaiting();
    break;

  case 'CACHE_LANGUAGE':
    cacheLanguageFile(payload.language).catch(err => {
      console.error('[SW] Failed to cache language:', err);
    });
    break;

  case 'CLEAR_CACHE':
    clearLanguageCache();
    break;

  case 'CLEAR_ALL_CACHES':
    // Remove all caches (useful when debugging stubborn stale caches)
    clearAllCaches().then(result => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ type: 'CLEAR_ALL_CACHES_RESULT', payload: result });
      }
    }).catch(err => console.error('[SW] CLEAR_ALL_CACHES failed:', err));
    break;

  case 'GET_CACHE_STATUS':
    getCacheStatus().then(status => {
      event.ports[0].postMessage({ type: 'CACHE_STATUS', payload: status });
    });
    break;

  case 'FORCE_UPDATE':
    // 强制跳过等待并清理所有缓存，然后通知调用者
    (async () => {
      try {
        await clearAllCaches();
        await self.skipWaiting();
        await self.clients.claim();
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ type: 'FORCE_UPDATE_RESULT', payload: { success: true } });
        }
      } catch (err) {
        console.error('[SW] FORCE_UPDATE failed:', err);
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ type: 'FORCE_UPDATE_RESULT', payload: { success: false, error: String(err) } });
        }
      }
    })();
    break;

  default:
    console.warn('[SW] Unknown message type:', type);
  }
});

// Helper function to trim image cache to max entries (FIFO)
async function trimImageCache(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length > IMAGE_CACHE_MAX_ENTRIES) {
      const toDelete = keys.slice(0, keys.length - IMAGE_CACHE_MAX_ENTRIES);
      await Promise.all(toDelete.map(key => cache.delete(key)));
    }
  } catch (err) {
    console.warn('[SW] Failed to trim image cache:', err);
  }
}

// Helper function to cache UI + product files for a specific language
async function cacheLanguageFile(language) {
  try {
    const cache = await caches.open(LANGUAGE_FILES_CACHE);
    const urls = [
      `/assets/lang/${language}-ui.json`,
      `/assets/lang/${language}-product.json`,
    ];

    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          return true;
        }
        return false;
      })
    );

    return results.some(r => r.status === 'fulfilled' && r.value === true);
  } catch (error) {
    console.error('[SW] Error caching language file:', error);
    return false;
  }
}

// Helper function to clear language cache
async function clearLanguageCache() {
  try {
    // 清理当前缓存
    const cache = await caches.open(LANGUAGE_FILES_CACHE);
    const keys = await cache.keys();
    await Promise.all(keys.map(key => cache.delete(key)));
    console.log('[SW] Cleared current language cache');

    // 清理所有旧版本缓存
    const allCacheNames = await caches.keys();
    const oldVersionCaches = allCacheNames.filter(name => {
      // 查找所有以 'language-cache-' 或 'language-files-' 或 'image-cache-' 开头但不是当前版本的缓存
      if (name.startsWith('language-cache-') && name !== CACHE_NAME) {
        return true;
      }
      if (name.startsWith('language-files-') && name !== LANGUAGE_FILES_CACHE) {
        return true;
      }
      if (name.startsWith('image-cache-') && name !== IMAGE_CACHE) {
        return true;
      }
      return false;
    });

    if (oldVersionCaches.length > 0) {
      console.log('[SW] Cleaning up old version caches:', oldVersionCaches);
      await Promise.all(oldVersionCaches.map(name => {
        return caches.delete(name).then(() => {
          console.log('[SW] Deleted old cache:', name);
        });
      }));
    }

    return true;
  } catch (error) {
    console.error('[SW] Error clearing language cache:', error);
    return false;
  }
}

// Helper function to clear ALL caches (forceful) - useful for debugging
async function clearAllCaches() {
  try {
    const all = await caches.keys();
    if (all.length === 0) {
      console.log('[SW] No caches to clear');
      return true;
    }
    await Promise.all(all.map(name => caches.delete(name)));
    console.log('[SW] Cleared all caches:', all);
    return true;
  } catch (error) {
    console.error('[SW] Error clearing all caches:', error);
    return false;
  }
}

// Helper function to get cache status
async function getCacheStatus() {
  try {
    const cache = await caches.open(LANGUAGE_FILES_CACHE);
    const keys = await cache.keys();
    const cachedFiles = keys.map(key => key.url);

    return {
      totalLanguages: LANGUAGE_FILES.length,
      cachedLanguages: cachedFiles.length,
      cachedFiles: cachedFiles.map(file => {
        const match = file.match(/\/([^/]+?)(?:-ui|-product)?\.json$/);
        return match ? match[1] : file;
      }),
      cacheSize: keys.reduce((total, key) => {
        return total + (key.size || 0);
      }, 0)
    };
  } catch (error) {
    console.error('[SW] Error getting cache status:', error);
    return {
      totalLanguages: 0,
      cachedLanguages: 0,
      cachedFiles: [],
      cacheSize: 0
    };
  }
}
