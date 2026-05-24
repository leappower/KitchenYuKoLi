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
 *
 * Swup handles: link interception, fetch, DOM replacement, head/body scoping.
 * This file provides: Swup initialization, backward-compatible API, and
 * lifecycle events that other modules rely on.
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
    // Destroy any previous Swup instance (e.g., after navigation to 404 page
    // that left Swup in a broken state due to container mismatch)
    if (global.swupInstance) {
      try {
        global.swupInstance.destroy();
      } catch (e) {
        /* ignore */
      }
      global.swupInstance = null;
    }

    if (global.Swup === undefined) {
      // Swup not loaded yet — retry after a short delay.
      // defer scripts may execute in any order; we can't assume Swup is ready.
      setTimeout(initSwup, 10);
      return;
    }

    var swup;
    try {
      swup = new global.Swup({
        containers: ["#spa-content"],
        linkSelector:
          'a[href^="/"]:not([href$=".pdf"]):not([href$=".zip"]):not([href$=".doc"]):not([href*="mailto:"]):not([href*="tel:"]):not([target="_blank"])',
        plugins: [],
        animateHistoryBrowsing: false,
        // Scope head replacement so stylesheets survive
        head: { scope: 'title, meta[name="description"], meta[name="keywords"]' },
      });
    } catch (e) {
      console.error("[spa-router] Swup init failed:", e);
      global.__spaNavigating = false;
      return;
    }

    global.swupInstance = swup;

    // Swup v4 uses hooks.on() instead of .on()
    var swupHooks = swup.hooks || swup;

    // ── Client-side device-aware fetch ─────────────────────────────
    // Static hosts (GitHub Pages, S3, etc.) serve index.html (mobile)
    // for all requests. Swup fetch gets mobile HTML → wrong layout on PC.
    // Fix: intercept Swup's fetch:request and rewrite the URL to point
    // to index-{device}.html based on the current device type.
    (function () {
      var deviceUtils = global.DeviceUtils;
      if (!deviceUtils || !deviceUtils.getDeviceType) return;
      var deviceType = deviceUtils.getDeviceType();
      var suffixMap = { mobile: "index-mobile.html", tablet: "index-tablet.html", pc: "index-pc.html" };
      var suffix = suffixMap[deviceType];
      if (!suffix) return; // safety

      swupHooks.on("fetch:request", function (visit, { args }) {
        if (!args || !args.url) return;
        var url = args.url;
        // Only rewrite directory URLs like /profit-calculator/ or /about/
        // Do NOT touch: /assets/js/..., /index-pc.html (already device-specific), etc.
        if (!/\/$/.test(url) && !/\/index\.html$/.test(url)) return;
        // If already requesting a device-specific file, skip
        if (/index-(mobile|pc|tablet)\.html$/.test(url)) return;
        // Rewrite: /profit-calculator/ → /profit-calculator/index-pc.html
        //          /about/ → /about/index-pc.html
        var base = url.replace(/\/index\.html$/, "");
        var newUrl = base + suffix;
        args.url = newUrl;
      });
    })();

    // Reload ALL page-specific scripts after SPA navigation.
    //
    // Why: Swup v4 only replaces #spa-content. Page scripts live in <head>
    // (defer) and body (after </main>). Neither is re-executed by Swup.
    //
    // Strategy: On every navigation, remove all previously injected scripts,
    // then reload every non-global script the new page needs. The browser
    // execute on the next microtask to avoid blocking navigation paint.
    var _dynamicScripts = [];
    // Include ALL global/shared scripts that persist across SPA navigation.
    // Missing entries cause redundant script injection on every page transition.
    // This list should match all scripts loaded by src/index.html (the SPA shell).
    // 全局脚本正则：优先用 build 时注入的 window._SPA_GLOBAL_PATTERNS，
    // fallback 到硬编码列表（dev 模式或未注入时）。
    // ⚠️  新增全局脚本只需改 scripts/core-scripts.json 的 core[]
    //     build 时自动生成 window._SPA_GLOBAL_PATTERNS 注入到每页。
    var _globalScriptPatterns =
      window._SPA_GLOBAL_PATTERNS ||
      /(?:^|[/])(?:product-data-table|spa-router|swup|translations|lang-registry|translations-dropdown-template|spa-events|dropdown-base|dropdown-styles|navigator|nav-config|footer|slide-menu|products-dropdown|applications-dropdown|support-dropdown|about-dropdown|contact-dropdown|product-list|product-grid|product-detail|case-grid|utils|search-engine|device-utils|hero-video|contacts|page-interactions|common|main|init|image-assets|media-queries|floating-actions|currency|custom-select|breadcrumb|home-core-products|compare|cross-sell|profit-calculator|quote-form|quote-select-i18n|quote-budget-i18n|news-detail|support-contact-channels|support-wechat-modal|smart-popup|helpers|page-effects|form-interactions|router|roi-data|cases-page|html2canvas|jspdf|pi-maps)\.js/;
    function reloadPageScripts(newDoc) {
      if (!newDoc) return;
      // 1. Remove all previously injected script tags
      for (var d = 0; d < _dynamicScripts.length; d++) {
        if (_dynamicScripts[d].parentNode) {
          _dynamicScripts[d].parentNode.removeChild(_dynamicScripts[d]);
        }
      }
      _dynamicScripts = [];
      // 2. Collect all script[src] from the new page (head + body)
      var headScripts = newDoc.head.querySelectorAll("script[src]");
      var bodyScripts = newDoc.body.querySelectorAll("script[src]");
      var allNewScripts = Array.prototype.slice.call(headScripts).concat(Array.prototype.slice.call(bodyScripts));
      // 3. Get current document script srcs for dedup
      var currentScripts = document.querySelectorAll("script[src]");
      var currentSrcs = {};
      for (var c = 0; c < currentScripts.length; c++) {
        var curKey = currentScripts[c].getAttribute("src").replace(/\?.*$/, "");
        currentSrcs[curKey] = true;
      }
      // 4. Collect scripts to inject
      var toInject = [];
      for (var i = 0; i < allNewScripts.length; i++) {
        var src = allNewScripts[i].getAttribute("src");
        if (!src) continue;
        var srcKey = src.replace(/\?.*$/, "");
        if (_globalScriptPatterns.test(srcKey)) continue;
        if (currentSrcs[srcKey]) continue;
        toInject.push(src);
        currentSrcs[srcKey] = true; // prevent duplicate within same navigation
      }
      // 5. Inject scripts asynchronously in batches — defer to idle to
      // let the browser paint the new content first, then load JS.
      function injectBatch(idx) {
        var batchSize = 3;
        var end = Math.min(idx + batchSize, toInject.length);
        for (var j = idx; j < end; j++) {
          var newScript = document.createElement("script");
          newScript.src = toInject[j];
          newScript.async = false; // preserve execution order within batch
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

    // Forward Swup lifecycle to spa:load event
    swupHooks.on("content:replace", function (visit) {
      console.log('[spa:content:replace] Swup content:replace fired');
      // Check if any dropdowns still have is-open after content replace
      var stillOpen = document.querySelectorAll('.prod-dropdown-wrap.is-open,.app-dropdown-wrap.is-open,.sup-dropdown-wrap.is-open,.abt-dropdown-wrap.is-open,.cnt-dropdown-wrap.is-open');
      if (stillOpen.length) {
        console.log('[spa:content:replace] WARNING: ' + stillOpen.length + ' dropdowns still open after replace!');
        for (var si = 0; si < stillOpen.length; si++) {
          stillOpen[si].classList.remove('is-open');
        }
      }
      global.__spaNavigating = false;
      _spaState.currentRoute = global.location.pathname.replace(/\/$/, "") || "/";
      // Fade out skeleton overlay after content is replaced
      var skel = document.getElementById("skeleton-overlay");
      if (skel) {
        skel.setAttribute("hidden", "");
        setTimeout(function () {
          skel.style.display = "none";
        }, 300);
      }
      // Reload page-specific scripts from the NEW page (not just #spa-content)
      var newDoc = visit && visit.to && visit.to.document ? visit.to.document : null;
      reloadPageScripts(newDoc);
      // Do NOT re-mount navigator on SPA navigation.
      // Swup containers=["#spa-content"] only replaces main content;
      // body-level <navigator> survives. Calling mount() destroys
      // existing dropdown event bindings by rebuilding the header DOM
      // from scratch, while initDropdownClick will not rebind
      // triggers because _docClickBound is already true.
      // Instead, only update the active state to reflect new route.
      // Update navigator active state
      if (global.Navigator && typeof global.Navigator.updateActive === "function") {
        // Extract the top-level section from the route (e.g. /cases/manila → "cases")
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
      // Trigger spa:load for other modules
      dispatchSpaLoad();
    });

    // Safety net: if Swup intercepts a click but navigation hangs >3s,
    // allow the next click to bypass Swup entirely.
    var _lastSwupNavStart = 0;
    swupHooks.on("visit:start", function () {
      console.log('[spa:visit:start] Swup visit:start fired, nav=' + _spaState.currentRoute);
      global.__spaNavigating = true;
      _lastSwupNavStart = Date.now();
      // Show skeleton overlay for SPA navigation transitions
      var skel = document.getElementById("skeleton-overlay");
      if (skel) {
        skel.style.display = "";
        skel.removeAttribute("hidden");
      }
      // Close all open dropdowns BEFORE Swup replaces DOM
      try {
        var selectors = [
          ".prod-dropdown-wrap.is-open",
          ".app-dropdown-wrap.is-open",
          ".sup-dropdown-wrap.is-open",
          ".abt-dropdown-wrap.is-open",
          ".cnt-dropdown-wrap.is-open",
        ];
        var totalFound = 0;
        for (var i = 0; i < selectors.length; i++) {
          var els = document.querySelectorAll(selectors[i]);
          totalFound += els.length;
          for (var j = 0; j < els.length; j++) {
            els[j].classList.remove("is-open");
          }
        }
        console.log('[spa:visit:start] removed is-open from ' + totalFound + ' dropdown wraps');
        // Temporarily suppress mouseover re-opening of dropdowns.
        // When user clicks an item, their mouse remains over the dropdown area.
        // After Swup navigation completes, the mouse position may trigger
        // mouseover on the new page, re-opening the dropdown.
        // Block mouseover-based open for 800ms after visit:start.
        global.__dropdownHoverBlocked = true;
        setTimeout(function () {
          global.__dropdownHoverBlocked = false;
        }, 800);
      } catch (e) {}
    });

    // ── Graceful degradation ──────────────────────────────────────
    // Do NOT do location.href jumps on abort/error — that breaks user
    // interaction (SwupPreloadPlugin also triggers these for hovered links).
    // Instead, just reset the navigating flag so the page stays usable.
    swupHooks.on("visit:abort", function () {
      global.__spaNavigating = false;
      _lastSwupNavStart = 0;
    });

    swupHooks.on("fetch:error", function () {
      global.__spaNavigating = false;
      _lastSwupNavStart = 0;
    });

    swupHooks.on("content:replace", function () {
      _lastSwupNavStart = 0;
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

    // Handle popstate (browser back/forward) — scroll to top
    global.addEventListener("popstate", function () {
      global.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });

    // Initial dispatch — REMOVED. product-grid.js renders on DOMContentLoaded directly.
    // This dispatch caused spa:load to fire BEFORE Swup's first content:replace,
    // which resulted in product-grid rendering content that Swup then overwrote.
  }

  // ── Backward-compatible API ────────────────────────────────────────
  var SpaRouter = {
    navigate: function (url) {
      if (!url) return;
      if (global.swupInstance) {
        global.swupInstance.navigate(url);
      } else {
        // Fallback: plain redirect
        global.location.href = url;
      }
    },
    getCurrentPath: function () {
      return _spaState.currentRoute || global.location.pathname.replace(/\/$/, "") || "/";
    },
    _pendingScroll: null,
  };

  global.SpaRouter = SpaRouter;

  // ── Auto-init ──────────────────────────────────────────────────────
  // Always use DOMContentLoaded or immediate-ready to kick off initSwup.
  // initSwup will self-retry if Swup is not yet loaded (defer order may vary).
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
