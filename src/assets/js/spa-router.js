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

  // ── DEBUG: trace ALL panel display changes ─────────────────────
  function _logPanelState(label) {
    var panels = document.querySelectorAll('.prod-dropdown-panel, .app-dropdown-panel, .sup-dropdown-panel, .abt-dropdown-panel, .cnt-dropdown-panel');
    for (var pi = 0; pi < panels.length; pi++) {
      var p = panels[pi];
      var wrap = p.closest('[class*="dropdown-wrap"]');
      var wrapClass = wrap ? wrap.className : '(no wrap)';
      var cs = window.getComputedStyle(p);
      console.log('[PANEL:' + label + '] #' + pi + ' wrap=' + wrapClass.substring(0, 40) +
        ' display=' + p.style.display +
        ' computed.visibility=' + cs.visibility +
        ' computed.opacity=' + cs.opacity +
        ' computed.display=' + cs.display +
        ' navHidden=' + (p.dataset.navHidden || 'none'));
    }
  }
  window.__logPanelState = _logPanelState;

  // ── DEBUG: MutationObserver on dropdown wraps ──────────────────
  function _watchDropdownMutations() {
    var wraps = document.querySelectorAll('.prod-dropdown-wrap, .app-dropdown-wrap, .sup-dropdown-wrap, .abt-dropdown-wrap, .cnt-dropdown-wrap');
    for (var wi = 0; wi < wraps.length; wi++) {
      if (wraps[wi]._watched) continue;
      wraps[wi]._watched = true;
      new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          if (m.target.style && m.attributeName === 'style') {
            var display = m.target.querySelector('.prod-dropdown-panel, .app-dropdown-panel, .sup-dropdown-panel, .abt-dropdown-panel, .cnt-dropdown-panel');
            if (display) {
              console.log('[PANEL:MUTATION] style changed on wrap: ' + m.target.className.substring(0, 40) +
                ' panel.style.display=' + display.style.display +
                ' stack=' + (new Error().stack || '').split('\n').slice(2, 5).join(' → '));
            }
          }
        });
      }).observe(wraps[wi], { attributes: true, attributeFilter: ['style'] });
    }
  }

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

    // ── Hook 1: content:replace (registered first) ──────────────────
    swupHooks.on("content:replace", function (visit) {
      console.log('[SPA] === content:replace START ===');
      _logPanelState('content-replace-start');
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
      console.log('[SPA] === content:replace before dispatchSpaLoad ===');
      _logPanelState('content-replace-before-spa-load');
      dispatchSpaLoad();
      console.log('[SPA] === content:replace after dispatchSpaLoad ===');
      _logPanelState('content-replace-after-spa-load');
    });

    // ── visit:start ──────────────────────────────────────────────────
    var _lastSwupNavStart = 0;
    swupHooks.on("visit:start", function () {
      console.log('[SPA] === visit:start ===');
      _logPanelState('visit-start-before');
      _watchDropdownMutations();
      global.__spaNavigating = true;
      _lastSwupNavStart = Date.now();
      var skel = document.getElementById("skeleton-overlay");
      if (skel) {
        skel.style.display = "";
        skel.removeAttribute("hidden");
      }
      try {
        var wrapSelectors = [
          ".prod-dropdown-wrap", ".app-dropdown-wrap",
          ".sup-dropdown-wrap", ".abt-dropdown-wrap", ".cnt-dropdown-wrap",
        ];
        for (var wi = 0; wi < wrapSelectors.length; wi++) {
          var wraps = document.querySelectorAll(wrapSelectors[wi]);
          for (var wj = 0; wj < wraps.length; wj++) {
            wraps[wj].classList.remove("is-open");
            wraps[wj].style.pointerEvents = "none";
            var panel = wraps[wj].querySelector(
              ".prod-dropdown-panel, .app-dropdown-panel, .sup-dropdown-panel, .abt-dropdown-panel, .cnt-dropdown-panel"
            );
            if (panel) {
              console.log('[SPA:visit:start] panel display BEFORE: ' + panel.style.display);
              panel.style.display = "none";
              panel.dataset.navHidden = "1";
              console.log('[SPA:visit:start] panel display AFTER: ' + panel.style.display + ' navHidden=' + panel.dataset.navHidden);
            }
          }
        }
        global.__pendingPointerRestore = true;
      } catch (e) {}
      _logPanelState('visit-start-after');

      // Check for residual hover 500ms after navigation completes
      setTimeout(function () {
        console.log('[SPA] === 500ms post-visit:start residual check ===');
        _logPanelState('residual-500ms');
        var allPanels = document.querySelectorAll('.prod-dropdown-panel, .app-dropdown-panel, .sup-dropdown-panel, .abt-dropdown-panel, .cnt-dropdown-panel');
        for (var api = 0; api < allPanels.length; api++) {
          var ap = allPanels[api];
          var cs = window.getComputedStyle(ap);
          if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0) {
            console.log('[SPA:residual] Panel #' + api + ' still visible! computed.display=' + cs.display + ' computed.visibility=' + cs.visibility + ' computed.opacity=' + cs.opacity);
            ap.style.display = 'none';
            ap.dataset.navHidden = '1';
            setTimeout(function () {
              if (ap.dataset.navHidden === '1') {
                ap.style.display = '';
                delete ap.dataset.navHidden;
                console.log('[SPA:residual] Restored panel display after cooldown');
              }
            }, 800);
          }
        }
      }, 500);
    });

    // ── Graceful degradation ──────────────────────────────────────
    function _restoreDropdownState() {
      console.log('[SPA] _restoreDropdownState() called, pending=' + global.__pendingPointerRestore);
      if (!global.__pendingPointerRestore) {
        console.log('[SPA] _restoreDropdownState SKIP — not pending');
        return;
      }
      global.__pendingPointerRestore = false;
      var wrapSelectors = [
        ".prod-dropdown-wrap", ".app-dropdown-wrap",
        ".sup-dropdown-wrap", ".abt-dropdown-wrap", ".cnt-dropdown-wrap",
      ];
      for (var wi = 0; wi < wrapSelectors.length; wi++) {
        var wraps = document.querySelectorAll(wrapSelectors[wi]);
        for (var wj = 0; wj < wraps.length; wj++) {
          wraps[wj].style.pointerEvents = "";
          var panel = wraps[wj].querySelector(
            ".prod-dropdown-panel, .app-dropdown-panel, .sup-dropdown-panel, .abt-dropdown-panel, .cnt-dropdown-panel"
          );
          if (panel) {
            console.log('[SPA:_restore] panel BEFORE restore: display=' + panel.style.display + ' navHidden=' + (panel.dataset.navHidden || 'none'));
            if (panel.dataset.navHidden === "1") {
              panel.style.display = "";
              delete panel.dataset.navHidden;
              console.log('[SPA:_restore] panel RESTORED: display now=' + panel.style.display);
            } else {
              console.log('[SPA:_restore] panel NOT restored (navHidden !== "1"), keeping display=' + panel.style.display);
            }
          }
        }
      }
      _logPanelState('restore-dropdown-done');
    }

    swupHooks.on("visit:abort", _restoreDropdownState);
    swupHooks.on("fetch:error", _restoreDropdownState);

    // ── Hook 2: content:replace (registered second, for panel cleanup) ──
    swupHooks.on("content:replace", function () {
      console.log('[SPA] === content:replace hook 2 (panel cleanup) ===');
      _lastSwupNavStart = 0;
      _logPanelState('content-replace-hook2-before');
      global.__spaRestorePending = true;
      requestAnimationFrame(function () {
        console.log('[SPA] === rAF callback (post spa:load) ===');
        _logPanelState('raf-before-cleanup');
        var wrapSelectors = [
          ".prod-dropdown-wrap", ".app-dropdown-wrap",
          ".sup-dropdown-wrap", ".abt-dropdown-wrap", ".cnt-dropdown-wrap",
        ];
        for (var wi = 0; wi < wrapSelectors.length; wi++) {
          var wraps = document.querySelectorAll(wrapSelectors[wi]);
          for (var wj = 0; wj < wraps.length; wj++) {
            wraps[wj].classList.remove("is-open");
            var panel = wraps[wj].querySelector(
              ".prod-dropdown-panel, .app-dropdown-panel, .sup-dropdown-panel, .abt-dropdown-panel, .cnt-dropdown-panel"
            );
            if (panel) {
              console.log('[SPA:rAF] panel BEFORE cleanup: display=' + panel.style.display + ' navHidden=' + (panel.dataset.navHidden || 'none'));
              panel.style.display = "none";
              panel.dataset.navHidden = "1";
              console.log('[SPA:rAF] panel AFTER cleanup: display=' + panel.style.display);
            }
          }
        }
        _logPanelState('raf-after-cleanup');
        _restoreDropdownState();
        _logPanelState('raf-after-restore-final');
        // 1 second later check
        setTimeout(function() {
          console.log('[SPA] === 1s post-navigation check ===');
          _logPanelState('1s-post-nav');
        }, 1000);
        // 3 seconds later check
        setTimeout(function() {
          console.log('[SPA] === 3s post-navigation check ===');
          _logPanelState('3s-post-nav');
        }, 3000);
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
