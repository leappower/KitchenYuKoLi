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
      var deviceUtils = window.DeviceUtils;
      if (!deviceUtils || !deviceUtils.getDeviceType) return;
      var deviceType = deviceUtils.getDeviceType();
      var suffixMap = { mobile: "index-mobile.html", tablet: "index-tablet.html", pc: "index-pc.html" };
      var suffix = suffixMap[deviceType];
      if (!suffix) return;
      swupHooks.on("fetch:request", function (visit, { args }) {
        if (!args || !args.url) return;
        var url = args.url;
        console.warn("[spa-router] fetch:request URL:", url);
        // 只对已知的静态页面根路径（一级路径）添加设备后缀
        // 排除所有多级路径（动态路由如 /products/detail/xxx/、/products/stirfry/xxx/ 等）
        // 只有 /home/、/products/、/applications/、/about/、/contact/、/cases/、/news/ 等根路径才需要替换
        var pathParts = url
          .replace(/\/index\.html$/, "")
          .replace(/^https?:\/\/[^/]+/, "")
          .split("/")
          .filter(Boolean);
        console.warn("[spa-router] fetch:request pathParts:", pathParts, "length:", pathParts.length);
        if (pathParts.length !== 1) {
          console.warn("[spa-router] fetch:request 跳过（多级路径）:", url);
          return;
        }
        if (!/\/$/.test(url)) return;
        if (/index-(mobile|pc|tablet)\.html$/.test(url)) return;
        var newUrl = url.replace(/\/$/, "") + "/" + suffix;
        console.warn("[spa-router] fetch:request 替换:", url, "→", newUrl);
        args.url = newUrl;
      });
    })();

    var _dynamicScripts = [];
    var _globalScriptPatterns =
      window._SPA_GLOBAL_PATTERNS ||
      /(?:^|[/])(?:product-data-table|spa-router|swup|translations|lang-registry|translations-dropdown-template|spa-events|dropdown-base|dropdown-styles|navigator|nav-config|footer|slide-menu|products-dropdown|applications-dropdown|support-dropdown|about-dropdown|contact-dropdown|product-list|product-grid|product-detail|case-grid|utils|search-engine|device-utils|hero-video|contacts|page-interactions|common|main|init|image-assets|media-queries|floating-actions|currency|custom-select|breadcrumb|home-core-products|compare|cross-sell|profit-calculator|quote-form|quote-select-i18n|quote-budget-i18n|news-detail|support-contact-channels|support-wechat-modal|helpers|page-effects|router|roi-data|cases-page|html2canvas|jspdf|pi-maps)\.js/;
    function reloadPageScripts(newDoc) {
      if (!newDoc) return;
      for (var d = 0; d < _dynamicScripts.length; d++) {
        if (_dynamicScripts[d].parentNode) {
          _dynamicScripts[d].parentNode.removeChild(_dynamicScripts[d]);
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
      function injectBatch(idx) {
        var batchSize = 3;
        var end = Math.min(idx + batchSize, toInject.length);
        for (var j = idx; j < end; j++) {
          var newScript = document.createElement("script");
          newScript.src = toInject[j];
          newScript.async = true;
          document.head.appendChild(newScript);
          _dynamicScripts.push(newScript);
        }
        if (end < toInject.length) {
          (window.requestIdleCallback || window.setTimeout)(function () {
            injectBatch(end);
          });
        }
      }
      if (toInject.length > 0) {
        (window.requestIdleCallback || window.setTimeout)(function () {
          injectBatch(0);
        });
      }
    }

    // ── visit:start ──────────────────────────────────────────────────
    var _lastSwupNavStart = 0;
    swupHooks.on("visit:start", function () {
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
      _lastSwupNavStart = 0;
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
