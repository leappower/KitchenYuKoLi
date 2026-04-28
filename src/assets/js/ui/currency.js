/**
 * currency.js — 多币种工具模块
 *
 * 从 lang-registry 读取当前语言的币种配置，
 * 提供金额格式化和单位切换功能。
 *
 * 汇率基准：1 CNY = rate * local currency
 * 内部计算始终使用人民币（CNY），只在展示时换算。
 *
 * unit 说明：
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
 *   SAR: (无万位单位，直接显示)
 */

'use strict';

(function (root) {
  'use strict';

  // 万位单位的本地数值（该单位代表多少当地货币）
  var UNIT_VALUES = {
    '万元': 10000, '萬元': 10000,
    'K': 1000,
    'ล้าน': 1000000,
    'Triệu': 1000000,
    'Juta': 1000000,
    '万円': 10000,
    '백만': 1000000,
    'Lakh': 100000,
    '': 1
  };

  // ── 缓存 ──
  var _cachedLang = null;
  var _cachedConfig = null;

  function _getCurrentLang() {
    if (root.translationManager && root.translationManager.currentLanguage) {
      return root.translationManager.currentLanguage;
    }
    if (root.LANGUAGE_CODE) return root.LANGUAGE_CODE;
    return 'en';
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
      _cachedConfig = { symbol: '$', code: 'USD', rate: 0.14, unit: 'K' };
      _cachedLang = lang;
      return _cachedConfig;
    }

    var found = null;
    for (var i = 0; i < reg.LANGUAGES.length; i++) {
      if (reg.LANGUAGES[i].code === lang) { found = reg.LANGUAGES[i]; break; }
    }

    _cachedConfig = (found && found.currency)
      ? found.currency
      : { symbol: '$', code: 'USD', rate: 0.14, unit: 'K' };
    _cachedLang = lang;
    return _cachedConfig;
  }

  /** 语言切换时清除缓存 */
  function _invalidateCache() {
    _cachedLang = null;
    _cachedConfig = null;
  }

  /**
   * 将人民币金额转换为当前币种的万位显示值
   * @param {number} cnyAmount
   * @returns {{ value: number, display: string, symbol: string, unit: string }}
   */
  function formatCurrencyWan(cnyAmount) {
    var cfg = getConfig();
    var localAmount = cnyAmount * cfg.rate;
    var unitValue = UNIT_VALUES[cfg.unit] || 1;
    var wanValue = localAmount / unitValue;

    var display = wanValue >= 100
      ? Math.round(wanValue).toString()
      : wanValue.toFixed(1).replace(/\.0$/, '');

    return { value: wanValue, display: display, symbol: cfg.symbol, unit: cfg.unit };
  }

  /**
   * 格式化每月金额（非万位）
   * @param {number} cnyAmount
   * @returns {{ value: number, display: string, symbol: string }}
   */
  function formatCurrency(cnyAmount) {
    var cfg = getConfig();
    var localAmount = cnyAmount * cfg.rate;
    var display;
    if (localAmount >= 1000000) display = (localAmount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    else if (localAmount >= 10000) display = (localAmount / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    else display = Math.round(localAmount).toString();
    return { value: localAmount, display: display, symbol: cfg.symbol };
  }

  /**
   * 获取输入框的 placeholder 和默认值（按币种调整）
   * @param {number} cnyDefault
   * @returns {{ placeholder: string, defaultValue: number, label: string }}
   */
  function getInputConfig(cnyDefault) {
    var cfg = getConfig();
    var localDefault = Math.round(cnyDefault * cfg.rate);
    return { placeholder: localDefault.toString(), defaultValue: localDefault, label: cfg.symbol };
  }

  /** 将当地币种金额转换回人民币 */
  function toCNY(localAmount) {
    var cfg = getConfig();
    return localAmount / cfg.rate;
  }

  // ── 语言切换时自动刷新币种相关 DOM ──
  function refreshCurrencyUI() {
    _invalidateCache();
    var cfg = getConfig();

    // 1) 更新 [data-currency-symbol] 元素（输入框前缀 ¥ → $ 等）
    document.querySelectorAll('[data-currency-symbol]').forEach(function(el) {
      el.textContent = cfg.symbol;
    });

    // 2) 更新 [data-currency-unit] 元素（万元/年 → K/yr 等）
    var periodMap = { '万元/年': cfg.unit + '/yr', '萬元/年': cfg.unit + '/yr', 'K/yr': cfg.unit + '/yr' };
    document.querySelectorAll('[data-currency-unit]').forEach(function(el) {
      var t = el.textContent.trim();
      el.textContent = periodMap[t] || cfg.unit + '/yr';
    });

    // 2b) 更新 [data-currency-label] 元素，替换 (¥) / (RMB) / ($)
    document.querySelectorAll('[data-currency-label]').forEach(function(el) {
      el.textContent = el.textContent.replace(/[\(（][¥$₹฿₫₩₤€£RpRMNT$ر.سRMBUSD]+[\)）]/, '(' + cfg.symbol + ')');
    });

    // 3) 更新 ROI 输入框默认值（按汇率换算）
    var salaryInput = document.getElementById('roi-salary');
    if (salaryInput) {
      var baseSalary = 5000; // 基准 5000 CNY/月
      salaryInput.value = Math.round(baseSalary * cfg.rate);
    }
    var energyInput = document.getElementById('roi-energy');
    if (energyInput) {
      var baseEnergy = 3000; // 基准 3000 CNY/月
      energyInput.value = Math.round(baseEnergy * cfg.rate);
    }

    // 4) 更新 deploy-roi 输入框默认值
    var priceInput = document.getElementById('roi-price');
    if (priceInput && !priceInput._userEdited) {
      priceInput.value = Math.round(25 * cfg.rate);
    }
    var laborInput = document.getElementById('roi-labor');
    if (laborInput && !laborInput._userEdited) {
      laborInput.value = Math.round(60000 * cfg.rate);
    }

    // 5) 标记输入框为用户编辑过（避免语言切换覆盖用户输入）
    ['roi-price', 'roi-labor'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el._userEdited = false;
        el.addEventListener('input', function() { this._userEdited = true; }, { once: true });
      }
    });
  }

  // ── 监听语言切换事件 ──
  if (root.addEventListener) {
    root.addEventListener('languageChanged', refreshCurrencyUI);
  }

  // ── DOM Ready 时也执行一次 ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // 延迟执行，确保 translationManager 已初始化
      setTimeout(refreshCurrencyUI, 100);
    });
  } else {
    setTimeout(refreshCurrencyUI, 100);
  }

  // ── Export ──
  var Currency = {
    getConfig: getConfig,
    formatCurrencyWan: formatCurrencyWan,
    formatCurrency: formatCurrency,
    getInputConfig: getInputConfig,
    toCNY: toCNY,
    refreshCurrencyUI: refreshCurrencyUI,
    UNIT_VALUES: UNIT_VALUES
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Currency;
  }
  root.Currency = Currency;
})(typeof window !== 'undefined' ? window : this);
