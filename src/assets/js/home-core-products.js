/* global getProductField */
function _reInjectSrcset(root) {
  var m = window.app && window.app.modules && window.app.modules.get("lazyLoading");
  if (m && typeof m.reInjectSrcset === "function") m.reInjectSrcset(root);
}
/**
 * home-core-products.js — Dynamic Home Core Products renderer
 *
 * Caching strategy (3 layers):
 * 1. Embedded: window.HOME_CORE_PRODUCTS from product-data-table.js (no network)
 * 2. sessionStorage: latest fetched data for this session
 * 3. localStorage: cross-session cache with version check
 * 4. Network: fetch /api/public/products-data with ETag validation
 */
(function () {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (key == null) key = evt + ":" + (++_spaRegs.__k || (_spaRegs.__k = 1));
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  function tl(key, fallback) {
    if (typeof window.uiText === "function") return window.uiText(key, fallback);
    return fallback || key;
  }

  var CATEGORY_I18N_MAP = {
    翻炒系列: "nav_products_stirfry",
    炖煮系列: "nav_products_stewing",
    蒸煮系列: "nav_products_steaming",
    煎炸系列: "nav_products_frying",
    切配系列: "nav_products_cutting",
    辅助系列: "nav_products_other",
  };

  function _prodKey(model) {
    return (model || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  function translateCategory(cat) {
    var key = CATEGORY_I18N_MAP[cat];
    return key ? tl(key, cat) : cat;
  }

  var CACHE_KEY = "home_core_products";
  var _CACHE_VERSION_KEY = "home_core_products_version";
  var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get primary image from product data
   */
  function getPrimaryImage(product) {
    if (!product.images || !product.images.length) return null;
    var primary = product.images.find(function (img) {
      return img.isPrimary;
    });
    var fp = primary ? primary.filePath : product.images[0].filePath;
    // 统一用 model.webp，不信任 API/data-table 的 filePath
    return "/assets/images/products/" + product.model + ".webp";
  }

  function getDeviceType() {
    return window.DeviceUtils
      ? window.DeviceUtils.getDeviceType()
      : window.innerWidth < 768
        ? "mobile"
        : window.innerWidth < 1280
          ? "tablet"
          : "pc";
  }

  function buildSrcset(baseUrl, device) {
    if (!baseUrl || !/\.(webp|png|jpg|jpeg|avif)$/i.test(baseUrl)) return "";
    var widths = device === "mobile" ? [375, 828] : device === "tablet" ? [828, 1200] : [1200, 1920];
    return widths
      .map(function (w) {
        return baseUrl.replace(/\.(webp|png|jpg|jpeg|avif)$/, "-" + w + "w.$1") + " " + w + "w";
      })
      .join(", ");
  }

  function buildSizes(device) {
    if (device === "mobile") return "(max-width: 767px) 50vw, 33vw";
    if (device === "tablet") return "(max-width: 1279px) 50vw, 25vw";
    return "(max-width: 1535px) 25vw, 20vw";
  }

  /**
   * Build a product link href
   */
  function _getProductHref(product) {
    if (product.category) {
      return "/products/?category=" + encodeURIComponent(product.category);
    }
    return "/products/";
  }

  /**
   * Get product detail link (to specific product)
   */
  var CATEGORY_NAME_TO_SLUG = {
    翻炒系列: "stirfry",
    切配系列: "cutting",
    煎炸系列: "frying",
    炖煮系列: "stewing",
    蒸煮系列: "steaming",
    辅助系列: "other",
  };

  // MODEL_TO_SLUG: 构建时从 PRODUCT_DATA_TABLE 初始数据提取，不可变
  var MODEL_TO_SLUG = (function () {
    var map = {};
    if (typeof window !== "undefined" && window.PRODUCT_DATA_TABLE) {
      var t = window.PRODUCT_DATA_TABLE;
      if (t && t.length) {
        for (var _i = 0; _i < t.length; _i++) {
          if (t[_i].model && t[_i].category) {
            var _s = CATEGORY_NAME_TO_SLUG[t[_i].category];
            if (_s) map[t[_i].model] = _s;
          }
        }
      }
    }
    return map;
  })();

  function getProductDetailHref(product) {
    var slug =
      CATEGORY_NAME_TO_SLUG[product.category] ||
      (window.MODEL_TO_SLUG && window.MODEL_TO_SLUG[product.model]) ||
      encodeURIComponent(product.model);
    return "/products/" + slug + "/" + encodeURIComponent(product.model) + "/";
  }

  /**
   * Load home core products with caching
   * @param {Function} callback - called with (products, source)
   */
  function loadCoreProducts(callback) {
    var now = Date.now();

    // Layer 1: sessionStorage (session-level cache)
    try {
      var sessionData = sessionStorage.getItem(CACHE_KEY);
      if (sessionData) {
        var parsed = JSON.parse(sessionData);
        if (parsed.timestamp && now - parsed.timestamp < CACHE_TTL) {
          setTimeout(function () {
            callback(parsed.data, "session");
          }, 0);
          _refreshInBackground(callback);
          return;
        }
      }
    } catch (e) {}

    // Layer 3: localStorage (cross-session cache)
    try {
      var localData = localStorage.getItem(CACHE_KEY);
      if (localData) {
        var localParsed = JSON.parse(localData);
        if (localParsed.timestamp && now - localParsed.timestamp < CACHE_TTL * 6) {
          setTimeout(function () {
            callback(localParsed.data, "local");
          }, 0);
          _refreshInBackground(callback);
          return;
        }
      }
    } catch (e) {}

    // Layer 4: Network fetch from CMS API
    _fetchFromNetwork(callback);
  }

  /**
   * Fetch from CMS API with ETag support
   */
  function _fetchFromNetwork(callback, retries) {
    retries = retries || 0;
    // Wait for PRODUCT_DATA_TABLE to be populated (defer 加载顺序不确定)
    if (!Array.isArray(window.PRODUCT_DATA_TABLE) || window.PRODUCT_DATA_TABLE.length === 0) {
      if (retries < 30) {
        setTimeout(function () {
          _fetchFromNetwork(callback, retries + 1);
        }, 200);
        return;
      }
      _loadCachedFallback(callback);
      return;
    }
    var coreProducts = window.PRODUCT_DATA_TABLE.filter(function (p) {
      return p.is_home_core || p.isHomeCore;
    });
    if (coreProducts.length > 0) {
      callback(coreProducts, "local");
      try {
        _saveCache(coreProducts);
      } catch (e) {
        /* sessionStorage may be blocked */
      }
      return;
    }
    _loadCachedFallback(callback);
  }

  /**
   * Background refresh — fetches fresh data silently
   */
  function _refreshInBackground(_callback) {
    // Refresh from PRODUCT_DATA_TABLE (no API)
    var table = window.PRODUCT_DATA_TABLE || [];
    var coreProducts = table.filter(function (p) {
      return p.is_home_core || p.isHomeCore;
    });
    if (coreProducts.length > 0) {
      _saveCache(coreProducts);
      window.HOME_CORE_PRODUCTS = coreProducts;
    }
  }

  /**
   * Save to both session and local storage
   */
  function _saveCache(products) {
    var entry = { timestamp: Date.now(), data: products };
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch (e) {}
  }

  /**
   * Load from any available cache as fallback
   */
  function _loadCachedFallback(callback) {
    try {
      var sessionData = sessionStorage.getItem(CACHE_KEY);
      if (sessionData) {
        callback(JSON.parse(sessionData).data, "session-fallback");
        return;
      }
    } catch (e) {}
    try {
      var localData = localStorage.getItem(CACHE_KEY);
      if (localData) {
        callback(JSON.parse(localData).data, "local-fallback");
        return;
      }
    } catch (e) {}
    // No data at all
    callback([], "none");
  }

  /**
   * ─── Renderers for each device type ───────────────────────
   */

  /**
   * PC: 4-column grid with full product cards
   */
  window.renderHomeCorePC = function (containerId) {
    var container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    loadCoreProducts(function (products, _source) {
      if (!products || products.length === 0) {
        var noDataMsg = tl("no_core_products_data", "暂无核心产品数据");
        container.innerHTML = '<div class="text-center text-slate-400 py-8">' + escHtml(noDataMsg) + "</div>";
        return;
      }

      // Reapply i18n after render
      var VIS_COUNT = 8; // PC: 2 rows (4 columns × 2)
      var hasMore = products.length > VIS_COUNT;
      var visProducts = hasMore ? products.slice(0, VIS_COUNT) : products;
      var restProducts = hasMore ? products.slice(VIS_COUNT) : [];

      function buildPCCard(p) {
        var img = getPrimaryImage(p);
        var device = getDeviceType();
        var imgSrcset = buildSrcset(img, device);
        var imgSizes = buildSizes(device);
        var href = getProductDetailHref(p);
        var catMap = {
          翻炒系列: "stirfry",
          炖煮系列: "stewing",
          蒸煮系列: "steaming",
          煎炸系列: "frying",
          切配系列: "cutting",
          辅助系列: "other",
        };
        var catSlug = catMap[p.category] || "other";
        var catHref = "/products/" + catSlug + "/";
        return (
          '<div class="group bg-white rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary hover:shadow-lg transition-all duration-300 overflow-hidden" data-link="' +
          href +
          '">' +
          '<div class="aspect-[4/3] bg-white overflow-hidden cursor-pointer">' +
          (img
            ? '<img alt="' +
              escHtml(p.model) +
              '" class="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" src="' +
              escHtml(img) +
              '"' +
              (imgSrcset ? ' srcset="' + imgSrcset + '"' : "") +
              (imgSizes ? ' sizes="' + imgSizes + '"' : "") +
              ' loading="lazy">'
            : '<div style="font-size:2.5rem;color:#d1d5db;display:flex;align-items:center;justify-content:center;height:100%">📦</div>') +
          "</div>" +
          '<div class="p-5">' +
          (p.category
            ? '<a href="' +
              catHref +
              '" class="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary mb-3 hover:bg-primary/20 transition-colors" data-i18n="' +
              (CATEGORY_I18N_MAP[p.category] || "") +
              '">' +
              escHtml(translateCategory(p.category)) +
              "</a>"
            : "") +
          '<h3 class="text-lg font-black mb-1">' +
          escHtml(p.model) +
          "</h3>" +
          '<p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">' +
          escHtml(typeof getProductField === "function" ? getProductField(p, "name") || p.model : p.model) +
          "</p>" +
          '<div class="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">' +
          (p.power
            ? '<span class="text-xs font-bold text-slate-400">' + escHtml(p.power) + "</span>"
            : "<span></span>") +
          '<a href="' +
          href +
          '" data-no-swup class="text-sm text-primary font-bold flex items-center gap-1 group-hover:gap-2 transition-all duration-300 hover:opacity-80" data-i18n="home_hw_learn_more">' +
          tl("home_hw_learn_more", "了解更多") +
          ' <span class="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span></a>' +
          "</div></div></div>"
        );
      }

      var html = '<div id="hcp-grid-pc" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">';
      visProducts.forEach(function (p) {
        html += buildPCCard(p);
      });
      html += "</div>";

      if (hasMore) {
        html +=
          '<div id="hcp-hidden-pc" style="display:none" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mt-8">';
        restProducts.forEach(function (p) {
          html += buildPCCard(p);
        });
        html += "</div>";
        html += '<div class="flex justify-center mt-10">';
        html +=
          "<button id=\"hcp-toggle-pc\" onclick=\"(function(){var h=document.getElementById('hcp-hidden-pc'),b=document.getElementById('hcp-toggle-pc');if(h.style.display==='none'){h.style.display='';b.textContent=typeof window.uiText==='function'?window.uiText('home_hw_collapse','Collapse ▲'):'Collapse ▲'}else{h.style.display='none';b.textContent=typeof window.uiText==='function'?window.uiText('home_hw_show_more','View More Products ▼'):'View More Products ▼'}})()\" class=\"px-8 py-3 rounded-full border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all cursor-pointer\" data-i18n=\"home_hw_show_more\">" +
          tl("home_hw_show_more", "View More Products ▼") +
          "</button>";
        html += "</div>";
      }

      container.innerHTML = html;
      _reInjectSrcset(container);

      // Trigger i18n if available
      if (
        window.translationManager &&
        window.translationManager.ready &&
        typeof window.translationManager.ready.then === "function"
      ) {
        window.translationManager.ready.then(function () {
          if (typeof window.translationManager.applyTo === "function") window.translationManager.applyTo(container);
        });
      } else if (window.translationManager && typeof window.translationManager.applyTo === "function") {
        window.translationManager.applyTo(container);
      }
    });
  };

  /**
   * Tablet: 2-column grid with compact cards
   */
  window.renderHomeCoreTablet = function (containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    loadCoreProducts(function (products) {
      if (!products || products.length === 0) {
        container.innerHTML =
          '<div class="text-center text-slate-400 py-6">' +
          escHtml(tl("no_core_products_data", "暂无核心产品数据")) +
          "</div>";
        return;
      }

      var VIS_COUNT = 4; // Tablet: 2 rows (2 columns)
      var hasMore = products.length > VIS_COUNT;
      var visProducts = hasMore ? products.slice(0, VIS_COUNT) : products;
      var restProducts = hasMore ? products.slice(VIS_COUNT) : [];

      function buildTabletCard(p) {
        var img = getPrimaryImage(p);
        var device = getDeviceType();
        var imgSrcset = buildSrcset(img, device);
        var imgSizes = buildSizes(device);
        var href = getProductDetailHref(p);
        return (
          '<div class="group bg-white rounded-2xl border border-slate-200 hover:border-primary hover:shadow-lg transition-all duration-300 overflow-hidden" data-link="' +
          href +
          '">' +
          '<div class="aspect-[4/3] bg-white overflow-hidden cursor-pointer">' +
          (img
            ? '<img alt="' +
              escHtml(p.model) +
              '" class="w-full h-full object-contain p-3 sm:p-4 group-hover:scale-105 transition-transform duration-300" src="' +
              escHtml(img) +
              '"' +
              (imgSrcset ? ' srcset="' + imgSrcset + '"' : "") +
              (imgSizes ? ' sizes="' + imgSizes + '"' : "") +
              ' loading="lazy">'
            : '<div style="font-size:2rem;color:#d1d5db;display:flex;align-items:center;justify-content:center;height:100%">📦</div>') +
          "</div>" +
          '<div class="p-3 sm:p-4">' +
          (p.category
            ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-2 inline-block" data-i18n="' +
              (CATEGORY_I18N_MAP[p.category] || "") +
              '">' +
              escHtml(translateCategory(p.category)) +
              "</span>"
            : "") +
          '<h3 class="font-bold text-sm mb-1">' +
          escHtml(p.model) +
          "</h3>" +
          '<p class="text-xs text-slate-500 line-clamp-2 mb-3">' +
          escHtml(typeof getProductField === "function" ? getProductField(p, "name") || p.model : p.model) +
          "</p>" +
          '<div class="flex justify-between items-center pt-2 border-t border-slate-100">' +
          (p.power
            ? '<span class="text-[11px] font-bold text-slate-400">' + escHtml(p.power) + "</span>"
            : "<span></span>") +
          '<a href="' +
          href +
          '" data-no-swup class="text-xs font-bold text-primary flex items-center gap-0.5 group-hover:gap-1.5 transition-all duration-300 hover:opacity-80" data-i18n="home_hw_learn_more">' +
          tl("home_hw_learn_more", "了解更多") +
          ' <span class="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform duration-300">arrow_forward</span></a>' +
          "</div></div></div>"
        );
      }

      var html = '<div id="hcp-grid-tablet" class="grid grid-cols-2 gap-4">';
      visProducts.forEach(function (p) {
        html += buildTabletCard(p);
      });
      html += "</div>";

      if (hasMore) {
        html += '<div id="hcp-hidden-tablet" style="display:none" class="grid grid-cols-2 gap-4 mt-4">';
        restProducts.forEach(function (p) {
          html += buildTabletCard(p);
        });
        html += "</div>";
        html += '<div class="flex justify-center mt-8">';
        html +=
          "<button id=\"hcp-toggle-tablet\" onclick=\"(function(){var h=document.getElementById('hcp-hidden-tablet'),b=document.getElementById('hcp-toggle-tablet');if(h.style.display==='none'){h.style.display='';b.textContent=typeof window.uiText==='function'?window.uiText('home_hw_collapse','Collapse ▲'):'Collapse ▲'}else{h.style.display='none';b.textContent=typeof window.uiText==='function'?window.uiText('home_hw_show_more','View More Products ▼'):'View More Products ▼'}})()\" class=\"px-6 py-2.5 rounded-full border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all cursor-pointer text-sm\" data-i18n=\"home_hw_show_more\">" +
          tl("home_hw_show_more", "View More Products ▼") +
          "</button>";
        html += "</div>";
      }

      container.innerHTML = html;
      _reInjectSrcset(container);

      if (window.translationManager && window.translationManager.applyTo) {
        window.translationManager.applyTo(container);
      }
    });
  };

  /**
   * Mobile: horizontal scroll cards
   */
  window.renderHomeCoreMobile = function (containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    loadCoreProducts(function (products) {
      if (!products || products.length === 0) {
        container.innerHTML =
          '<div class="text-center text-slate-400 py-4">' +
          escHtml(tl("no_core_products_data", "暂无核心产品数据")) +
          "</div>";
        return;
      }

      var VIS = 4;
      var hasMore = products.length > VIS;
      var visProducts = products.slice(0, VIS);
      var restProducts = hasMore ? products.slice(VIS) : [];

      function buildCard(p) {
        var img = getPrimaryImage(p);
        var device = getDeviceType();
        var imgSrcset = buildSrcset(img, device);
        var imgSizes = buildSizes(device);
        var href = getProductDetailHref(p);
        return (
          '<div class="group bg-white rounded-2xl border border-slate-200 hover:border-primary hover:shadow-lg transition-all duration-300 overflow-hidden" data-link="' +
          href +
          '">' +
          '<div class="aspect-[4/3] bg-white overflow-hidden cursor-pointer">' +
          (img
            ? '<img alt="' +
              escHtml(p.model) +
              '" class="w-full h-full object-contain p-2 sm:p-3 group-hover:scale-105 transition-transform duration-300" src="' +
              escHtml(img) +
              '"' +
              (imgSrcset ? ' srcset="' + imgSrcset + '"' : "") +
              (imgSizes ? ' sizes="' + imgSizes + '"' : "") +
              ' loading="lazy">'
            : '<div style="font-size:2rem;color:#d1d5db;display:flex;align-items:center;justify-content:center;height:100%">📦</div>') +
          "</div>" +
          '<div class="p-3 sm:p-4">' +
          (p.category
            ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-2 inline-block" data-i18n="' +
              (CATEGORY_I18N_MAP[p.category] || "") +
              '">' +
              escHtml(translateCategory(p.category)) +
              "</span>"
            : "") +
          '<h3 class="font-bold text-sm mb-1">' +
          escHtml(p.model) +
          "</h3>" +
          '<p class="text-xs text-slate-500 line-clamp-2 mb-3">' +
          escHtml(typeof getProductField === "function" ? getProductField(p, "name") || p.model : p.model) +
          "</p>" +
          '<div class="flex justify-between items-center pt-2 border-t border-slate-100">' +
          (p.power
            ? '<span class="text-[11px] font-bold text-slate-400">' + escHtml(p.power) + "</span>"
            : "<span></span>") +
          '<a href="' +
          href +
          '" data-no-swup class="text-xs font-bold text-primary flex items-center gap-0.5 group-hover:gap-1.5 transition-all duration-300 hover:opacity-80" data-i18n="home_hw_learn_more">' +
          tl("home_hw_learn_more", "了解更多") +
          ' <span class="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform duration-300">arrow_forward</span></a>' +
          "</div></div></div>"
        );
      }

      var html = '<div class="flex flex-col gap-4">';
      html += '<div class="flex flex-col gap-3">';
      visProducts.forEach(function (p) {
        html += buildCard(p);
      });
      html += "</div>";
      if (hasMore) {
        html +=
          "<button id=\"hcp-load-more-mobile\" class=\"w-full py-2.5 rounded-xl border border-slate-300  text-sm font-bold text-primary hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-center gap-2\" data-i18n=\"home_show_more\" onclick=\"(function(){var b=document.getElementById('hcp-hidden-mobile');var btn=document.getElementById('hcp-load-more-mobile');if(b&&btn){b.style.display='';btn.style.display='none';window.translationManager&&window.translationManager.applyTo(b.parentElement);}})()\">" +
          '<span class="material-symbols-outlined text-lg">expand_more</span> ' +
          escHtml(tl("home_show_more", "More Products")) +
          "</button>";
        html += '<div id="hcp-hidden-mobile" style="display:none" class="flex flex-col gap-3">';
        restProducts.forEach(function (p) {
          html += buildCard(p);
        });
        html += "</div>";
      }
      html += "</div>";
      _reInjectSrcset(container);
      container.innerHTML = html;

      if (window.translationManager && window.translationManager.applyTo) {
        window.translationManager.applyTo(container);
      }
    });
  };

  function escHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /**
   * Auto-init: detect device type and render on spa:load (or DOMContentLoaded fallback)
   */
  /**
   * Auto-init: detect device type and render on spa:load (or DOMContentLoaded fallback)
   * SPA 路由切换后 spa:load 事件触发时，新的 spa-content 已经替换完毕，
   * 容器元素已存在于 DOM 中，直接渲染即可。
   */
  function _autoInit() {
    var path = window.location.pathname || "/";
    var device = window.DeviceUtils
      ? window.DeviceUtils.getDeviceType()
      : window.innerWidth < 768
        ? "mobile"
        : window.innerWidth < 1280
          ? "tablet"
          : "pc";
    if (path.indexOf("/home") !== -1) {
      var containerId =
        device === "mobile"
          ? "home-core-products-mobile"
          : device === "tablet"
            ? "home-core-products-tablet"
            : "home-core-products-pc";
      var container = document.getElementById(containerId);
      if (container) {
        if (device === "mobile") window.renderHomeCoreMobile(containerId);
        else if (device === "tablet") window.renderHomeCoreTablet(containerId);
        else window.renderHomeCorePC(containerId);
      } else {
        // 容器不在 DOM 中 → 可能是 SPA 还没完成 content:replace，重试 3 次
        var _retryCount = (window._hcpRetryCount || 0) + 1;
        window._hcpRetryCount = _retryCount;
        if (_retryCount <= 3) {
          setTimeout(_autoInit, 300);
        }
      }
    }
  }
  // Make init callable from outside (for SPA router loadPageScripts)
  window.__hcpInit = function () {
    _autoInit();
  };

  // Primary: listen for spa:load (SPA router re-renders content)
  // 同时在 document 和 window 上监听，防止 SPA 切换时 AbortController 被动触发
  function _onSpaLoad() {
    requestAnimationFrame(function () {
      _autoInit();
    });
  }
  window.addEventListener("spa:load", _onSpaLoad);
  document.addEventListener("spa:load", _onSpaLoad);
  // Fallback: if SPA router is not active, use DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      _autoInit();
    });
  } else {
    setTimeout(function () {
      _autoInit();
    }, 0);
  }

  // Re-render on language change — listen on both document and window
  function _onLangChange() {
    _autoInit();
  }
  // Init on SPA reload: same as spa:load
  document.addEventListener("languageChanged", _onLangChange);
  window.addEventListener("languageChanged", _onLangChange);
  // Re-render when translations JSON finishes loading
  document.addEventListener("productTranslationsLoaded", function () {
    _autoInit();
  });
})();
