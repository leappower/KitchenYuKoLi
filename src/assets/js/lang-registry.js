/**
 * lang-registry.js — 语言注册表（唯一权威数据源）
 *
 * 所有与语言相关的配置均在此处管理：
 *   - 前端弹窗展示（nativeName、uiGroup）
 *   - 翻译引擎目标语言（hasTranslation、englishName）
 *   - 翻译文件生成/合并排序（sortOrder）
 *   - 运行时语言白名单（hasTranslation: true）
 *
 * 使用方式：
 *   Node.js:  const { LANGUAGES, getLangs } = require('../src/lang-registry');
 *   Browser:  通过 webpack/vite 打包或 <script> 引入后读取 window.LANG_REGISTRY
 *
 * 字段说明：
 *   code           语言代码（唯一 ID）
 *   nativeName     弹窗展示的原生名称
 *   englishName    翻译 Prompt 中使用的英文名称
 *   hasTranslation true  = 已有翻译文件，参与翻译引擎处理
 *                  false = 仅前端展示，暂无翻译文件
 *   uiGroup        弹窗分组：'common'
 *   sortOrder      合并/排序时的顺序（数字越小越靠前）
 */

"use strict";

// ─────────────────────────────────────────────────────────────────────────────
// 主注册表（2 种语言：zh-CN + en）
// ─────────────────────────────────────────────────────────────────────────────
// 使用 var 防止重复加载时报错，并用 window 检查避免重复定义
if (typeof window !== "undefined" && window.LANG_REGISTRY && window.LANG_REGISTRY.LANGUAGES) {
  // 已存在，直接复用
} else {
  // 语言注册表定义
  var LANGUAGES = [
    {
      code: "zh-CN",
      nativeName: "中文（简体）",
      englishName: "Chinese (Simplified)",
      hasTranslation: true,
      uiGroup: "common",
      sortOrder: 1,
      currency: { symbol: "¥", code: "CNY", rate: 1, unit: "万元" },
    },
    {
      code: "en",
      nativeName: "English",
      englishName: "English",
      hasTranslation: true,
      uiGroup: "common",
      sortOrder: 2,
      currency: { symbol: "$", code: "USD", rate: 0.14, unit: "K" },
    },
    // ── Phase 2: Southeast Asia ──
    {
      code: "th",
      nativeName: "ไทย",
      englishName: "Thai",
      hasTranslation: true,
      uiGroup: "southeast_asia",
      sortOrder: 3,
      currency: { symbol: "฿", code: "THB", rate: 5.0, unit: "ล้าน" },
    },
    {
      code: "vi",
      nativeName: "Tiếng Việt",
      englishName: "Vietnamese",
      hasTranslation: true,
      uiGroup: "southeast_asia",
      sortOrder: 4,
      currency: { symbol: "₫", code: "VND", rate: 3400, unit: "Triệu" },
    },
    {
      code: "ms",
      nativeName: "Bahasa Melayu",
      englishName: "Malay",
      hasTranslation: true,
      uiGroup: "southeast_asia",
      sortOrder: 5,
      currency: { symbol: "RM", code: "MYR", rate: 0.65, unit: "Juta" },
    },
    {
      code: "id",
      nativeName: "Bahasa Indonesia",
      englishName: "Indonesian",
      hasTranslation: true,
      uiGroup: "southeast_asia",
      sortOrder: 6,
      currency: { symbol: "Rp", code: "IDR", rate: 2200, unit: "Juta" },
    },
    // ── Phase 3: East Asia ──
    {
      code: "ja",
      nativeName: "日本語",
      englishName: "Japanese",
      hasTranslation: true,
      uiGroup: "east_asia",
      sortOrder: 7,
      currency: { symbol: "¥", code: "JPY", rate: 21, unit: "万円", label: "JP¥" },
    },
    {
      code: "ko",
      nativeName: "한국어",
      englishName: "Korean",
      hasTranslation: true,
      uiGroup: "east_asia",
      sortOrder: 8,
      currency: { symbol: "₩", code: "KRW", rate: 188, unit: "백만" },
    },
    // ── Phase 4: South Asia + Others ──
    {
      code: "hi",
      nativeName: "हिन्दी",
      englishName: "Hindi",
      hasTranslation: true,
      uiGroup: "other",
      sortOrder: 9,
      currency: { symbol: "₹", code: "INR", rate: 11.5, unit: "Lakh" },
    },
    {
      code: "zh-TW",
      nativeName: "中文（繁體）",
      englishName: "Chinese (Traditional)",
      hasTranslation: true,
      uiGroup: "other",
      sortOrder: 10,
      currency: { symbol: "NT$", code: "TWD", rate: 4.4, unit: "萬元" },
    },
    {
      code: "ar",
      nativeName: "العربية",
      englishName: "Arabic",
      hasTranslation: true,
      uiGroup: "other",
      sortOrder: 11,
      currency: { symbol: "ر.س", code: "SAR", rate: 0.52, unit: "K" },
    },
  ];
} // 结束重复加载保护

// ─────────────────────────────────────────────────────────────────────────────
// 派生工具函数（从注册表生成各脚本需要的格式）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 筛选语言
 * @param {{ group?: string, hasTranslation?: boolean }} [filter]
 * @returns {Array} 符合条件的语言记录，按 sortOrder 升序
 */
function getLangs(filter) {
  var result = LANGUAGES.slice().sort(function (a, b) {
    return a.sortOrder - b.sortOrder;
  });
  if (!filter) return result;
  if (filter.group !== undefined) {
    result = result.filter(function (l) {
      return l.uiGroup === filter.group;
    });
  }
  if (filter.hasTranslation !== undefined) {
    result = result.filter(function (l) {
      return l.hasTranslation === filter.hasTranslation;
    });
  }
  return result;
}

/**
 * 返回 { code: nativeName } 映射（对应 translations.js languageNames）
 * @param {{ hasTranslation?: boolean }} [filter]
 * @returns {Object}
 */
function getNativeNames(filter) {
  return getLangs(filter).reduce(function (acc, l) {
    acc[l.code] = l.nativeName;
    return acc;
  }, {});
}

// ─────────────────────────────────────────────────────────────────────────────
// 导出
// ─────────────────────────────────────────────────────────────────────────────

// Node.js 环境
if (typeof module !== "undefined" && module.exports) {
  // Aliases for backward compatibility with build scripts
  function getSupportedCodes(filter) {
    return getLangs(filter).map(function (l) {
      return l.code;
    });
  }
  function getAllCodes() {
    return LANGUAGES.map(function (l) {
      return l.code;
    });
  }
  function getEnglishNames(filter) {
    return getLangs(filter).reduce(function (acc, l) {
      acc[l.code] = l.englishName;
      return acc;
    }, {});
  }

  module.exports = {
    LANGUAGES,
    getLangs,
    getNativeNames,
    getSupportedCodes,
    getAllCodes,
    getEnglishNames,
  };
}

// 浏览器环境（通过 <script> 直接引入时）
if (typeof window !== "undefined") {
  window.LANG_REGISTRY = {
    LANGUAGES: LANGUAGES,
    getLangs: getLangs,
    getNativeNames: getNativeNames,
  };
}
