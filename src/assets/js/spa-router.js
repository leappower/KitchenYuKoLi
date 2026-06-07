/* ─── Suppress third-party DOM errors ──────────────────────────────── */
(function () {
  window.onerror = function (msg) {
    if (msg && /removeChild.*not a child of/i.test(msg)) return true;
  };
  document.addEventListener(
    "error",
    function (e) {
      if (e.message && /removeChild.*not a child of/i.test(e.message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );
})();

// Auto-detect build version from the first script tag with ?v=...
(function () {
  var scripts = document.querySelectorAll('script[src*="?v="]');
  for (var i = 0; i < scripts.length; i++) {
    var m = scripts[i].src.match(/\?v=([a-zA-Z0-9._-]+)/);
    if (m) {
      window._spaScriptVersion = m[1];
      break;
    }
  }
})();

/**
 * spa-router.js — Swup-backed SPA router
 */
(function (_global) {
  "use strict";

  var _spaState = { currentRoute: window.location.pathname.replace(/\/$/, "") || "/" };
  var _spaListeners = [];
  var _spaRegs = {};

  // ── Event system ──────────────────────────────────────────────────
  window.__onSpaEvent = function (name, cb) {
    if (typeof name !== "string" || typeof cb !== "function") return;
    _spaListeners.push({ name: name, cb: cb });
  };
  window.__spaNavigating = false;

  function emitSpaEvent(name, data) {
    for (var i = 0; i < _spaListeners.length; i++) {
      if (_spaListeners[i].name === name) {
        try {
          _spaListeners[i].cb(data);
        } catch (e) {
          /* ignore */
        }
      }
    }
  }

  function dispatchSpaLoad() {
    emitSpaEvent("spa:load", { path: window.location.pathname });
    var evt = new CustomEvent("spa:load", { detail: { path: window.location.pathname } });
    window.dispatchEvent(evt);
    document.dispatchEvent(evt);
  }

  // ── Swup initialization ────────────────────────────────────────────
  function initSwup() {
    if (window.swupInstance) {
      try {
        window.swupInstance.destroy();
      } catch (e) {
        /* ignore */
      }
      window.swupInstance = null;
    }

    if (window.Swup === undefined) {
      var _swupReady = document.getElementById("swup-js");
      if (_swupReady) {
        _swupReady.addEventListener("load", initSwup);
        _swupReady.addEventListener("error", function () {
          setTimeout(initSwup, 50);
        });
      } else {
        setTimeout(initSwup, 10);
      }
      return;
    }

    var swup;
    try {
      try {
        if (
          typeof window.Swup !== "function" ||
          typeof window.SwupHeadPlugin !== "function" ||
          typeof window.SwupPreloadPlugin !== "function"
        ) {
          console.warn("[spa-router] Swup or plugins not loaded, falling back to traditional navigation");
          window.__spaNavigating = false;
          return;
        }
        swup = new window.Swup({
          containers: ["#spa-content"],
          linkSelector:
            'a[href^="/"]:not([href$=".pdf"]):not([href$=".zip"]):not([href$=".doc"]):not([href*="mailto:"]):not([href*="tel:"]):not([target="_blank"])',
          plugins: [
            new window.SwupHeadPlugin({
              persistTags: 'style[id], style[data-swup-persist], link[rel="stylesheet"][href], script[src]',
              persistAssets: true,
            }),
            new window.SwupPreloadPlugin({ preloadHoveredLinks: true, preloadInitialPage: false }),
          ],
          animateHistoryBrowsing: false,
          skipPopStateHandling: function () {
            return false;
          },
        });
      } catch (e) {
        console.warn("[spa-router] Swup init failed, falling back to traditional navigation:", e.message);
        window.__spaNavigating = false;
        return;
      }
    } catch (e) {
      console.error("[spa-router] Swup init failed:", e);
      window.__spaNavigating = false;
      return;
    }

    window.swupInstance = swup;
    var swupHooks = swup.hooks || swup;

    // ── Client-side device-aware fetch ─────────────────────────────
    (function () {
      var suffixMap = { mobile: "index-mobile.html", tablet: "index-tablet.html", pc: "index-pc.html" };
      swupHooks.before("fetch:request", function (visit, args) {
        if (!args || !args.url) return;
        var deviceUtils = window.DeviceUtils;
        if (!deviceUtils || !deviceUtils.getDeviceType) {
          return;
        }
        var deviceType = deviceUtils.getDeviceType();
        var suffix = suffixMap[deviceType];
        if (!suffix) return;
        var url = args.url;
        var pathParts = url
          .replace(/\/index\.html$/, "")
          .replace(/^https?:\/\/[^/]+/, "")
          .split("/")
          .filter(Boolean);
        var isProductsCategory =
          pathParts.length === 2 && pathParts[0] === "products" && /^[a-z-]+$/.test(pathParts[1]);
        // 允许所有有设备三屏静态入口的目录 URL
        // 排除：产品详情页（/products/{cat}/{model}/）等三级以上路径
        var isStaticPage = pathParts.length <= 2;
        // 排除 products 下的 model 详情路径（/products/DLB-GD30/ 不带 category slug）
        var isProductDetail = pathParts.length >= 3 && pathParts[0] === "products";
        // 排除搜索直接跳转的无 category 路径：/products/DLB-GD30/（2级，第二个段包含大写/数字）
        var isProductModelPath =
          pathParts.length === 2 && pathParts[0] === "products" && !/^[a-z-]+$/.test(pathParts[1]);
        if (!isStaticPage || isProductDetail || isProductModelPath) {
          return;
        }
        if (!/\/$/.test(url)) {
          return;
        }
        if (/index-(mobile|pc|tablet)\.html$/.test(url)) {
          return;
        }
        args.url = url.replace(/\/$/, "") + "/" + suffix;
      });
    })();

    var _dynamicScripts = [];
    var _globalScriptPatterns =
      window._SPA_GLOBAL_PATTERNS ||
      /(?:^|[/])(?:product-data-table|spa-router|swup|translations|lang-registry|translations-dropdown-template|spa-events|dropdown-base|dropdown-styles|navigator|nav-config|footer|slide-menu|products-dropdown|applications-dropdown|support-dropdown|about-dropdown|contact-dropdown|product-list|product-grid|product-detail|case-grid|utils|search-engine|device-utils|hero-video|contacts|page-interactions|common|main|init|image-assets|media-queries|floating-actions|currency|custom-select|breadcrumb|home-core-products|compare|cross-sell|profit-calculator|quote-form|quote-select-i18n|quote-budget-i18n|news-detail|support-contact-channels|support-wechat-modal|helpers|page-effects|router|roi-data|cases-page|scenario-products|html2canvas|jspdf|pi-maps)\.js/;
    function reloadPageScripts(newDoc) {
      if (!newDoc) return;
      for (var d = 0; d < _dynamicScripts.length; d++) {
        try {
          if (_dynamicScripts[d].parentNode) {
            _dynamicScripts[d].parentNode.removeChild(_dynamicScripts[d]);
          }
        } catch (e) {
          // ignore: removeChild may fail if parent was modified by SPA
        }
      }
      _dynamicScripts = [];
      var headScripts = newDoc.head.querySelectorAll("script[src]");
      var bodyScripts = newDoc.body.querySelectorAll("script[src]");
      var allNewScripts = Array.prototype.slice.call(headScripts).concat(Array.prototype.slice.call(bodyScripts));
      var currentScripts = document.querySelectorAll("script[src]");
      var currentSrcs = {};
      for (var c = 0; c < currentScripts.length; c++) {
        var curKey = currentScripts[c].getAttribute("src").replace(/\?.*$/, "");
        currentSrcs[curKey] = true;
      }
      var toInject = [];
      for (var i = 0; i < allNewScripts.length; i++) {
        var src = allNewScripts[i].getAttribute("src");
        if (!src) continue;
        var srcKey = src.replace(/\?.*$/, "");
        if (_globalScriptPatterns.test(srcKey)) continue;
        if (currentSrcs[srcKey]) continue;
        toInject.push(src);
        currentSrcs[srcKey] = true;
      }
      function injectSequential(idx) {
        if (idx >= toInject.length) return;
        var newScript = document.createElement("script");
        newScript.src = toInject[idx];
        newScript.onload = function () {
          injectSequential(idx + 1);
        };
        newScript.onerror = function () {
          injectSequential(idx + 1);
        };
        document.head.appendChild(newScript);
        _dynamicScripts.push(newScript);
      }
      if (toInject.length > 0) {
        injectSequential(0);
      }
    }

    // ── visit:start ──────────────────────────────────────────────────
    var _lastSwupNavStart = 0;
    swupHooks.on("visit:start", function (visit) {
      window.__spaNavigating = true;
      _lastSwupNavStart = Date.now();
      var skel = document.getElementById("skeleton-overlay");
      if (skel) {
        skel.removeAttribute("hidden");
        skel.style.display = "";
        skel.style.opacity = "1";
      }
    });

    // ── content:replace ──────────────────────────────────────────────
    swupHooks.on("content:replace", function (visit) {
      window.__spaNavigating = false;
      // Re-inject srcset for new content (replaces expensive MutationObserver)
      var lazyMod = window.app && window.app.modules && window.app.modules.get("lazyLoading");
      if (lazyMod && typeof lazyMod.reInjectSrcset === "function") {
        lazyMod.reInjectSrcset(document.getElementById("spa-content") || document);
      }
      _lastSwupNavStart = 0;
      // 清理设备后缀，保持干净 URL
      var _url = window.location.href;
      if (/index-(mobile|tablet|pc)\.html$/.test(_url)) {
        var clean = _url.replace(/\/index-(mobile|tablet|pc)\.html$/, "/");
        window.__redirectChecked = true;
        history.replaceState(null, "", clean);
      }
      _spaState.currentRoute = window.location.pathname.replace(/\/$/, "") || "/";
      var skel = document.getElementById("skeleton-overlay");
      if (skel) {
        var onSkeletonFadeOut = function (e) {
          if (e.propertyName !== "opacity") return;
          skel.removeEventListener("transitionend", onSkeletonFadeOut);
          skel.style.display = "none";
        };
        skel.addEventListener("transitionend", onSkeletonFadeOut);
        skel.style.opacity = "0";
        // Safety net: if transitionend never fires (e.g. reduced-motion),
        // hide after 400ms (CSS transition is 250ms + margin)
        setTimeout(function () {
          if (skel.style.opacity !== "0" || skel.style.display !== "none") {
            skel.removeEventListener("transitionend", onSkeletonFadeOut);
            skel.style.display = "none";
          }
          document.body.classList.add("yukoli-ready");
        }, 400);
      } else {
        document.body.classList.add("yukoli-ready");
      }
      var newDoc = visit && visit.to && visit.to.document ? visit.to.document : null;
      reloadPageScripts(newDoc);
      // 确保 navigator 组件存在（SPA 替换可能清空了它的 DOM）
      var navPlaceholder = document.querySelector('[data-component="navigator"]');
      if (
        navPlaceholder &&
        !navPlaceholder.querySelector("header") &&
        window.Navigator &&
        typeof window.Navigator.mount === "function"
      ) {
        window.Navigator.mount();
      }
      if (window.Navigator && typeof window.Navigator.updateActive === "function") {
        var sectionId =
          _spaState.currentRoute === "/"
            ? "/"
            : (_spaState.currentRoute.match(/^\/([^/]+)/) || [])[1] || _spaState.currentRoute;
        window.Navigator.updateActive(sectionId);
      }
      if (window.SlideMenu && typeof window.SlideMenu.updateActive === "function") {
        window.SlideMenu.updateActive();
      }
      if (window.Footer && typeof window.Footer.updateActive === "function") {
        window.Footer.updateActive(sectionId);
      }
      dispatchSpaLoad();
    });

    // ── Safety net ──────────────────────────────────────────────────
    document.addEventListener(
      "click",
      function (_e) {
        if (window.__spaNavigating && Date.now() - _lastSwupNavStart > 3000) {
          window.__spaNavigating = false;
          _lastSwupNavStart = 0;
        }
      },
      true
    );

    window.addEventListener("popstate", function () {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
  }

  // ── Backward-compatible API ────────────────────────────────────────
  var SpaRouter = {
    navigate: function (url) {
      if (!url) return;
      if (window.swupInstance) {
        try {
          var navResult = window.swupInstance.navigate(url);
          if (navResult && typeof navResult.catch === "function") {
            navResult.catch(function () {
              window.location.href = url;
            });
          }
        } catch (e) {
          window.location.href = url;
        }
      } else {
        window.location.href = url;
      }
    },
    getCurrentPath: function () {
      return _spaState.currentRoute || window.location.pathname.replace(/\/$/, "") || "/";
    },
    _pendingScroll: null,
  };

  window.SpaRouter = SpaRouter;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initSwup();
      var path = window.location.pathname;
      if (path === "/" || path === "/index.html") {
        history.replaceState(null, "", "/home/");
      }
      var redirectParam = new URLSearchParams(window.location.search).get("redirect");
      if (redirectParam) {
        history.replaceState(null, "", redirectParam);
      }
    });
  } else {
    initSwup();
  }
})(window);
