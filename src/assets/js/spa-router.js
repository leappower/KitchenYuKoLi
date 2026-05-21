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
    if (global.Swup === undefined) {
      // Swup not loaded yet — retry on DOMContentLoaded
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSwup);
      }
      return;
    }

    var swup = new global.Swup({
      containers: ["#spa-content"],
      linkSelector:
        'a[href^="/"]:not([href$=".pdf"]):not([href$=".zip"]):not([href$=".doc"]):not([href*="mailto:"]):not([href*="tel:"]):not([target="_blank"])',
      plugins: [
        new global.SwupHeadPlugin(),
        new global.SwupPreloadPlugin({ preloadHoveredLinks: true, preloadInitialPage: true }),
      ],
      animateHistoryBrowsing: false,
    });

    global.swupInstance = swup;

    // Reload page-specific <script src="..."> found in the new content.
    // Swup does NOT execute <script> tags inside replaced containers,
    // so we need to load them dynamically into <head>.
    var _loadedPageScripts = {};
    function reloadPageScripts() {
      var spaContent = document.getElementById("spa-content");
      if (!spaContent) return;
      var scripts = spaContent.querySelectorAll("script[src]");
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].getAttribute("src");
        if (!src) continue;
        // Normalize: strip query string for dedup
        var srcKey = src.replace(/\?.*$/, "");
        // Skip scripts that should run once (swup, spa-router, translations)
        if (/spa-router\.js|swup|translations\.js$/.test(srcKey)) continue;
        // Dedup: skip if already loaded in a prior navigation
        if (_loadedPageScripts[srcKey]) continue;
        _loadedPageScripts[srcKey] = true;
        var newScript = document.createElement("script");
        newScript.src = src;
        document.head.appendChild(newScript);
      }
    }

    // Forward Swup lifecycle to spa:load event
    swup.on("contentReplaced", function () {
      global.__spaNavigating = false;
      _spaState.currentRoute = global.location.pathname.replace(/\/$/, "") || "/";
      // Reload page-specific scripts from the new content
      reloadPageScripts();
      // Update navigator active state
      if (global.Navigator && typeof global.Navigator.updateActive === "function") {
        global.Navigator.updateActive(_spaState.currentRoute);
      }
      if (global.Footer && typeof global.Footer.updateActive === "function") {
        global.Footer.updateActive(_spaState.currentRoute);
      }
      // Trigger spa:load for other modules
      dispatchSpaLoad();
    });

    swup.on("willReplaceContent", function () {
      global.__spaNavigating = true;
    });

    // Handle popstate (browser back/forward) — scroll to top
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
