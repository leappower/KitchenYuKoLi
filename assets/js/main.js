/* ─── Production-safe console shim ───────────────────────────────────
 * In production, suppress console.warn noise from i18n, SPA router, etc.
 * Enable debug: localStorage.setItem('debug', '1')  */
(function () {
  if (!/debug=1/.test(location.search) && !localStorage.getItem("debug")) {
    var origWarn = console.warn;
    var _origLog = console.log;
    console.warn = function () {
      // Keep errors visible, suppress routine warnings
      var msg = Array.prototype.join.call(arguments, " ");
      if (/error|fail|crash/i.test(msg)) origWarn.apply(console, arguments);
    };
    console.log = function () {};
  }
})();
// main.js - Core functionality with modular architecture
// IIFE wrapper for src2 (no build tools)
// Outputs: window.app (App instance)

(function (_global) {
  "use strict";

  // ─── Async manifest loader (no XHR sync blocking) ───────────────────
  // Shared single fetch — both main.js and product-grid.js use this.
  // The callback fires once when manifest arrives (or immediately if cached).
  var _manifest = null;
  var _manifestLoaded = false;
  var _manifestPromise = null;

  function loadManifest() {
    if (_manifestLoaded) return;
    if (_manifestPromise) return;
    _manifestPromise = fetch("/assets/js/_srcset-manifest.json")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        _manifest = data;
        window.__SRCSET_MANIFEST__ = data;
        _manifestLoaded = true;
        // Re-inject for any imgs that were waiting (first-paint race)
        if (window.app && window.app.modules && window.app.modules.get("lazyLoading")) {
          window.app.modules.get("lazyLoading").reInjectSrcset();
        }
      })
      .catch(function () {
        _manifestLoaded = true;
      });
  }

  window.SrcsetManifest = {
    load: loadManifest,
    get: function () {
      return _manifest;
    },
  };

  // ─── App class ─────────────────────────────────────────────────────────────
  function App() {
    this.modules = new Map();
    this.initialized = false;
  }

  App.prototype.registerModule = function (name, module) {
    this.modules.set(name, module);
  };

  App.prototype.initialize = function () {
    var self = this;
    if (self.initialized) return Promise.resolve();

    var hasErrors = false;
    var chain = Promise.resolve();

    self.modules.forEach(function (module) {
      chain = chain.then(function () {
        if (typeof module.init === "function") {
          return Promise.resolve(module.init()).catch(function (moduleError) {
            console.error("Failed to initialize module:", moduleError);
            hasErrors = true;
          });
        }
      });
    });

    return chain
      .then(function () {
        if (!hasErrors) {
          var main = document.querySelector("main");
          if (main) main.classList.add("loaded");
          self.initialized = true;
        }
      })
      .catch(function (error) {
        console.error("Failed to initialize app:", error);
      });
  };

  // ─── Lazy Loading Module ────────────────────────────────────────────────────
  function LazyLoadingModule() {
    this._imageObserver = null;
    this._mutationObserver = null;
  }

  // Device → preferred srcset widths
  var SRCSET_DEV_MAP = { mobile: [375, 828], tablet: [828, 1200], pc: [1200, 1920] };
  // Device → default sizes attribute
  var SIZES_MAP = {
    pc: "(max-width: 1024px) 50vw, 25vw",
    tablet: "(max-width: 768px) 50vw, 33vw",
  };

  /**
   * Inject srcset for a single <img> (only if it has no srcset yet).
   * If manifest not loaded yet → skip silently (reInjectSrcset will retry).
   */
  LazyLoadingModule.prototype._injectSrcset = function (img) {
    if (!img) return;
    if (img.getAttribute("srcset")) {
      // Already has srcset — only fill in sizes if missing
      if (!img.getAttribute("sizes")) {
        var dev = (window.DeviceUtils && window.DeviceUtils.getDeviceType()) || "pc";
        img.setAttribute("sizes", SIZES_MAP[dev] || "calc(100vw - 32px)");
      }
      return;
    }
    if (img.hasAttribute("data-no-srcset")) return;
    var src = img.getAttribute("src") || img.dataset.src || "";
    if (!src) return;
    if (!/\.(webp|png|jpg|jpeg|avif)$/i.test(src)) return;
    if (/-(\d+)w\./.test(src) || src.indexOf("data:") === 0) return;

    var base = src.replace(/\.(webp|png|jpg|jpeg|avif)$/i, "");
    var ext = src.match(/\.(webp|png|jpg|jpeg|avif)$/i)[0];
    var dev = (window.DeviceUtils && window.DeviceUtils.getDeviceType()) || "pc";

    // Manifest-driven: only inject widths that actually exist on disk
    var manifest = window.__SRCSET_MANIFEST__ || _manifest;
    if (!manifest || !manifest[src]) return; // not loaded yet or image not in manifest

    var available = manifest[src];
    var preferred = SRCSET_DEV_MAP[dev] || [1200, 1920];
    var widths = preferred.filter(function (w) {
      return available.indexOf(w) !== -1;
    });
    if (widths.length === 0) widths = available.slice(-2);
    if (widths.length === 0) return;

    var srcset = widths
      .map(function (w) {
        return base + "-" + w + "w" + ext + " " + w + "w";
      })
      .join(", ");
    img.setAttribute("srcset", srcset);
    if (!img.getAttribute("sizes")) {
      img.setAttribute("sizes", SIZES_MAP[dev] || "calc(100vw - 32px)");
    }
  };

  /**
   * Active srcset injection — call after DOM changes (SPA navigate, dynamic render).
   * Replaces the expensive MutationObserver on documentElement.
   * @param {Element} [root=document] — scope to scan; defaults to entire document
   */
  LazyLoadingModule.prototype.reInjectSrcset = function (root) {
    var self = this;
    root = root || document;
    var imgs = root.querySelectorAll ? root.querySelectorAll("img") : [];
    if (root.nodeType === Node.ELEMENT_NODE && root.tagName === "IMG") {
      imgs = [root].concat(Array.prototype.slice.call(imgs));
    }
    for (var i = 0; i < imgs.length; i++) {
      self._injectSrcset(imgs[i]);
    }
  };

  LazyLoadingModule.prototype.init = function () {
    var self = this;

    // Kick off async manifest load, then inject srcset for existing images
    loadManifest();
    self.reInjectSrcset();

    self._imageObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            self.loadImage(entry.target);
            self._imageObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "100px", threshold: 0 }
    );

    self._observeImages(document);

    // MutationObserver only for lazy-loaded images (data-src), NOT for srcset
    self._mutationObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === Node.ELEMENT_NODE) self._observeImages(node);
        });
      });
    });

    var productGrid = document.getElementById("product-grid");
    if (productGrid) {
      self._mutationObserver.observe(productGrid, { childList: true, subtree: true });
    } else {
      var productsSection = document.getElementById("products");
      if (productsSection) {
        self._mutationObserver.observe(productsSection, { childList: true, subtree: true });
      }
    }
  };

  LazyLoadingModule.prototype._observeImages = function (root) {
    var self = this;
    var imgs =
      root instanceof Element && root.matches("img[data-src]")
        ? [root]
        : Array.from(root.querySelectorAll ? root.querySelectorAll("img[data-src]") : []);
    imgs.forEach(function (img) {
      if (!img.dataset.lazyObserved) {
        img.dataset.lazyObserved = "1";
        self._imageObserver.observe(img);
      }
    });
  };

  LazyLoadingModule.prototype.loadImage = function (img) {
    var src = img.dataset.src;
    if (!src) return;

    var picture = img.closest("picture");
    if (picture) {
      var source = picture.querySelector('source[type="image/webp"]');
      if (source && source.dataset && source.dataset.srcset) source.srcset = source.dataset.srcset;
    }

    img.src = src;
    img.classList.remove("lazy-loading", "lazy-img");
    img.classList.add("loaded");

    img.addEventListener(
      "load",
      function () {
        img.classList.add("fade-in");
      },
      { once: true }
    );
    img.addEventListener(
      "error",
      function () {
        console.warn("[LazyLoad] Failed to load image: " + src);
        if (src.endsWith(".webp")) {
          img.src = src.replace(/\.webp$/i, ".png");
        } else {
          var noImgText = typeof window.t === "function" ? window.uiText("main_no_image", "No Image") : "No Image";
          img.src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='14'%3E" +
            encodeURIComponent(noImgText) +
            "%3C/text%3E%3C/svg%3E";
        }
      },
      { once: true }
    );
  };

  // ─── Error Handling Module ──────────────────────────────────────────────────
  function ErrorHandlingModule() {}

  ErrorHandlingModule.prototype.init = function () {
    this.setupErrorHandling();
  };

  ErrorHandlingModule.prototype.setupErrorHandling = function () {
    var self = this;
    window.addEventListener("error", function (e) {
      console.error("JavaScript error:", e.error);
      self.reportError(e.error);
    });
    window.addEventListener("unhandledrejection", function (e) {
      console.error("Unhandled promise rejection:", e.reason);
      self.reportError(e.reason);
    });
    window.addEventListener("offline", function () {
      self.showNetworkStatus("You are currently offline", "warning");
    });
    window.addEventListener("online", function () {
      self.showNetworkStatus("You are back online", "success");
    });
  };

  ErrorHandlingModule.prototype.reportError = function (error) {
    if (window.gtag) {
      window.gtag("event", "exception", {
        description: error && error.message ? error.message : String(error),
        fatal: false,
      });
    }
  };

  ErrorHandlingModule.prototype.showNetworkStatus = function (message, type) {
    // 优先使用统一的 Toast 系统（page-interactions.js 注册后生效），
    // 降级使用 contacts.js 的 showNotification，最终 fallback 到 console.warn。
    var notifyType = type === "warning" ? "error" : "success";
    if (typeof window.showNotification === "function") {
      window.showNotification(message, notifyType);
    } else {
      console.warn("[NetworkStatus]", type, message);
    }
  };

  // ─── Bootstrap ──────────────────────────────────────────────────────────────
  var app = new App();
  // FormValidationModule removed: form validation handled by page-interactions.js bindForms()
  app.registerModule("lazyLoading", new LazyLoadingModule());
  app.registerModule("errorHandling", new ErrorHandlingModule());

  if (window.CommonUtils && typeof window.CommonUtils.ready === "function") {
    window.CommonUtils.ready(function () {
      app.initialize();
    });
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      app.initialize();
    });
  } else {
    app.initialize();
  }

  window.app = app;
})(window);
