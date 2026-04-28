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
    '': 1  // 无万位单位，直接展示
  };

  /**
   * 获取当前语言的币种配置
   * @returns {{ symbol: string, code: string, rate: number, unit: string }}
   */
  function getConfig() {
    var reg = root.LANG_REGISTRY;
    if (!reg || !reg.LANGUAGES) {
      return { symbol: '¥', code: 'CNY', rate: 1, unit: '万元' };
    }

    // 获取当前语言代码
    var currentLang = 'zh-CN';
    if (root.translationManager && root.translationManager.currentLang) {
      currentLang = root.translationManager.currentLang;
    } else if (root.LANGUAGE_CODE) {
      currentLang = root.LANGUAGE_CODE;
    }

    var lang = null;
    for (var i = 0; i < reg.LANGUAGES.length; i++) {
      if (reg.LANGUAGES[i].code === currentLang) {
        lang = reg.LANGUAGES[i];
        break;
      }
    }

    if (!lang || !lang.currency) {
      return { symbol: '¥', code: 'CNY', rate: 1, unit: '万元' };
    }

    return lang.currency;
  }

  /**
   * 将人民币金额转换为当前币种的万位显示值
   *
   * 例：CNY rate=1 unit=万元
   *   formatCurrencyWan(50000) → { value: 5, display: '5', unit: '万元/年' }
   *
   * 例：USD rate=0.14 unit=K
   *   formatCurrencyWan(50000) → 50000 * 0.14 = 7000 USD → 7000 / 1000 = 7K
   *   → { value: 7, display: '7', unit: 'K/yr' }
   *
   * @param {number} cnyAmount - 人民币金额
   * @returns {{ value: number, display: string, symbol: string, unit: string }}
   */
  function formatCurrencyWan(cnyAmount) {
    var cfg = getConfig();
    var localAmount = cnyAmount * cfg.rate;
    var unitValue = UNIT_VALUES[cfg.unit] || 1;
    var wanValue = localAmount / unitValue;

    // 格式化：大数字不显示小数，小数字保留 1 位
    var display = wanValue >= 100
      ? Math.round(wanValue).toString()
      : wanValue.toFixed(1).replace(/\.0$/, '');

    return {
      value: wanValue,
      display: display,
      symbol: cfg.symbol,
      unit: cfg.unit
    };
  }

  /**
   * 格式化每月金额（非万位）
   * @param {number} cnyAmount - 人民币月金额
   * @returns {{ value: number, display: string, symbol: string }}
   */
  function formatCurrency(cnyAmount) {
    var cfg = getConfig();
    var localAmount = cnyAmount * cfg.rate;

    var display;
    if (localAmount >= 1000000) {
      display = (localAmount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (localAmount >= 10000) {
      display = (localAmount / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    } else {
      display = Math.round(localAmount).toString();
    }

    return {
      value: localAmount,
      display: display,
      symbol: cfg.symbol
    };
  }

  /**
   * 获取输入框的 placeholder 和默认值（按币种调整）
   * @param {number} cnyDefault - 人民币默认值
   * @returns {{ placeholder: string, defaultValue: number, label: string }}
   */
  function getInputConfig(cnyDefault) {
    var cfg = getConfig();
    var localDefault = Math.round(cnyDefault * cfg.rate);
    return {
      placeholder: localDefault.toString(),
      defaultValue: localDefault,
      label: cfg.symbol
    };
  }

  /**
   * 将用户输入的当地币种金额转换回人民币
   * @param {number} localAmount - 用户输入的金额
   * @returns {number} 人民币金额
   */
  function toCNY(localAmount) {
    var cfg = getConfig();
    return localAmount / cfg.rate;
  }

  // ── Export ──
  var Currency = {
    getConfig: getConfig,
    formatCurrencyWan: formatCurrencyWan,
    formatCurrency: formatCurrency,
    getInputConfig: getInputConfig,
    toCNY: toCNY,
    UNIT_VALUES: UNIT_VALUES
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Currency;
  }
  root.Currency = Currency;
})(typeof window !== 'undefined' ? window : this);
