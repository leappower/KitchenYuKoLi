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

  var DROPDOWN_WRAP_SELECTORS = [
    ".prod-dropdown-wrap", ".app-dropdown-wrap",
    ".sup-dropdown-wrap", ".abt-dropdown-wrap", ".cnt-dropdown-wrap",
  ];

  var DROPDOWN_PANEL_SELECTOR = ".prod-dropdown-panel, .app-dropdown-panel, .sup-dropdown-panel, .abt-dropdown-panel, .cnt-dropdown-panel";

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

    // ── content:replace ──────────────────────────────────────────────
    swupHooks.on("content:replace", function (visit) {
      global.__spaNavigating = false;
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
      // Close all dropdowns: remove is-open, block pointer-events,
      // and force display:none on all panels.
      // display:none is the only reliable way to override the CSS rule:
      //   .dropdown-wrap:hover .dropdown-panel { visibility:visible }
      // which fires instantly when the mouse is still over the area
      // after SPA navigation loads new DOM.
      try {
        for (var wi = 0; wi < DROPDOWN_WRAP_SELECTORS.length; wi++) {
          var wraps = document.querySelectorAll(DROPDOWN_WRAP_SELECTORS[wi]);
          for (var wj = 0; wj < wraps.length; wj++) {
            wraps[wj].classList.remove("is-open");
            wraps[wj].style.pointerEvents = "none";
            var panel = wraps[wj].querySelector(DROPDOWN_PANEL_SELECTOR);
            if (panel) {
              panel.style.display = "none";
              panel.dataset.navHidden = "1";
            }
          }
        }
        global.__pendingPointerRestore = true;
      } catch (e) {}
    });

    // ── Restore dropdown state (called after navigation completes) ──
    //
    // Strategy: Restore pointer-events immediately so dropdowns work.
    // But keep display:none on panels until the user moves their mouse
    // OUT of the dropdown area. Only then clear display:none.
    //
    // Why: dropdown-styles.js CSS rule
    //   .wrap:hover .panel { visibility:visible; opacity:1 }
    // fires instantly on any element under the cursor after DOM load.
    // No timeout is reliable — only mouseleave guarantees the user
    // has moved away.
    function _restoreDropdownState() {
      if (!global.__pendingPointerRestore) return;
      global.__pendingPointerRestore = false;

      for (var wi = 0; wi < DROPDOWN_WRAP_SELECTORS.length; wi++) {
        var wraps = document.querySelectorAll(DROPDOWN_WRAP_SELECTORS[wi]);
        for (var wj = 0; wj < wraps.length; wj++) {
          wraps[wj].style.pointerEvents = "";
        }
      }

      // Schedule panel restore on mouseleave. Use a one-shot
      // listener on document.body that fires once the mouse leaves
      // ANY dropdown wrap. Then clear display:none on all panels.
      function _onLeave() {
        document.body.removeEventListener("mouseleave", _onLeave, true);
        var panels = document.querySelectorAll(DROPDOWN_PANEL_SELECTOR);
        for (var pi = 0; pi < panels.length; pi++) {
          if (panels[pi].dataset.navHidden === "1") {
            panels[pi].style.display = "";
            delete panels[pi].dataset.navHidden;
          }
        }
      }
      document.body.addEventListener("mouseleave", _onLeave, true);

      // Safety timeout: if mouseleave never fires (e.g. touch device),
      // restore after 2 seconds.
      setTimeout(function () {
        document.body.removeEventListener("mouseleave", _onLeave, true);
        _onLeave();
      }, 2000);
    }

    swupHooks.on("visit:abort", _restoreDropdownState);
    swupHooks.on("fetch:error", _restoreDropdownState);

    // ── Post-navigation cleanup: close any newly injected dropdowns ──
    swupHooks.on("content:replace", function () {
      _lastSwupNavStart = 0;
      requestAnimationFrame(function () {
        // spa:load may have injected new dropdown panels.
        // Force display:none on them before restoring state.
        for (var wi = 0; wi < DROPDOWN_WRAP_SELECTORS.length; wi++) {
          var wraps = document.querySelectorAll(DROPDOWN_WRAP_SELECTORS[wi]);
          for (var wj = 0; wj < wraps.length; wj++) {
            wraps[wj].classList.remove("is-open");
            var panel = wraps[wj].querySelector(DROPDOWN_PANEL_SELECTOR);
            if (panel && panel.dataset.navHidden !== "1") {
              panel.style.display = "none";
              panel.dataset.navHidden = "1";
            }
          }
        }
        _restoreDropdownState();
      });
    });

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
