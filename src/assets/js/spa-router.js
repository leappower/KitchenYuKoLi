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
    global.dispatchEvent(new CustomEvent("spa:load", { detail: { path: global.location.pathname } }));
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
      // Swup not loaded yet — retry on DOMContentLoaded
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSwup);
      }
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
          new global.SwupPreloadPlugin({ preloadHoveredLinks: true, preloadInitialPage: true }),
        ],
        animateHistoryBrowsing: false,
      });
    } catch (e) {
      console.error("[spa-router] Swup init failed:", e);
      global.__spaNavigating = false;
      return;
    }

    global.swupInstance = swup;

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
        if (!args || !args.url) {
          console.log("[spa-router] fetch:request: no args/url, skipping");
          return;
        }
        var url = args.url;
        console.log("[spa-router] fetch:request url:", url);
        // Only rewrite directory URLs like /profit-calculator/ or /about/
        // Do NOT touch: /assets/js/..., /index-pc.html (already device-specific), etc.
        if (!/\/$/.test(url) && !/\/index\.html$/.test(url)) {
          console.log("[spa-router] fetch:request: not a directory URL, skipping");
          return;
        }
        // If already requesting a device-specific file, skip
        if (/index-(mobile|pc|tablet)\.html$/.test(url)) {
          console.log("[spa-router] fetch:request: already device-specific, skipping");
          return;
        }
        // Rewrite: /profit-calculator/ → /profit-calculator/index-pc.html
        //          /about/ → /about/index-pc.html
        var base = url.replace(/\/index\.html$/, "");
        var newUrl = base + suffix;
        console.log("[spa-router] fetch:request rewrite:", url, "→", newUrl, "(device:", suffix, ")");
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
    // executes each <script> synchronously (no defer/async) on appendChild.
    var _dynamicScripts = [];
    var _globalScriptPatterns = /spa-router\.js|swup|translations\.js|lang-registry\.js|spa-events\.js$/;
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
      // 4. Inject missing scripts as synchronous (forces re-execution)
      for (var i = 0; i < allNewScripts.length; i++) {
        var src = allNewScripts[i].getAttribute("src");
        if (!src) continue;
        var srcKey = src.replace(/\?.*$/, "");
        if (_globalScriptPatterns.test(srcKey)) continue;
        if (currentSrcs[srcKey]) continue;
        var newScript = document.createElement("script");
        newScript.src = src;
        document.head.appendChild(newScript);
        _dynamicScripts.push(newScript);
        currentSrcs[srcKey] = true; // prevent duplicate within same navigation
      }
    }

    // Forward Swup lifecycle to spa:load event
    // Swup v4 uses hooks.on() instead of .on()
    var swupHooks = swup.hooks || swup;
    swupHooks.on("content:replace", function (visit) {
      console.log("[spa-router] content:replace fired");
      console.log("[spa-router] content:replace visit.from.url:", visit.from ? visit.from.url : "null");
      console.log("[spa-router] content:replace visit.to.url:", visit.to ? visit.to.url : "null");
      global.__spaNavigating = false;
      _spaState.currentRoute = global.location.pathname.replace(/\/$/, "") || "/";
      console.log("[spa-router] currentRoute:", _spaState.currentRoute);
      // Reload page-specific scripts from the NEW page (not just #spa-content)
      var newDoc = visit && visit.to && visit.to.document ? visit.to.document : null;
      console.log("[spa-router] about to reloadPageScripts, newDoc:", newDoc ? "present" : "null");
      reloadPageScripts(newDoc);
      console.log("[spa-router] reloadPageScripts done");
      // Update navigator active state
      if (global.Navigator && typeof global.Navigator.updateActive === "function") {
        console.log("[spa-router] calling Navigator.updateActive");
        global.Navigator.updateActive(_spaState.currentRoute);
      }
      if (global.Footer && typeof global.Footer.updateActive === "function") {
        console.log("[spa-router] calling Footer.updateActive");
        global.Footer.updateActive(_spaState.currentRoute);
      }
      // Trigger spa:load for other modules
      console.log("[spa-router] dispatching spa:load");
      dispatchSpaLoad();
    });

    swupHooks.on("visit:start", function () {
      global.__spaNavigating = true;
    });

    // ── Graceful degradation ──────────────────────────────────────
    // Do NOT do location.href jumps on abort/error — that breaks user
    // interaction (SwupPreloadPlugin also triggers these for hovered links).
    // Instead, just reset the navigating flag so the page stays usable.
    swupHooks.on("visit:abort", function (visit) {
      global.__spaNavigating = false;
    });

    swupHooks.on("fetch:error", function (visit, args) {
      // Silently reset — Swup will not navigate, page stays intact
      global.__spaNavigating = false;
    });

    // Safety net: if Swup intercepts a click but navigation hangs >3s,
    // allow the next click to bypass Swup entirely.
    var _lastSwupNavStart = 0;
    swupHooks.on("visit:start", function () {
      _lastSwupNavStart = Date.now();
    });
    swupHooks.on("content:replace", function () {
      _lastSwupNavStart = 0;
    });
    swupHooks.on("visit:abort", function () {
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

    // Handle popstate (browser back/forward)// Handle popstate (browser back/forward) — scroll to top
    global.addEventListener("popstate", function () {
      global.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });

    // Initial dispatch
    dispatchSpaLoad();
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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initSwup();
      // Root path redirect: / → /home/
      var path = global.location.pathname;
      if (path === "/" || path === "/index.html") {
        history.replaceState(null, "", "/home/");
      }
      // GitHub Pages 404 SPA redirect
      var redirectParam = new URLSearchParams(global.location.search).get("redirect");
      if (redirectParam) {
        history.replaceState(null, "", redirectParam);
      }
    });
  } else {
    initSwup();
  }
})(window);
