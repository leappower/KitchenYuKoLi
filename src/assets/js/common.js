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

  /** Escape HTML special characters */
  function escapeHtml(unsafe) {
    if (typeof unsafe !== "string") return unsafe;
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /** Validate email address */
  function isValidEmail(email) {
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /** Validate phone number */
  function isValidPhone(phone) {
    var re = /^\+?[0-9]{1,4}[-\s]?[0-9]{1,4}[-\s]?[0-9]{3,9}([-\s]?[0-9]+)*$/;
    return re.test(phone);
  }

  /** Format currency */
  function formatCurrency(amount, currency) {
    if (currency === undefined) currency = "CNY";
    var localeMap = { USD: "en-US", CNY: "zh-CN", EUR: "en-US", GBP: "en-GB", JPY: "ja-JP" };
    var locale = localeMap[currency] || "en-US";
    return new Intl.NumberFormat(locale, { style: "currency", currency: currency }).format(amount);
  }

  /** Format date */
  function formatDate(date, locale) {
    if (locale === undefined) locale = "zh-CN";
    var options = { year: "numeric", month: "long", day: "numeric" };
    if (locale === "en-US") {
      return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "numeric", day: "numeric" }).format(
        new Date(date)
      );
    }
    return new Intl.DateTimeFormat(locale, options).format(new Date(date));
  }

  /** Format number with thousand separator */
  function formatNumber(num, locale) {
    if (locale === undefined) locale = "zh-CN";
    return new Intl.NumberFormat(locale).format(num);
  }

  /** Deep clone object */
  function deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array)
      return obj.map(function (item) {
        return deepClone(item);
      });
    if (obj instanceof Object) {
      var clonedObj = {};
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          clonedObj[key] = deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  /** Check if object is empty */
  function isEmpty(obj) {
    if (obj === null || obj === undefined) return true;
    if (Array.isArray(obj) || typeof obj === "string") return obj.length === 0;
    if (typeof obj === "object") return Object.keys(obj).length === 0;
    return false;
  }

  /** Get value from object by path */
  function get(obj, path, defaultValue) {
    var keys = path.split(".");
    var result = obj;
    for (var i = 0; i < keys.length; i++) {
      if (result === null || result === undefined) return defaultValue;
      result = result[keys[i]];
    }
    return result !== undefined ? result : defaultValue;
  }

  /** Set value in object by path */
  function set(obj, path, value) {
    var keys = path.split(".");
    var current = obj;
    for (var i = 0; i < keys.length - 1; i++) {
      var key = keys[i];
      if (!(key in current)) current[key] = {};
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return obj;
  }

  /** Sleep function */
  function sleep(ms) {
    return new Promise(function (resolve) {
      return setTimeout(resolve, ms);
    });
  }

  /**
   * 给任意 Promise 包裹超时。
   * 若 promise 在 ms 毫秒内未 settle，则以 Error 拒绝。
   *
   * @param {Promise} promise
   * @param {number}  ms        - 超时毫秒数（默认 10000）
   * @param {string}  [message] - 自定义拒绝消息
   * @returns {Promise}
   */
  function withTimeout(promise, ms, message) {
    ms = ms !== undefined ? ms : 10000;
    message = message || "Operation timed out after " + ms + "ms";
    var timer;
    var timeoutPromise = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        reject(new Error(message));
      }, ms);
    });
    return Promise.race([promise, timeoutPromise]).then(
      function (value) {
        clearTimeout(timer);
        return value;
      },
      function (error) {
        clearTimeout(timer);
        throw error;
      }
    );
  }

  /**
   * 带 AbortController 超时的 fetch。
   * 超时时主动取消请求，节省带宽。
   *
   * @param {string}  url
   * @param {object}  [options]    - fetch 选项（signal 会被覆盖）
   * @param {number}  [timeoutMs]  - 超时毫秒数（默认 10000）
   * @returns {Promise<Response>}
   */
  function fetchWithTimeout(url, options, timeoutMs) {
    timeoutMs = timeoutMs !== undefined ? timeoutMs : 10000;
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () {
          controller.abort();
        }, timeoutMs)
      : null;
    var fetchOptions = Object.assign({}, options || {});
    if (controller) fetchOptions.signal = controller.signal;

    return fetch(url, fetchOptions)
      .then(function (response) {
        if (timer) clearTimeout(timer);
        return response;
      })
      .catch(function (error) {
        if (timer) clearTimeout(timer);
        if (error.name === "AbortError") {
          throw new Error("Request timed out after " + timeoutMs + "ms: " + url);
        }
        throw error;
      });
  }

  /** Retry function with exponential backoff */
  function retry(fn, options) {
    if (options === undefined) options = {};
    var maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
    var delay = options.delay !== undefined ? options.delay : 1000;
    var backoff = options.backoff !== undefined ? options.backoff : 2;
    var onRetry = options.onRetry || function () {};
    var lastError;
    var attempt = function (i) {
      return fn().catch(function (error) {
        lastError = error;
        onRetry(i + 1, error);
        if (i < maxRetries - 1) {
          return sleep(delay * Math.pow(backoff, i)).then(function () {
            return attempt(i + 1);
          });
        }
        throw lastError;
      });
    };
    return attempt(0);
  }

  /** Parse query string */
  function parseQueryString(url) {
    if (url === undefined) url = global.location.href;
    var queryString = url.split("?")[1];
    if (!queryString) return {};
    var params = {};
    var pairs = queryString.split("&");
    for (var i = 0; i < pairs.length; i++) {
      var parts = pairs[i].split("=");
      var decodedKey = decodeURIComponent(parts[0]);
      var decodedValue = parts[1] ? decodeURIComponent(parts[1]) : "";
      params[decodedKey] = decodedValue;
    }
    return params;
  }

  /** Build query string */
  function buildQueryString(params) {
    var pairs = [];
    var entries = Object.entries(params);
    for (var i = 0; i < entries.length; i++) {
      var key = entries[i][0];
      var value = entries[i][1];
      pairs.push(encodeURIComponent(key) + "=" + (value ? encodeURIComponent(value) : ""));
    }
    return pairs.length > 0 ? "?" + pairs.join("&") : "";
  }

  /** Check if element is in viewport */
  function isInViewport(element) {
    var rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (global.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (global.innerWidth || document.documentElement.clientWidth)
    );
  }

  /** Check if element is partially in viewport */
  function isPartiallyInViewport(element) {
    var rect = element.getBoundingClientRect();
    return (
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < (global.innerHeight || document.documentElement.clientHeight) &&
      rect.left < (global.innerWidth || document.documentElement.clientWidth)
    );
  }

  /** Get scroll percentage */
  function getScrollPercentage() {
    var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    var scrollTop = global.pageYOffset || document.documentElement.scrollTop;
    return docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  }

  /** Smooth scroll to element */
  function scrollToElement(element, offset) {
    if (offset === undefined) offset = 0;
    var top = element.getBoundingClientRect().top + global.pageYOffset - offset;
    global.scrollTo({ top: top, behavior: "smooth" });
  }

  /** Copy text to clipboard */
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard
        .writeText(text)
        .then(function () {
          return true;
        })
        .catch(function () {
          return _fallbackCopy(text);
        });
    }
    return Promise.resolve(_fallbackCopy(text));
  }
  function _fallbackCopy(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      if (textArea.parentNode) document.body.removeChild(textArea);
      return true;
    } catch (e) {
      if (textArea.parentNode) document.body.removeChild(textArea);
      return false;
    }
  }

  /** Download file */
  function downloadFile(content, filename, type) {
    if (type === undefined) type = "text/plain";
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    if (link.parentNode) document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /** Generate unique ID */
  function generateId(prefix) {
    if (prefix === undefined) prefix = "";
    return "" + prefix + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
  }

  /** LocalStorage helpers */
  function getLocalStorageItem(key, parseJson) {
    try {
      var item = localStorage.getItem(key);
      if (item === null) return null;
      if (parseJson) {
        try {
          return JSON.parse(item);
        } catch (e) {
          return item;
        }
      }
      return item;
    } catch (e) {
      return null;
    }
  }

  function setLocalStorageItem(key, value, stringify) {
    try {
      var item = stringify || typeof value === "object" ? JSON.stringify(value) : value;
      localStorage.setItem(key, item);
      return true;
    } catch (e) {
      return false;
    }
  }

  var storage = {
    get: function (key, defaultValue) {
      if (defaultValue === undefined) defaultValue = null;
      try {
        var item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        try {
          return JSON.parse(item);
        } catch (e) {
          return item;
        }
      } catch (e) {
        return defaultValue;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, typeof value === "object" ? JSON.stringify(value) : value);
        return true;
      } catch (e) {
        return false;
      }
    },
    remove: function (key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    },
    clear: function () {
      try {
        localStorage.clear();
        return true;
      } catch (e) {
        return false;
      }
    },
  };

  /** Device helpers */
  function isMobile() {
    return global.innerWidth < 768;
  }
  function isTablet() {
    return global.innerWidth >= 768 && global.innerWidth < 1024;
  }
  function isDesktop() {
    return global.innerWidth >= 1024;
  }
  function getDeviceType() {
    if (isMobile()) return "mobile";
    if (isTablet()) return "tablet";
    return "desktop";
  }

  /** Detect browser */
  function detectBrowser() {
    var ua = navigator.userAgent;
    if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Edg")) return "Edge";
    if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
    return "Unknown";
  }

  /** Detect OS */
  function detectOS() {
    var ua = navigator.userAgent;
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac OS")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iOS")) return "iOS";
    return "Unknown";
  }

  /** Get browser language */
  function getBrowserLanguage() {
    return navigator.language || navigator.userLanguage || "zh-CN";
  }

  /** Array utilities */
  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function mergeUniqueArrays() {
    var merged = [],
      seen = new Set();
    for (var i = 0; i < arguments.length; i++) {
      var arr = arguments[i];
      for (var j = 0; j < arr.length; j++) {
        if (!seen.has(arr[j])) {
          seen.add(arr[j]);
          merged.push(arr[j]);
        }
      }
    }
    return merged;
  }

  function removeDuplicates(array) {
    return Array.from(new Set(array));
  }

  function groupBy(array, key) {
    return array.reduce(function (result, item) {
      (result[item[key]] = result[item[key]] || []).push(item);
      return result;
    }, {});
  }

  function sortBy(array, key, order) {
    if (order === undefined) order = "asc";
    return array.slice().sort(function (a, b) {
      return order === "asc" ? (a[key] > b[key] ? 1 : -1) : a[key] < b[key] ? 1 : -1;
    });
  }

  /**
   * i18n 翻译辅助函数（权威实现）。
   * 调用 window.t(key) 获取翻译，若未翻译或 t() 不存在则返回 fallback。
   * products.js 和 smart-popup.js 的同名函数可删除，改调 CommonUtils.tr。
   */
  function tr(key, fallback) {
    var value = typeof global.t === "function" ? global.t(key) : key;
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

  // Expose to global
  global.CommonUtils = {
    debounce: debounce,
    throttle: throttle,
    escapeHtml: escapeHtml,
    isValidEmail: isValidEmail,
    isValidPhone: isValidPhone,
    formatCurrency: formatCurrency,
    formatDate: formatDate,
    formatNumber: formatNumber,
    deepClone: deepClone,
    isEmpty: isEmpty,
    get: get,
    set: set,
    sleep: sleep,
    retry: retry,
    parseQueryString: parseQueryString,
    buildQueryString: buildQueryString,
    isInViewport: isInViewport,
    isPartiallyInViewport: isPartiallyInViewport,
    getScrollPercentage: getScrollPercentage,
    scrollToElement: scrollToElement,
    copyToClipboard: copyToClipboard,
    downloadFile: downloadFile,
    generateId: generateId,
    getLocalStorageItem: getLocalStorageItem,
    setLocalStorageItem: setLocalStorageItem,
    storage: storage,
    isMobile: isMobile,
    isTablet: isTablet,
    isDesktop: isDesktop,
    getDeviceType: getDeviceType,
    detectBrowser: detectBrowser,
    detectOS: detectOS,
    getBrowserLanguage: getBrowserLanguage,
    arraysEqual: arraysEqual,
    mergeUniqueArrays: mergeUniqueArrays,
    removeDuplicates: removeDuplicates,
    groupBy: groupBy,
    sortBy: sortBy,
    withTimeout: withTimeout,
    fetchWithTimeout: fetchWithTimeout,
    tr: tr,
    ready: ready,
  };

  // Also keep legacy window.common alias for compatibility
  global.common = global.CommonUtils;
})(window);
