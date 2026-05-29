/* global getProductField */
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
    if (typeof window.uiText === "function") {
      return window.uiText(key, fallback);
    }
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
    // Defensive: normalize _N.webp → -N.webp (file rename migration)
    if (fp) {
      fp = fp.replace(/_(\d\.webp)$/, "-$1");
    }
    return fp;
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

  function getProductDetailHref(product) {
    var slug = CATEGORY_NAME_TO_SLUG[product.category] || encodeURIComponent(product.model);
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
              '" loading="lazy">'
            : '<div style="font-size:2.5rem;color:#d1d5db;display:flex;align-items:center;justify-content:center;height:100%">📦</div>') +
          "</div>" +
          '<div class="p-5">' +
          (p.category
            ? '<a href="' +
              catHref +
              '" class="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary mb-3 hover:bg-primary/20 transition-colors">' +
              escHtml(translateCategory(p.category)) +
              "</a>"
            : "") +
          '<h3 class="text-lg font-black mb-1">' +
          escHtml(p.model) +
          "</h3>" +
          (typeof getProductField === "function" && getProductField(p, "name")
            ? '<p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">' +
              escHtml(getProductField(p, "name")) +
              "</p>"
            : '<div class="mb-4"></div>') +
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
          tl("home_hw_show_more", "查看更多产品 ▼") +
          "</button>";
        html += "</div>";
      }

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
              '" loading="lazy">'
            : '<div style="font-size:2rem;color:#d1d5db;display:flex;align-items:center;justify-content:center;height:100%">📦</div>') +
          "</div>" +
          '<div class="p-3 sm:p-4">' +
          (p.category
            ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-2 inline-block">' +
              escHtml(translateCategory(p.category)) +
              "</span>"
            : "") +
          '<h3 class="font-bold text-sm mb-1">' +
          escHtml(p.model) +
          "</h3>" +
          (typeof getProductField === "function" && getProductField(p, "name")
            ? '<p class="text-xs text-slate-500 line-clamp-2 mb-3">' + escHtml(getProductField(p, "name")) + "</p>"
            : '<div class="mb-3"></div>') +
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
          tl("home_hw_show_more", "查看更多产品 ▼") +
          "</button>";
        html += "</div>";
      }

      container.innerHTML = html;

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
              '" loading="lazy">'
            : '<div style="font-size:2rem;color:#d1d5db;display:flex;align-items:center;justify-content:center;height:100%">📦</div>') +
          "</div>" +
          '<div class="p-3 sm:p-4">' +
          (p.category
            ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-2 inline-block">' +
              escHtml(translateCategory(p.category)) +
              "</span>"
            : "") +
          '<h3 class="font-bold text-sm mb-1">' +
          escHtml(p.model) +
          "</h3>" +
          (typeof getProductField === "function" && getProductField(p, "name")
            ? '<p class="text-xs text-slate-500 line-clamp-2 mb-3">' + escHtml(getProductField(p, "name")) + "</p>"
            : '<div class="mb-3"></div>') +
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
          "<button id=\"hcp-load-more-mobile\" class=\"w-full py-2.5 rounded-xl border border-slate-300  text-sm font-bold text-primary hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-center gap-2\" onclick=\"(function(){var b=document.getElementById('hcp-hidden-mobile');var btn=document.getElementById('hcp-load-more-mobile');if(b&&btn){b.style.display='';btn.style.display='none';window.translationManager&&window.translationManager.applyTo(b.parentElement);}})()\">" +
          '<span class="material-symbols-outlined text-lg">expand_more</span> ' +
          escHtml(tl("home_show_more", "更多产品")) +
          "</button>";
        html += '<div id="hcp-hidden-mobile" style="display:none" class="flex flex-col gap-3">';
        restProducts.forEach(function (p) {
          html += buildCard(p);
        });
        html += "</div>";
      }
      html += "</div>";
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
  function _autoInit() {
    var path = window.location.pathname || "/";
    var device = window.innerWidth < 768 ? "mobile" : window.innerWidth < 1280 ? "tablet" : "pc";
    if (path.indexOf("/home") !== -1) {
      var containerId =
        device === "mobile"
          ? "home-core-products-mobile"
          : device === "tablet"
            ? "home-core-products-tablet"
            : "home-core-products-pc";
      // 等待容器元素出现（SPA content:replace 后 DOM 可能还未更新）
      function tryRender() {
        if (document.getElementById(containerId)) {
          if (device === "mobile") window.renderHomeCoreMobile(containerId);
          else if (device === "tablet") window.renderHomeCoreTablet(containerId);
          else window.renderHomeCorePC(containerId);
        } else {
          // 容器还没出现，重试
          setTimeout(tryRender, 50);
        }
      }
      tryRender();
    }
  }
  // Make init callable from outside (for SPA router loadPageScripts)
  window.__hcpInit = function () {
    _autoInit();
  };

  // Primary: listen for spa:load (SPA router re-renders content)
  _spaOn(document, "spa:load", function () {
    _autoInit();
  });
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
  document.addEventListener("languageChanged", _onLangChange);
  window.addEventListener("languageChanged", _onLangChange);
})();
