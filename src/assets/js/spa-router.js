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
(function (global) {
  "use strict";

  var _spaState = { currentRoute: global.location.pathname.replace(/\/$/, "") || "/" };
  var _spaListeners = [];
  var _spaRegs = {};

  // ── Event system ──────────────────────────────────────────────────
  global.__onSpaEvent = function (name, cb) {
    if (typeof name !== "string" || typeof cb !== "function") return;
    _spaListeners.push({ name: name, cb: cb });
  };
  global.__spaNavigating = false;

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
    emitSpaEvent("spa:load", { path: global.location.pathname });
    var evt = new CustomEvent("spa:load", { detail: { path: global.location.pathname } });
    global.dispatchEvent(evt);
    document.dispatchEvent(evt);
  }

  // ── Swup initialization ────────────────────────────────────────────
  function initSwup() {
    if (global.swupInstance) {
      try {
        global.swupInstance.destroy();
      } catch (e) {
        /* ignore */
      }
      global.swupInstance = null;
    }

    if (global.Swup === undefined) {
      setTimeout(initSwup, 10);
      return;
    }

    var swup;
    try {
      swup = new global.Swup({
        containers: ["#spa-content"],
        linkSelector:
          'a[href^="/"]:not([href$=".pdf"]):not([href$=".zip"]):not([href$=".doc"]):not([href*="mailto:"]):not([href*="tel:"]):not([target="_blank"])',
        plugins: [
          new global.SwupHeadPlugin({
            persistTags: 'style[id], style[data-swup-persist], link[rel="stylesheet"][href], script[src]',
            persistAssets: true,
          }),
          new global.SwupPreloadPlugin({ preloadHoveredLinks: true, preloadInitialPage: false }),
        ],
        animateHistoryBrowsing: false,
      });
    } catch (e) {
      console.error("[spa-router] Swup init failed:", e);
      global.__spaNavigating = false;
      return;
    }

    global.swupInstance = swup;
    var swupHooks = swup.hooks || swup;

    // ── Client-side device-aware fetch ─────────────────────────────
    (function () {
      var deviceUtils = global.DeviceUtils;
      if (!deviceUtils || !deviceUtils.getDeviceType) return;
      var deviceType = deviceUtils.getDeviceType();
      var suffixMap = { mobile: "index-mobile.html", tablet: "index-tablet.html", pc: "index-pc.html" };
      var suffix = suffixMap[deviceType];
      if (!suffix) return;
      swupHooks.on("fetch:request", function (visit, { args }) {
        if (!args || !args.url) return;
        var url = args.url;
        if (!/\/$/.test(url) && !/\/index\.html$/.test(url)) return;
        if (/index-(mobile|pc|tablet)\.html$/.test(url)) return;
        var base = url.replace(/\/index\.html$/, "");
        var newUrl = base + suffix;
        args.url = newUrl;
      });
    })();

    var _dynamicScripts = [];
    var _globalScriptPatterns =
      window._SPA_GLOBAL_PATTERNS ||
      /(?:^|[/])(?:product-data-table|spa-router|swup|translations|lang-registry|translations-dropdown-template|spa-events|dropdown-base|dropdown-styles|navigator|nav-config|footer|slide-menu|products-dropdown|applications-dropdown|support-dropdown|about-dropdown|contact-dropdown|product-list|product-grid|product-detail|case-grid|utils|search-engine|device-utils|hero-video|contacts|page-interactions|common|main|init|image-assets|media-queries|floating-actions|currency|custom-select|breadcrumb|home-core-products|compare|cross-sell|profit-calculator|quote-form|quote-select-i18n|quote-budget-i18n|news-detail|support-contact-channels|support-wechat-modal|smart-popup|helpers|page-effects|form-interactions|router|roi-data|cases-page|html2canvas|jspdf|pi-maps)\.js/;
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
          newScript.async = false;
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
      global.__spaNavigating = true;
      _lastSwupNavStart = Date.now();
      var skel = document.getElementById("skeleton-overlay");
      if (skel) {
        skel.style.display = "";
        skel.removeAttribute("hidden");
      }
    });

    // ── content:replace ──────────────────────────────────────────────
    swupHooks.on("content:replace", function (visit) {
      global.__spaNavigating = false;
      _lastSwupNavStart = 0;
      _spaState.currentRoute = global.location.pathname.replace(/\/$/, "") || "/";
      var skel = document.getElementById("skeleton-overlay");
      if (skel) {
        skel.setAttribute("hidden", "");
        setTimeout(function () {
          skel.style.display = "none";
        }, 300);
      }
      var newDoc = visit && visit.to && visit.to.document ? visit.to.document : null;
      reloadPageScripts(newDoc);
      if (global.Navigator && typeof global.Navigator.updateActive === "function") {
        var sectionId =
          _spaState.currentRoute === "/"
            ? "/"
            : (_spaState.currentRoute.match(/^\/([^/]+)/) || [])[1] || _spaState.currentRoute;
        global.Navigator.updateActive(sectionId);
      }
      if (global.SlideMenu && typeof global.SlideMenu.updateActive === "function") {
        global.SlideMenu.updateActive();
      }
      if (global.Footer && typeof global.Footer.updateActive === "function") {
        global.Footer.updateActive(sectionId);
      }
      dispatchSpaLoad();
    });

    // ── Safety net ──────────────────────────────────────────────────
    document.addEventListener(
      "click",
      function (e) {
        if (global.__spaNavigating && Date.now() - _lastSwupNavStart > 3000) {
          global.__spaNavigating = false;
          _lastSwupNavStart = 0;
        }
      },
      true
    );

    global.addEventListener("popstate", function () {
      global.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
  }

  // ── Backward-compatible API ────────────────────────────────────────
  var SpaRouter = {
    navigate: function (url) {
      if (!url) return;
      if (global.swupInstance) {
        global.swupInstance.navigate(url);
      } else {
        global.location.href = url;
      }
    },
    getCurrentPath: function () {
      return _spaState.currentRoute || global.location.pathname.replace(/\/$/, "") || "/";
    },
    _pendingScroll: null,
  };

  global.SpaRouter = SpaRouter;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initSwup();
      var path = global.location.pathname;
      if (path === "/" || path === "/index.html") {
        history.replaceState(null, "", "/home/");
      }
      var redirectParam = new URLSearchParams(global.location.search).get("redirect");
      if (redirectParam) {
        history.replaceState(null, "", redirectParam);
      }
    });
  } else {
    initSwup();
  }
})(window);
