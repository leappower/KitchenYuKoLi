// main.js - Core functionality with modular architecture
// IIFE wrapper for src2 (no build tools)
// Outputs: window.app (App instance)

(function (global) {
  "use strict";

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

  LazyLoadingModule.prototype.init = function () {
    var self = this;
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
          img.src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='14'%3E暂无图片%3C/text%3E%3C/svg%3E";
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
    global.addEventListener("error", function (e) {
      console.error("JavaScript error:", e.error);
      self.reportError(e.error);
    });
    global.addEventListener("unhandledrejection", function (e) {
      console.error("Unhandled promise rejection:", e.reason);
      self.reportError(e.reason);
    });
    global.addEventListener("offline", function () {
      self.showNetworkStatus("You are currently offline", "warning");
    });
    global.addEventListener("online", function () {
      self.showNetworkStatus("You are back online", "success");
    });
  };

  ErrorHandlingModule.prototype.reportError = function (error) {
    if (global.gtag) {
      global.gtag("event", "exception", {
        description: error && error.message ? error.message : String(error),
        fatal: false,
      });
    }
  };

  ErrorHandlingModule.prototype.showNetworkStatus = function (message, type) {
    // 优先使用统一的 Toast 系统（page-interactions.js 注册后生效），
    // 降级使用 contacts.js 的 showNotification，最终 fallback 到 console.warn。
    var notifyType = type === "warning" ? "error" : "success";
    if (typeof global.showNotification === "function") {
      global.showNotification(message, notifyType);
    } else {
      console.warn("[NetworkStatus]", type, message);
    }
  };

  // ─── Bootstrap ──────────────────────────────────────────────────────────────
  var app = new App();
  // FormValidationModule removed: form validation handled by page-interactions.js bindForms()
  app.registerModule("lazyLoading", new LazyLoadingModule());
  app.registerModule("errorHandling", new ErrorHandlingModule());

  if (global.CommonUtils && typeof global.CommonUtils.ready === "function") {
    global.CommonUtils.ready(function () {
      app.initialize();
    });
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      app.initialize();
    });
  } else {
    app.initialize();
  }

  global.app = app;
})(window);
