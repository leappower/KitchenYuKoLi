/**
 * home-core-products.js — Dynamic Home Core Products renderer
 * 
 * Caching strategy (3 layers):
 * 1. Embedded: window.HOME_CORE_PRODUCTS from product-data-table.js (no network)
 * 2. sessionStorage: latest fetched data for this session
 * 3. localStorage: cross-session cache with version check
 * 4. Network: fetch /api/cms/products-data with ETag validation
 */
(function() {
  'use strict';

  var CACHE_KEY = 'home_core_products';
  var CACHE_VERSION_KEY = 'home_core_products_version';
  var API_URL = '/api/cms/products-data';
  var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get primary image from product data
   */
  function getPrimaryImage(product) {
    if (!product.images || !product.images.length) return null;
    var primary = product.images.find(function(img) { return img.isPrimary; });
    return primary ? primary.filePath : product.images[0].filePath;
  }

  /**
   * Build a product link href
   */
  function getProductHref(product) {
    if (product.category) {
      return '/products/?category=' + encodeURIComponent(product.category);
    }
    return '/products/';
  }

  /**
   * Get product detail link (to specific product)
   */
  function getProductDetailHref(product) {
    return '/products/?model=' + encodeURIComponent(product.model);
  }

  /**
   * Load home core products with caching
   * @param {Function} callback - called with (products, source)
   */
  function loadCoreProducts(callback) {
    var now = Date.now();

    // Layer 1: Embedded data from product-data-table.js (no network)
    if (window.HOME_CORE_PRODUCTS && window.HOME_CORE_PRODUCTS.length > 0) {
      // Async to allow other scripts to set HOME_CORE_PRODUCTS
      setTimeout(function() { callback(window.HOME_CORE_PRODUCTS, 'embedded'); }, 0);
      // Still try to refresh in background
      _refreshInBackground(callback);
      return;
    }

    // Layer 2: sessionStorage (session-level cache)
    try {
      var sessionData = sessionStorage.getItem(CACHE_KEY);
      if (sessionData) {
        var parsed = JSON.parse(sessionData);
        if (parsed.timestamp && (now - parsed.timestamp) < CACHE_TTL) {
          setTimeout(function() { callback(parsed.data, 'session'); }, 0);
          _refreshInBackground(callback);
          return;
        }
      }
    } catch(e) {}

    // Layer 3: localStorage (cross-session cache)
    try {
      var localData = localStorage.getItem(CACHE_KEY);
      if (localData) {
        var localParsed = JSON.parse(localData);
        if (localParsed.timestamp && (now - localParsed.timestamp) < CACHE_TTL * 6) {
          // Use cached but still refresh
          setTimeout(function() { callback(localParsed.data, 'local'); }, 0);
          _refreshInBackground(callback);
          return;
        }
      }
    } catch(e) {}

    // Layer 4: Network fetch
    _fetchFromNetwork(callback);
  }

  /**
   * Fetch from CMS API with ETag support
   */
  function _fetchFromNetwork(callback) {
    var etag = null;
    try { etag = localStorage.getItem(CACHE_VERSION_KEY); } catch(e) {}

    var headers = {};
    if (etag) headers['If-None-Match'] = etag;

    fetch(API_URL + '?home_core=1&_t=' + Date.now(), { headers: headers })
      .then(function(res) {
        // Save new ETag
        var newEtag = res.headers.get('ETag');
        if (newEtag) {
          try { localStorage.setItem(CACHE_VERSION_KEY, newEtag); } catch(e) {}
        }

        if (res.status === 304) {
          // Not modified — use existing cached data
          _loadCachedFallback(callback);
          return null;
        }
        return res.json();
      })
      .then(function(data) {
        if (!data) return;
        // Extract home core products from full table
        var coreProducts = [];
        if (Array.isArray(data)) {
          data.forEach(function(cat) {
            if (cat.products) {
              cat.products.forEach(function(p) {
                if (p.is_home_core) coreProducts.push(p);
              });
            }
          });
        }
        if (coreProducts.length === 0) return;
        _saveCache(coreProducts);
        callback(coreProducts, 'network');
      })
      .catch(function() {
        _loadCachedFallback(callback);
      });
  }

  /**
   * Background refresh — fetches fresh data silently
   */
  function _refreshInBackground(callback) {
    var etag = null;
    try { etag = localStorage.getItem(CACHE_VERSION_KEY); } catch(e) {}

    var headers = {};
    if (etag) headers['If-None-Match'] = etag;

    fetch(API_URL + '?home_core=1&_bg=' + Date.now(), { headers: headers })
      .then(function(res) {
        var newEtag = res.headers.get('ETag');
        if (newEtag) {
          try { localStorage.setItem(CACHE_VERSION_KEY, newEtag); } catch(e) {}
        }
        if (res.status === 304) return null;
        return res.json();
      })
      .then(function(data) {
        if (!data) return;
        var coreProducts = [];
        if (Array.isArray(data)) {
          data.forEach(function(cat) {
            if (cat.products) {
              cat.products.forEach(function(p) {
                if (p.is_home_core) coreProducts.push(p);
              });
            }
          });
        }
        if (coreProducts.length > 0) {
          _saveCache(coreProducts);
          window.HOME_CORE_PRODUCTS = coreProducts;
        }
      })
      .catch(function() {});
  }

  /**
   * Save to both session and local storage
   */
  function _saveCache(products) {
    var entry = { timestamp: Date.now(), data: products };
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch(e) {}
  }

  /**
   * Load from any available cache as fallback
   */
  function _loadCachedFallback(callback) {
    try {
      var sessionData = sessionStorage.getItem(CACHE_KEY);
      if (sessionData) { callback(JSON.parse(sessionData).data, 'session-fallback'); return; }
    } catch(e) {}
    try {
      var localData = localStorage.getItem(CACHE_KEY);
      if (localData) { callback(JSON.parse(localData).data, 'local-fallback'); return; }
    } catch(e) {}
    // No data at all
    callback([], 'none');
  }

  /**
   * ─── Renderers for each device type ───────────────────────
   */

  /**
   * PC: 4-column grid with full product cards
   */
  window.renderHomeCorePC = function(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    loadCoreProducts(function(products, source) {
      if (!products || products.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 py-8">暂无核心产品数据</div>';
        return;
      }

      // Reapply i18n after render
      var html = '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">';
      products.forEach(function(p) {
        var img = getPrimaryImage(p);
        var href = getProductDetailHref(p);
        html += '<div class="group bg-background-light dark:bg-background-dark p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary transition-all shadow-sm">' +
          '<a href="' + href + '" class="block">' +
          '<div class="aspect-[4/3] rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden mb-6">' +
          (img ? '<img alt="' + escHtml(p.model) + '" class="w-full h-full object-contain p-2" src="' + escHtml(img) + '" loading="lazy">' :
                  '<div style="font-size:2.5rem;color:#d1d5db;display:flex;align-items:center;justify-content:center;height:100%">📦</div>') +
          '</div>' +
          '<h3 class="text-xl font-bold mb-2">' + escHtml(p.model) + '</h3>' +
          (p.subCategory ? '<p class="text-sm text-slate-500 mb-6">' + escHtml(p.subCategory) + '</p>' : '<div class="mb-6"></div>') +
          '<div class="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-4">' +
          (p.badge ? '<span class="text-xs font-bold uppercase text-slate-400">' + escHtml(p.badge) + '</span>' : '<span></span>') +
          '<span class="text-primary font-black" data-i18n="home_hw_learn_more">了解更多</span>' +
          '</div></a></div>';
      });
      html += '</div>';
      container.innerHTML = html;

      // Trigger i18n if available
      if (window.translationManager && window.translationManager.applyTo) {
        window.translationManager.applyTo(container);
      }
    });
  };

  /**
   * Tablet: 2-column grid with compact cards
   */
  window.renderHomeCoreTablet = function(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    loadCoreProducts(function(products) {
      if (!products || products.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 py-6">暂无核心产品数据</div>';
        return;
      }

      var html = '<div class="grid grid-cols-2 gap-4">';
      products.forEach(function(p) {
        var img = getPrimaryImage(p);
        var href = getProductDetailHref(p);
        html += '<div class="bg-white dark:bg-background-dark p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary transition-all shadow-sm">' +
          '<a href="' + href + '">' +
          '<div class="aspect-square rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden mb-3">' +
          (img ? '<img alt="' + escHtml(p.model) + '" class="w-full h-full object-cover" src="' + escHtml(img) + '" loading="lazy">' : '') +
          '</div>' +
          '<h3 class="text-base font-bold mb-1">' + escHtml(p.model) + '</h3>' +
          (p.subCategory ? '<p class="text-xs text-slate-500 mb-3">' + escHtml(p.subCategory) + '</p>' : '<div class="mb-3"></div>') +
          '<span class="text-xs font-bold text-primary" data-i18n="home_hw_learn_more">了解更多</span>' +
          '</a></div>';
      });
      html += '</div>';
      container.innerHTML = html;

      if (window.translationManager && window.translationManager.applyTo) {
        window.translationManager.applyTo(container);
      }
    });
  };

  /**
   * Mobile: horizontal scroll cards
   */
  window.renderHomeCoreMobile = function(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    loadCoreProducts(function(products) {
      if (!products || products.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 py-4">暂无核心产品数据</div>';
        return;
      }

      var html = '<div class="flex overflow-x-auto gap-3 no-scrollbar pb-2">';
      products.forEach(function(p) {
        var img = getPrimaryImage(p);
        var href = getProductDetailHref(p);
        html += '<div class="min-w-[260px] bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">' +
          '<a href="' + href + '" class="block">' +
          '<div class="h-36 bg-cover bg-center bg-slate-200 dark:bg-slate-800"' +
          (img ? ' style="background-image: url(&quot;' + escHtml(img) + '&quot;); background-size: cover; background-position: center;"' : '') + '></div>' +
          '<div class="p-3">' +
          '<h3 class="font-bold text-sm mb-1">' + escHtml(p.model) + '</h3>' +
          (p.subCategory ? '<p class="text-xs text-slate-500 mb-2">' + escHtml(p.subCategory) + '</p>' : '<div class="mb-2"></div>') +
          '<span class="text-xs font-bold text-primary" data-i18n="home_hw_learn_more">了解更多</span>' +
          '</div></a></div>';
      });
      html += '</div>';
      container.innerHTML = html;

      if (window.translationManager && window.translationManager.applyTo) {
        window.translationManager.applyTo(container);
      }
    });
  };

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
