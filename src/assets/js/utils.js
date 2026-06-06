// utils.js - AppUtils IIFE (image assets + product catalog helpers)
// Depends on: window.PRODUCT_SERIES, window.PRODUCT_DEFAULTS, window.ImageAssets
// Outputs: window.AppUtils

(function attachAppUtils(_global) {
  "use strict";

  /**
   * 产品分类名 → i18n key 中的 ASCII slug 映射表
   */
  var CATEGORY_SLUG_MAP = {
    // 粗分类名 → URL slug（用于 product-detail.js 构建面包屑和路由）
    翻炒系列: "stirfry",
    炖煮系列: "stewing",
    煎炸系列: "frying",
    蒸煮系列: "steaming",
    切配系列: "cutting",
    辅助系列: "other",
    // 细分品类名 — 保留兼容
    中小型智能炒菜机: "smart_cooker_mid",
    其他烹饪设备: "other_cooking",
    团餐专用炒菜机: "catering_cooker",
    多功能搅拌炒锅: "mixing_wok",
    大型商用炒菜机: "commercial_large",
    智能全自动炒菜机: "auto_cooker",
    智能喷料炒菜机: "spray_cooker",
    智能油炸炉系列: "fryer_series",
    "智能煮面/饭炉系列": "noodle_rice_series",
    智能电磁滚筒炒菜机: "drum_induction",
    智能触屏滚筒炒菜机: "drum_touchscreen",
    行星搅拌炒菜机: "planetary_mixer",
  };

  function getCategoryI18nKey(category) {
    // Support both i18n keys (nav_products_stirfry) and Chinese category names
    if (!category) return "filter_unknown";
    // If it's already an i18n key (nav_products_xxx), use directly
    if (category.indexOf("nav_products_") === 0 || category.indexOf("nav_") === 0) return category;
    // Legacy: Chinese name → slug mapping
    var slug = CATEGORY_SLUG_MAP[category];
    return slug ? "filter_" + slug : "filter_" + category;
  }

  function getImageAssets() {
    return (window.ImageAssets && window.ImageAssets.IMAGE_ASSETS) || {};
  }

  function getProductSeries() {
    return window.PRODUCT_SERIES || [];
  }

  function getProductDefaults() {
    return window.PRODUCT_DEFAULTS || {};
  }

  function isProductActive(product) {
    return product && product.isActive !== false;
  }

  function resolveImage(imageKey) {
    return getImageAssets()[imageKey] || "";
  }

  function applyImageAssets(root) {
    if (!root) root = document;
    root.querySelectorAll("[data-image-key]").forEach(function (img) {
      var src = resolveImage(img.dataset.imageKey);
      if (src) img.src = src;
    });
    root.querySelectorAll("[data-poster-key]").forEach(function (video) {
      var poster = resolveImage(video.dataset.posterKey);
      if (poster) video.poster = poster;
    });
    root.querySelectorAll("[data-bg-image-key]").forEach(function (el) {
      var bg = resolveImage(el.dataset.bgImageKey);
      if (bg) el.style.backgroundImage = "url('" + bg + "')";
    });
  }

  function buildProductCatalog() {
    var PRODUCT_SERIES = getProductSeries();
    var PRODUCT_DEFAULTS = getProductDefaults();
    var nextId = 1;
    var result = [];
    PRODUCT_SERIES.forEach(function (series) {
      series.products.filter(isProductActive).forEach(function (product) {
        var category = series.category;
        var imageKey = product.imageRecognitionKey || "product_" + category;
        var imageUrl = product.imageUrl || resolveImage(imageKey);
        result.push(
          Object.assign(
            {},
            PRODUCT_DEFAULTS,
            {
              id: nextId++,
              category: category,
              filterKey: category,
              imageRecognitionKey: imageKey,
              imageKey: imageKey,
              productImageKey: imageKey,
              imageUrl: imageUrl,
              productImage: imageUrl,
            },
            product
          )
        );
      });
    });
    return result;
  }

  function getSeriesFilters() {
    return getProductSeries()
      .filter(function (series) {
        return (series.products || []).some(isProductActive);
      })
      .map(function (series) {
        return {
          key: series.category,
          filterKey: getCategoryI18nKey(series.category),
        };
      });
  }

  window.AppUtils = {
    get IMAGE_ASSETS() {
      return getImageAssets();
    },
    get PRODUCT_SERIES() {
      return getProductSeries();
    },
    resolveImage: resolveImage,
    applyImageAssets: applyImageAssets,
    buildProductCatalog: buildProductCatalog,
    getSeriesFilters: getSeriesFilters,
    getCategoryI18nKey: getCategoryI18nKey,
  };
})(window);

// ─── Global product i18n utilities (used by home-core-products.js, product-grid.js, product-detail.js, cross-sell.js) ───
// Priority: zh-CN → zh → product[field] (Chinese). Non-zh → _productTranslationsByModel[model][field] → product[field]
window.getProductField = function getProductField(product, field) {
  if (!product) return "";
  var lang = (
    (window.translationManager && window.translationManager.currentLanguage) ||
    window.CURRENT_LANG ||
    (window.t && window.t.currentLanguage) ||
    localStorage.getItem("userLanguage") ||
    document.documentElement.lang ||
    "en"
  )
    .replace("_", "-")
    .split("-")
    .slice(0, 2)
    .join("-");
  // zh-CN / zh: return Chinese field directly
  if (lang === "zh-CN" || lang === "zh") return product[field] || "";
  // Non-Chinese: try product translations map first (en-product.json)
  var model = product.model;
  var map = window._productTranslationsByModel || {};
  var t = map[model];
  if (t && t[field]) return t[field];

  // Step 2: embedded English fallback fields (nameEn, specificationsEn, etc.)
  // Always available immediately without async loading.
  var enFallbacks = {
    name: product.nameEn,
    specifications: product.specificationsEn,
    usage: product.usageEn,
    material: product.materialEn,
    throughput: product.throughputEn,
    average_time: product.averageTimeEn,
    power: product.powerEn,
    voltage: product.voltageEn,
    sub_category: product.subCategoryEn,
  };
  if (enFallbacks[field]) return enFallbacks[field];

  // Step 3: for non-English languages, try uiText/t from ui.json
  // (product_{model}_{field} keys may have been loaded from product.json)
  if (lang !== "en" && lang !== "en-US" && lang !== "en-GB") {
    if (field === "name" || field === "specifications" || field === "usage" || field === "material") {
      var trKey = "product_" + model.toLowerCase().replace(/[-/]/g, "_") + "_" + field;
      var trVal = null;
      if (typeof window.uiText === "function") trVal = window.uiText(trKey, null);
      if (!trVal && typeof window.t === "function") {
        try {
          trVal = window.t(trKey);
        } catch (e) {}
      }
      if (trVal && trVal !== trKey) return trVal;
    }
  }
  // Step 4: generic i18n for tier
  if (field === "tier" && product.tier) {
    var tierMap = { 基础: "basic", 智能: "smart", 全智能: "full_smart" };
    var tierSlug = tierMap[product.tier];
    if (tierSlug) {
      var tierVal = window.uiText ? window.uiText("tier_" + tierSlug, "") : "";
      if (tierVal) return tierVal;
    }
  }
  // Final: return the raw Chinese field rather than blank
  return product[field] || "";
};

// Also export for non-window reference
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getProductField: window.getProductField };
}
