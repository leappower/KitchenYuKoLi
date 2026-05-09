/**
 * currency.js — 多币种工具模块
 *
 * 从 lang-registry 读取当前语言的币种配置，
 * 提供金额格式化和单位切换功能。
 *
 * ⚠ 不做汇率换算：数字始终以 CNY 计算，
 *    只切换显示符号和万位单位名称（万元→K→ล้าน…）。
 *
 * unit 说明（仅用于显示标签）：
 *   CNY: 万元 (10,000 CNY)
 *   USD: K (1,000 USD)
 *   THB: ล้าน (1,000,000 THB)
 *   VND: Triệu (1,000,000 VND)
 *   MYR: Juta (1,000,000 MYR)
 *   IDR: Juta (1,000,000 IDR)
 *   JPY: 万円 (10,000 JPY)
 *   KRW: 백만 (1,000,000 KRW)
 *   INR: Lakh (100,000 INR)
 *   TWD: 萬元 (10,000 TWD)
 *   SAR: K (1,000 SAR)
 */

"use strict";

(function (root) {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  // 万位单位的本地数值（该单位代表多少当地货币）
  var UNIT_VALUES = {
    万元: 10000,
    萬元: 10000,
    K: 1000,
    ล้าน: 1000000,
    Triệu: 1000000,
    Juta: 1000000,
    万円: 10000,
    백만: 1000000,
    Lakh: 100000,
    "": 1,
  };

  // ── 缓存 ──
  var _cachedLang = null;
  var _cachedConfig = null;

  function _getCurrentLang() {
    if (root.translationManager && root.translationManager.currentLanguage) {
      return root.translationManager.currentLanguage;
    }
    if (root.LANGUAGE_CODE) return root.LANGUAGE_CODE;
    return "en";
  }

  /**
   * 获取当前语言的币种配置（带缓存，语言切换时自动失效）
   * @returns {{ symbol: string, code: string, rate: number, unit: string }}
   */
  function getConfig() {
    var lang = _getCurrentLang();
    if (lang === _cachedLang && _cachedConfig) return _cachedConfig;

    var reg = root.LANG_REGISTRY;
    if (!reg || !reg.LANGUAGES) {
      _cachedConfig = { symbol: "$", code: "USD", rate: 0.14, unit: "K" };
      _cachedLang = lang;
      return _cachedConfig;
    }

    var found = null;
    for (var i = 0; i < reg.LANGUAGES.length; i++) {
      if (reg.LANGUAGES[i].code === lang) {
        found = reg.LANGUAGES[i];
        break;
      }
    }

    _cachedConfig = found && found.currency ? found.currency : { symbol: "$", code: "USD", rate: 0.14, unit: "K" };
    _cachedLang = lang;
    return _cachedConfig;
  }

  /** 语言切换时清除缓存 */
  function _invalidateCache() {
    _cachedLang = null;
    _cachedConfig = null;
  }

  /**
   * 将金额转换为万位显示值（不做汇率换算，始终以 CNY 计算）
   * 数字不变，只切换单位名称和符号。
   * @param {number} cnyAmount
   * @returns {{ value: number, display: string, symbol: string, unit: string }}
   */
  function formatCurrencyWan(cnyAmount) {
    var cfg = getConfig();
    // 始终以 CNY 万元为基准，不换算汇率
    var wanValue = cnyAmount / 10000;
    var sym = cfg.label || cfg.symbol;

    var display = wanValue >= 100 ? Math.round(wanValue).toString() : wanValue.toFixed(1).replace(/\.0$/, "");

    return { value: wanValue, display: display, symbol: sym, unit: cfg.unit };
  }

  /**
   * 格式化金额（不做汇率换算，始终以 CNY 计算）
   * @param {number} cnyAmount
   * @returns {{ value: number, display: string, symbol: string }}
   */
  function formatCurrency(cnyAmount) {
    var cfg = getConfig();
    var display;
    if (cnyAmount >= 1000000) display = (cnyAmount / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    else if (cnyAmount >= 10000) display = (cnyAmount / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    else display = Math.round(cnyAmount).toString();
    return { value: cnyAmount, display: display, symbol: cfg.label || cfg.symbol };
  }

  /**
   * 获取输入框的 placeholder 和默认值（不换算汇率）
   * @param {number} cnyDefault
   * @returns {{ placeholder: string, defaultValue: number, label: string }}
   */
  function getInputConfig(cnyDefault) {
    var cfg = getConfig();
    return { placeholder: cnyDefault.toString(), defaultValue: cnyDefault, label: cfg.label || cfg.symbol };
  }

  /** identity — 不做汇率换算 */
  function toCNY(amount) {
    return amount;
  }

  // ── 语言切换时自动刷新币种相关 DOM ──
  function refreshCurrencyUI() {
    _invalidateCache();
    var cfg = getConfig();
    var sym = cfg.label || cfg.symbol; // label 用于区分同符号币种（JP¥ vs ¥）

    // 1) 更新 [data-currency-symbol] 元素（输入框前缀 ¥ → $ 等）
    document.querySelectorAll("[data-currency-symbol]").forEach(function (el) {
      el.textContent = sym;
    });

    // 2) 更新 [data-currency-unit] 元素（万元/年 → K/yr 等）
    document.querySelectorAll("[data-currency-unit]").forEach(function (el) {
      var t = el.textContent.trim();
      // 匹配 "10K RMB/year"、"万元/年"、"K/yr" 等格式
      var m = t.match(
        /^(\d*[\.]?\d*)\s*(万元|萬元|K|M|Lakh|ล้าน|Triệu|Juta|万円|백만)?\s*(RMB|USD|CNY|THB|VND|MYR|IDR|JPY|KRW|INR|TWD|SAR)?\s*\/\s*(year|yr|年)$/i
      );
      if (m) {
        var num = m[1] || "";
        el.textContent = (num ? num + " " : "") + cfg.unit + "/yr";
      } else {
        el.textContent = cfg.unit + "/yr";
      }
    });

    // 2b) 更新 [data-currency-label] 元素，替换括号内的币种文字/符号
    document.querySelectorAll("[data-currency-label]").forEach(function (el) {
      el.textContent = el.textContent
        .replace(
          /[(（]\s*(RMB|USD|CNY|THB|VND|MYR|IDR|JPY|KRW|INR|TWD|SAR|人民币|新台幣|新台币|新加坡元|泰铢|越南盾|令吉|卢比|韩元|日元|沙特里亚尔|[¥$₹฿₫₩₤€£]+)\s*[)）]/g,
          function (match) {
            return match.indexOf("（") === 0 ? "（" + sym + "）" : "(" + sym + ")";
          }
        )
        .replace(/\s+RMB\s*/g, " " + cfg.code + " ")
        .replace(/\s+人民币\s*/g, " " + cfg.code + " ")
        .replace(/\s+新台幣?\s*/g, " " + cfg.code + " ");
    });

    // 3) ROI / deploy 输入框不改动数值 — ROI 是比率，与币种无关
    //    切换语言只更新标签符号，用户可手动调整数值
  }

  // ── 监听语言切换事件 ──
  // languageChanged: 开始切换，用于清除缓存
  // ── 监听 i18n 事件 ──
  // currency.js 是 defer 且排在 translations.js 之后，
  // 加载时 translationManager 已存在，直接注册事件即可
  if (root.addEventListener) {
    _spaOn(
      root,
      "languageChanged",
      function () {
        _invalidateCache();
      },
      "languageChanged:cache"
    );
    if (root.translationManager && root.translationManager.on) {
      // 首次翻译可能已完成，立即补刷新一次
      if (root.translationManager.isInitialized) {
        requestAnimationFrame(function () {
          refreshCurrencyUI();
        });
      }
      root.translationManager.on("translationsApplied", function () {
        // applyTranslations 内部用 requestAnimationFrame 替换 DOM，
        // 等下一帧再刷新币种标签
        requestAnimationFrame(function () {
          refreshCurrencyUI();
        });
      });
    }
  }

  // ── SPA 导航后重新翻译+刷新币种 ──
  _spaOn(
    document,
    "spa:load",
    function () {
      if (root.translationManager && root.translationManager.isInitialized) {
        root.translationManager
          .applyTranslations()
          .then(function () {
            requestAnimationFrame(function () {
              refreshCurrencyUI();
            });
          })
          .catch(function () {
            setTimeout(refreshCurrencyUI, 300);
          });
      } else {
        setTimeout(refreshCurrencyUI, 300);
      }
    },
    "spa:load:currencyRefresh"
  );

  // ── Export ──
  var Currency = {
    getConfig: getConfig,
    formatCurrencyWan: formatCurrencyWan,
    formatCurrency: formatCurrency,
    getInputConfig: getInputConfig,
    toCNY: toCNY,
    refreshCurrencyUI: refreshCurrencyUI,
    UNIT_VALUES: UNIT_VALUES,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Currency;
  }
  root.Currency = Currency;
})(typeof window !== "undefined" ? window : this);
