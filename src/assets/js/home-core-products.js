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
      fp = fp.replace(/_(\d+\.webp)$/, "-$1");
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
  function getProductDetailHref(product) {
    return "/products/" + encodeURIComponent(product.model) + "/";
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
    // Local data sources (no API dependency)
    var table = window.PRODUCT_DATA_TABLE || [];
    var coreProducts = table.filter(function (p) {
      return p.is_home_core || p.isHomeCore;
    });
    if (coreProducts.length > 0) {
      _saveCache(coreProducts);
      callback(coreProducts, "local");
      return;
    }
    // Retry if product-data-table.js hasn't loaded yet (max 5 times, 100ms apart)
    if (retries < 5) {
      var self = this;
      setTimeout(function () {
        _fetchFromNetwork(callback, retries + 1);
      }, 100);
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
      if (device === "mobile") window.renderHomeCoreMobile("home-core-products-mobile");
      else if (device === "tablet") window.renderHomeCoreTablet("home-core-products-tablet");
      else window.renderHomeCorePC("home-core-products-pc");
    }
  }

  // Make init callable from outside (for SPA router loadPageScripts)
  window.__hcpInit = function () {
    window._autoInit();
  };

  // Primary: listen for spa:load (SPA router re-renders content)
  _spaOn(document, "spa:load", function () {
    window._autoInit();
  });
  // Fallback: if SPA router is not active, use DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window._autoInit();
    });
  } else {
    setTimeout(function () {
      window._autoInit();
    }, 0);
  }

  // Re-render on language change
  document.addEventListener("languageChanged", function () {
    window._autoInit();
  });

  /**
   * ═══ Scenario Product Grid Support ═══
   * Renders scenario-specific products in the same 4-column card template
   */

  /**
   * Scenario → product model mapping
   * Each scenario independently specifies which products to show
   * Edit per-scenario arrays to fine-tune without affecting other pages
   */
  var SCENARIO_PRODUCTS = {
    "small-restaurant": [
      // Compact countertop equipment for small F&B shops
      "DLB-TBS30", // 台式上搅拌平底锅炒菜机
      "DLB-TBQ30", // 台式上搅拌平底锅炒菜机（语音提示）
      "DLB-TQBQ30", // 台式上搅拌平底锅炒菜机（语音提示+自动加料）
      "DLB-TGS30", // 台式300智能电磁炒菜机（手动）
      "DLB-TGD30", // 台式300智能电磁炒菜机（电动）
      "DLB-TBS40", // 台式上搅拌弧底锅炒菜机
      "DLB-TZS40", // 台式转锅搅拌炒菜机（炒饭机）
      "F32F1C", // 台式翻盖炒菜机（手动翻盖款）
      "G26D1A", // 简易台式滚筒炒菜机(电磁款)
      "Y12D1C", // 台式智能升降单缸油炸炉
      "GT1D1B", // 单头锅贴机
      "B4RTD", // 台式智能燃气煲仔炉
    ],
    "chain-restaurant": [
      // Batch cooking, high-volume, automated equipment
      "DLB-4BQ30", // 柜式上搅拌平底锅炒菜机（语音提示）
      "DLB-GD30", // 落地式300智能电磁炒菜机（电动）
      "DLB-GD36", // 落地式360智能电磁炒菜机（电动）
      "DLB-GQ30", // 落地式300智能电磁炒菜机（触屏+喷料）
      "DLB-GQ36", // 落地式360智能电磁炒菜机（触屏+喷料）
      "DLB-GQ30T", // 300智能电磁炒菜机（自动投料+喷料）
      "DLB-GB50", // 座地式500电磁炒菜机（触屏电动）
      "DLB-GC50", // 座地式500电磁炒菜机（语音菜单）
      "G50AAB", // 简易/智能团餐滚筒炒菜机（电磁款）
      "G60EAC", // 智能团餐滚筒炒菜机（电磁款）
      "DLB-XC80", // 多功能自动搅拌炒锅/炖烩机（触屏电动）
      "DLB-QXC80", // 多功能全自动搅拌炒锅/炖烩机（语音菜单+自动喷料）
      "DLB-PZJ100", // 多功能自动漂烫/焯水/油炸机
      "DLB-PZJ120", // 多功能自动漂烫/焯水/油炸机
    ],
    "central-kitchen": [
      // Standardized output, consistent taste across locations
      "DLB-TGQ40J", // 台式400智能电磁炒菜机（触屏）
      "DLB-TGQ36J", // 台式360智能电磁炒菜机（触屏800）
      "DLB-GC50", // 座地式500电磁炒菜机（语音菜单）
      "DLB-GC60", // 座地式600电磁炒菜机（触屏语音菜单）
      "DLB-GQ50", // 单边座地式500电磁炒菜机（触屏+自动摆臂喷料）
      "DLB-GQ60", // 座地式600电磁炒菜机（语音菜单+自动摆臂喷料）
      "G30DAG", // 智能立式滚筒炒菜机（电磁款）
      "G36DAG", // 智能立式滚筒炒菜机（电磁款）
      "B4RTD", // 台式智能燃气煲仔炉
      "B6RBD", // 立式智能燃气煲仔炉
      "DLB-XC100", // 多功能自动搅拌炒锅/炖烩机（触屏电动）
      "LZ80D1B", // 智能升降卤煮炉
    ],
    canteen: [
      // Large volume, diverse cooking methods, institutional
      "DLB-GB70", // 座地式700电磁炒菜机（触屏电动）
      "DLB-GC70", // 座地式700电磁炒菜机（触屏语音菜单）
      "DLB-GB80", // 座地式800电磁炒菜机（触屏电动）
      "DLB-GC80", // 座地式800电磁炒菜机（触屏语音菜单）
      "DLB-GQ70", // 座地式700电磁炒菜机（语音菜单+自动摆臂喷料）
      "G70EAC", // 智能团餐滚筒炒菜机（电磁款）
      "G80EAC", // 智能团餐滚筒炒菜机（电磁款）
      "DLB-XC100", // 多功能自动搅拌炒锅/炖烩机（触屏电动）
      "DLB-QXC100", // 多功能全自动搅拌炒锅/炖烩机（语音菜单+自动喷料）
      "DLB-PZJ200", // 多功能方形自动漂烫/焯水/油炸机
      "Z8FCB/Z12FCB", // 智能蒸饭机
      "Z6FCB", // 智能蒸饭机
      "DLB-ZNT", // （可倾式）全智能汤锅（100升）
      "DLB-BXC800", // 半自动旋转+翻炒电磁大炒锅
    ],
    "cloud-kitchen": [
      // Fast output, space-efficient, multi-station
      "DLB-TGS30", // 台式300智能电磁炒菜机（手动）
      "DLB-TGD30", // 台式300智能电磁炒菜机（电动）
      "DLB-TGQ30", // 台式300智能电磁炒菜机（触屏+喷料）
      "G26D1A", // 简易台式滚筒炒菜机(电磁款)
      "G30D1A", // 简易台式滚筒炒菜机（电磁款）
      "G26DAA", // 简易立式滚筒炒菜机(电磁款)
      "F32F1C", // 台式翻盖炒菜机（手动翻盖款）
      "Y12D1C", // 台式智能升降单缸油炸炉
      "Y12D2C", // 台式智能升降双缸油炸炉
      "GT2D1B", // 双头锅贴机
    ],
    "food-factory": [
      // Industrial scale, continuous operation
      "DLB-GB90", // 座地式900电磁炒菜机（触屏电动）
      "DLB-GC90", // 座地式900电磁炒菜机（触屏语音菜单）
      "DLB-GQ90", // 座地式900电磁炒菜机（语音菜单+自动摆臂喷料）
      "DLB-GB80", // 座地式800电磁炒菜机（触屏电动）
      "G80EAC", // 智能团餐滚筒炒菜机（电磁款）
      "DLB-XC120", // 多功能自动搅拌炒锅/炖烩机（触屏电动）
      "DLB-QXC120", // 多功能全自动搅拌炒锅/炖烩机（语音菜单+自动喷料）
      "DLB-PZJ400", // 多功能方形自动漂烫/焯水/油炸机
      "DLB-BXC800", // 半自动旋转+翻炒电磁大炒锅
      "HKQPJ500-VIII", // 多功能鲜肉切片机(双通道)
      "DLB-A6200", // 大长龙商用洗碗机(双缸双喷淋双烘干)
      "HKJGJ380-VI", // 锯骨机380
    ],
    "menu-lab": [
      // Precision control, experimentation, R&D
      "DLB-TGQ30J", // 台式300智能电磁炒菜机（触屏800）
      "DLB-TGQ36J", // 台式360智能电磁炒菜机（触屏800）
      "DLB-TGQ40J", // 台式400智能电磁炒菜机（触屏）
      "G30D1T", // 智能台式滚筒炒菜机（电磁新款）
      "G26DAG", // 智能立式滚筒炒菜机（电磁款）
      "G30DAG", // 智能立式滚筒炒菜机（电磁款）
      "J40CBB", // 全自动智能炒菜机
      "F32F1C", // 台式翻盖炒菜机（手动翻盖款）
      "DLB-TZS40", // 台式转锅搅拌炒菜机（炒饭机）
      "Y12D1C", // 台式智能升降单缸油炸炉
      "GT1D1B", // 单头锅贴机
      "B4RTD", // 台式智能燃气煲仔炉
    ],
  };

  /**
   * Get scenario key from URL path
   */
  function _getScenarioKey(path) {
    var m = path.match(/\/applications\/([^/]+)\//);
    return m ? m[1] : null;
  }

  /**
   * Load products by model name for the given scenario
   * Each scenario has its own independent product list
   */
  function _loadScenarioProducts(scenarioKey, callback, retries) {
    var modelList = SCENARIO_PRODUCTS[scenarioKey];
    if (!modelList) {
      callback([]);
      return;
    }
    var table = window.PRODUCT_DATA_TABLE || [];
    // Build lookup by model for O(1) matching
    var lookup = {};
    modelList.forEach(function (m) {
      lookup[m.toLowerCase()] = true;
    });
    var filtered = table.filter(function (p) {
      return lookup[p.model.toLowerCase()] === true;
    });
    // Retry if product-data-table.js hasn't loaded yet (max 10 tries, 100ms apart)
    if (filtered.length === 0 && !Array.isArray(window.PRODUCT_DATA_TABLE)) {
      retries = retries || 0;
      if (retries < 10) {
        setTimeout(function () {
          _loadScenarioProducts(scenarioKey, callback, retries + 1);
        }, 100);
        return;
      }
    }
    // Preserve the order specified in SCENARIO_PRODUCTS
    filtered.sort(function (a, b) {
      return modelList.indexOf(a.model) - modelList.indexOf(b.model);
    });
    callback(filtered);
  }

  /**
   * Generic PC grid renderer (4-column, shares same card template as homepage)
   */
  function _renderScenarioGrid(container, products, device) {
    if (!products || products.length === 0) {
      container.innerHTML =
        '<div class="text-center text-slate-400 py-8">' +
        escHtml(tl("no_scenario_products", "暂无场景产品数据")) +
        "</div>";
      return;
    }

    var VIS_COUNT = 8;
    var hasMore = products.length > VIS_COUNT;
    var visProducts = hasMore ? products.slice(0, VIS_COUNT) : products;
    var restProducts = hasMore ? products.slice(VIS_COUNT) : [];

    function buildCard(p) {
      var img = getPrimaryImage(p);
      var href = getProductDetailHref(p);
      var catSlug =
        {
          翻炒系列: "stirfry",
          炖煮系列: "stewing",
          蒸煮系列: "steaming",
          煎炸系列: "frying",
          切配系列: "cutting",
          辅助系列: "other",
        }[p.category] || "other";
      var catHref = "/products/" + catSlug + "/";

      if (device === "tablet") {
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
            ? '<a href="' +
              catHref +
              '" class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-2 hover:bg-primary/20 transition-colors">' +
              escHtml(translateCategory(p.category)) +
              "</a>"
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

      // PC: 4-column card
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
        (p.power ? '<span class="text-xs font-bold text-slate-400">' + escHtml(p.power) + "</span>" : "<span></span>") +
        '<a href="' +
        href +
        '" data-no-swup class="text-sm text-primary font-bold flex items-center gap-1 group-hover:gap-2 transition-all duration-300 hover:opacity-80" data-i18n="home_hw_learn_more">' +
        tl("home_hw_learn_more", "了解更多") +
        ' <span class="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span></a>' +
        "</div></div></div>"
      );
    }

    var gridClass =
      device === "tablet" ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8";
    var html = '<div id="scenario-grid" class="' + gridClass + '">';
    visProducts.forEach(function (p) {
      html += buildCard(p);
    });
    html += "</div>";

    if (hasMore) {
      html +=
        '<div id="scenario-hidden" style="display:none" class="grid ' + gridClass.replace("gap-8", "gap-8 mt-8") + '">';
      restProducts.forEach(function (p) {
        html += buildCard(p);
      });
      html += "</div>";
      var toggleText = tl("home_hw_show_more", "查看更多产品 ▼");
      html +=
        '<div class="flex justify-center mt-8">' +
        "<button onclick=\"(function(){var h=document.getElementById('scenario-hidden'),b=this;if(h.style.display==='none'){h.style.display='';b.textContent=typeof window.uiText==='function'?window.uiText('home_hw_collapse','Collapse ▲'):'Collapse ▲'}else{h.style.display='none';b.textContent=typeof window.uiText==='function'?window.uiText('home_hw_show_more','View More Products ▼'):'View More Products ▼'}})()\" class=\"px-6 py-2.5 rounded-full border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all cursor-pointer text-sm\" data-i18n=\"home_hw_show_more\">" +
        toggleText +
        "</button>" +
        "</div>";
    }

    container.innerHTML = html;

    if (window.translationManager && window.translationManager.applyTo) {
      window.translationManager.applyTo(container);
    }
  }

  /**
   * Scenario PC renderer
   */
  window.renderScenarioPC = function (containerId, scenarioKey) {
    var container = document.getElementById(containerId);
    if (!container) return;
    _loadScenarioProducts(scenarioKey, function (products) {
      _renderScenarioGrid(container, products, "pc");
    });
  };

  /**
   * Scenario Tablet renderer
   */
  window.renderScenarioTablet = function (containerId, scenarioKey) {
    var container = document.getElementById(containerId);
    if (!container) return;
    _loadScenarioProducts(scenarioKey, function (products) {
      _renderScenarioGrid(container, products, "tablet");
    });
  };

  /**
   * Scenario Mobile renderer (2-column grid)
   */
  window.renderScenarioMobile = function (containerId, scenarioKey) {
    var container = document.getElementById(containerId);
    if (!container) return;
    _loadScenarioProducts(scenarioKey, function (products) {
      if (!products || products.length === 0) {
        container.innerHTML = "";
        return;
      }

      var VIS = 6;
      var hasMore = products.length > VIS;
      var visProducts = hasMore ? products.slice(0, VIS) : products;
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

      var html = '<div class="grid grid-cols-2 gap-3">';
      visProducts.forEach(function (p) {
        html += buildCard(p);
      });
      html += "</div>";

      if (hasMore) {
        html += '<div id="scenario-hidden-mobile" style="display:none" class="grid grid-cols-2 gap-3 mt-3">';
        restProducts.forEach(function (p) {
          html += buildCard(p);
        });
        html += "</div>";
        html +=
          "<button id=\"scenario-load-more-mobile\" class=\"w-full mt-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-primary hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-center gap-2\" onclick=\"(function(){var h=document.getElementById('scenario-hidden-mobile');var btn=document.getElementById('scenario-load-more-mobile');if(h&&btn){h.style.display='';btn.style.display='none';window.translationManager&&window.translationManager.applyTo(h.parentElement);}})()\">" +
          '<span class="material-symbols-outlined text-lg">expand_more</span> ' +
          escHtml(tl("home_show_more", "更多产品")) +
          "</button>";
      }

      container.innerHTML = html;
      if (window.translationManager && window.translationManager.applyTo) {
        window.translationManager.applyTo(container);
      }
    });
  };

  /**
   * Update _autoInit to detect scenario pages
   */
  var _origAutoInit = _autoInit;
  window._autoInit = function () {
    var path = window.location.pathname || "/";
    var device = window.innerWidth < 768 ? "mobile" : window.innerWidth < 1280 ? "tablet" : "pc";

    // Homepage
    if (path.indexOf("/home") !== -1) {
      if (device === "mobile") window.renderHomeCoreMobile("home-core-products-mobile");
      else if (device === "tablet") window.renderHomeCoreTablet("home-core-products-tablet");
      else window.renderHomeCorePC("home-core-products-pc");
      return;
    }

    // Scenario pages
    var scenarioKey = _getScenarioKey(path);
    if (scenarioKey && SCENARIO_PRODUCTS[scenarioKey]) {
      if (device === "mobile") window.renderScenarioMobile("scenario-products-mobile", scenarioKey);
      else if (device === "tablet") window.renderScenarioTablet("scenario-products-tablet", scenarioKey);
      else window.renderScenarioPC("scenario-products-pc", scenarioKey);
      return;
    }

    // Fallback to original for other pages
    if (path.indexOf("/home") !== -1) {
      _origAutoInit.call(this);
    }
  };
})();
