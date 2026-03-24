// utils.js - AppUtils IIFE (image assets + product catalog helpers)
// Depends on: window.PRODUCT_SERIES, window.PRODUCT_DEFAULTS, window.ImageAssets
// Outputs: window.AppUtils

(function attachAppUtils(global) {
  "use strict";

  /**
   * 产品分类名 → i18n key 中的 ASCII slug 映射表
   */
  var CATEGORY_SLUG_MAP = {
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
    var slug = CATEGORY_SLUG_MAP[category];
    return slug ? "filter_" + slug : "filter_" + category;
  }

  function getImageAssets() {
    return (global.ImageAssets && global.ImageAssets.IMAGE_ASSETS) || {};
  }

  function getProductSeries() {
    return global.PRODUCT_SERIES || [];
  }

  function getProductDefaults() {
    return global.PRODUCT_DEFAULTS || {};
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

  global.AppUtils = {
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
