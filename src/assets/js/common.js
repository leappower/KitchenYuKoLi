/**
 * common.js — Common Utility Functions (IIFE build for src/ static HTML)
 * Synced from: src/assets/common.js
 * Global: window.CommonUtils
 *
 * Usage: <script src="../../assets/js/common.js"></script>
 * Then: window.CommonUtils.debounce(fn, 300)
 */
(function (global) {
  "use strict";

  /** Debounce function execution */
  function debounce(func, wait) {
    if (wait === undefined) wait = 300;
    var timeout;
    return function executedFunction() {
      var args = arguments;
      var ctx = this;
      var later = function () {
        clearTimeout(timeout);
        func.apply(ctx, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /** Throttle function execution */
  function throttle(func, limit) {
    if (limit === undefined) limit = 100;
    var inThrottle;
    return function executedFunction() {
      var args = arguments;
      var ctx = this;
      if (!inThrottle) {
        func.apply(ctx, args);
        inThrottle = true;
        setTimeout(function () {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * i18n 翻译辅助函数（权威实现）。
   * 调用 window.t(key) 获取翻译，若未翻译或 t() 不存在则返回 fallback。
   * smart-popup.js 的同名函数可删除，改调 CommonUtils.tr。
   */
  function tr(key, fallback) {
    var value = typeof window.t === "function" ? window.t(key) : key;
    return value && value !== key ? value : fallback;
  }

  /**
   * 安全地在 DOM 就绪后执行 fn。
   * 等同于 if (readyState==='loading') { addEventListener } else { fn() }
   * 统一替代项目中 6 处重复的 DOMContentLoaded 启动模板。
   */
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  /**
   * Auto-append ?from=<current-page-url> to all /contact/ links.
   * So the Contact page can display which page the visitor came from.
   */
  function trackContactLinks() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="/contact/"]');
      if (!a) return;
      var base = a.getAttribute("href").split("?")[0].split("#")[0];
      a.href = base + "?from=" + encodeURIComponent(location.pathname);
    });
  }

  // Auto-init
  ready(trackContactLinks);

  // Expose to global
  window.CommonUtils = {
    debounce: debounce,
    throttle: throttle,
    tr: tr,
    ready: ready,
  };

  // Also keep legacy window.common alias for compatibility
  window.common = window.CommonUtils;
})(window);
