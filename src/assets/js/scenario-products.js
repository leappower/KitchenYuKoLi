/**
 * scenario-products.js — Applications 场景页推荐产品渲染器
 *
 * 从 HTML 容器的 data-scenario / data-device 属性读取场景和设备信息，
 * 不依赖 URL 正则匹配，不依赖 window.innerWidth。
 *
function _reInjectSrcset(root) {
  var m = window.app && window.app.modules && window.app.modules.get("lazyLoading");
  if (m && typeof m.reInjectSrcset === "function") m.reInjectSrcset(root);
} * 数据源: window.PRODUCT_DATA_TABLE (product-data-table.js SSG 时注入)
 * 产品列表: SCENARIO_PRODUCTS 映射表 (场景 key → 产品型号数组)
 */
(function () {
  "use strict";

  /* ────────── 工具函数 ────────── */

  function escHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function tl(key, fallback) {
    if (typeof window.uiText === "function") return window.uiText(key, fallback);
    return fallback || key;
  }

  function _prodKey(model) {
    return (model || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  function translateCategory(cat) {
    var map = {
      翻炒系列: "nav_products_stirfry",
      炖煮系列: "nav_products_stewing",
      蒸煮系列: "nav_products_steaming",
      煎炸系列: "nav_products_frying",
      切配系列: "nav_products_cutting",
      辅助系列: "nav_products_other",
    };
    var k = map[cat];
    return k ? tl(k, cat) : cat;
  }

  function getPrimaryImage(product) {
    if (!product.images || !product.images.length) return null;
    return "/assets/images/products/" + product.model + ".webp";
  }

  function getProductDetailHref(product) {
    var CATEGORY_NAME_TO_SLUG = {
      翻炒系列: "stirfry",
      切配系列: "cutting",
      煎炸系列: "frying",
      炖煮系列: "stewing",
      蒸煮系列: "steaming",
      辅助系列: "other",
    };
    var catSlug = CATEGORY_NAME_TO_SLUG[product.category] || null;
    // fallback: 从不可变 MODEL_TO_SLUG 查找
    if (!catSlug && window.MODEL_TO_SLUG) catSlug = window.MODEL_TO_SLUG[product.model] || null;
    if (catSlug) {
      return "/products/" + catSlug + "/" + encodeURIComponent(product.model) + "/";
    }
    return "/products/" + encodeURIComponent(product.model) + "/";
  }

  // Only define fallback if utils.js getProductField hasn't been loaded
  // (utils.js is loaded before scenario-products.js via script tags)
  if (typeof window.getProductField !== "function") {
    window.getProductField = function (p, field) {
      if (!p) return "";
      if (field === "name") return p.name_en || p.name || "";
      return p[field] || "";
    };
  }

  /* ────────── 场景产品映射表 ────────── */

  var SCENARIO_PRODUCTS = {
    "small-restaurant": [
      "DLB-TBS30",
      "DLB-TBQ30",
      "DLB-TQBQ30",
      "DLB-TGS30",
      "DLB-TGD30",
      "DLB-TBS40",
      "DLB-TZS40",
      "F32F1C",
      "G26D1A",
      "Y12D1C",
      "GT1D1B",
      "B4RTD",
    ],
    "chain-restaurant": [
      "DLB-4BQ30",
      "DLB-GD30",
      "DLB-GD36",
      "DLB-GQ30",
      "DLB-GQ36",
      "DLB-GQ30T",
      "DLB-GB50",
      "DLB-GC50",
      "G50AAB",
      "G60EAC",
      "DLB-XC80",
      "DLB-QXC80",
      "DLB-PZJ100",
      "DLB-PZJ120",
    ],
    "central-kitchen": [
      "DLB-TGQ40J",
      "DLB-TGQ36J",
      "DLB-GC50",
      "DLB-GC60",
      "DLB-GQ50",
      "DLB-GQ60",
      "G30DAG",
      "G36DAG",
      "B4RTD",
      "B6RBD",
      "DLB-XC100",
      "LZ80D1B",
    ],
    canteen: [
      "DLB-GB70",
      "DLB-GC70",
      "DLB-GB80",
      "DLB-GC80",
      "DLB-GQ70",
      "G70EAC",
      "G80EAC",
      "DLB-XC100",
      "DLB-QXC100",
      "DLB-PZJ200",
      "Z8FCB/Z12FCB",
      "Z6FCB",
      "DLB-ZNT",
      "DLB-BXC800",
    ],
    "cloud-kitchen": [
      "DLB-TGS30",
      "DLB-TGD30",
      "DLB-TGQ30",
      "G26D1A",
      "G30D1A",
      "G26DAA",
      "F32F1C",
      "Y12D1C",
      "Y12D2C",
      "GT2D1B",
    ],
    "food-factory": [
      "DLB-GB90",
      "DLB-GC90",
      "DLB-GQ90",
      "DLB-GB80",
      "G80EAC",
      "DLB-XC120",
      "DLB-QXC120",
      "DLB-PZJ400",
      "DLB-BXC800",
      "HKQPJ500-VIII",
      "DLB-A6200",
      "HKJGJ380-VI",
    ],
    "menu-lab": [
      "DLB-TGQ30J",
      "DLB-TGQ36J",
      "DLB-TGQ40J",
      "G30D1T",
      "G26DAG",
      "G30DAG",
      "J40CBB",
      "F32F1C",
      "DLB-TZS40",
      "Y12D1C",
      "GT1D1B",
      "B4RTD",
    ],
  };

  /* ────────── 产品加载 ────────── */

  function loadProducts(scenarioKey, callback, retries) {
    var modelList = SCENARIO_PRODUCTS[scenarioKey];
    if (!modelList) {
      callback([]);
      return;
    }

    var table = window.PRODUCT_DATA_TABLE || [];
    var lookup = {};
    modelList.forEach(function (m) {
      lookup[m.toLowerCase()] = true;
    });

    var filtered = table.filter(function (p) {
      return lookup[p.model.toLowerCase()] === true;
    });

    if (filtered.length === 0 && !Array.isArray(window.PRODUCT_DATA_TABLE)) {
      retries = retries || 0;
      if (retries < 10) {
        setTimeout(function () {
          loadProducts(scenarioKey, callback, retries + 1);
        }, 100);
        return;
      }
    }

    filtered.sort(function (a, b) {
      return modelList.indexOf(a.model) - modelList.indexOf(b.model);
    });
    callback(filtered);
  }

  /* ────────── 卡片构建 ────────── */

  function buildCard(p, device) {
    var img = getPrimaryImage(p);
    var href = getProductDetailHref(p);
    var catMap = {
      翻炒系列: "stirfry",
      炖煮系列: "stewing",
      蒸煮系列: "steaming",
      煎炸系列: "frying",
      切配系列: "cutting",
      辅助系列: "other",
    };
    var CATEGORY_I18N_MAP = {
      翻炒系列: "nav_products_stirfry",
      炖煮系列: "nav_products_stewing",
      蒸煮系列: "nav_products_steaming",
      煎炸系列: "nav_products_frying",
      切配系列: "nav_products_cutting",
      辅助系列: "nav_products_other",
    };
    var catSlug = catMap[p.category] || "other";
    var catHref = "/products/" + catSlug + "/";

    var imgClass = device === "mobile" ? "p-2 sm:p-3" : device === "tablet" ? "p-3 sm:p-4" : "p-4";
    var imgSize = device === "pc" ? "2.5rem" : "2rem";
    var padClass = device === "mobile" ? "p-3 sm:p-4" : device === "tablet" ? "p-3 sm:p-4" : "p-5";
    var titleClass = device === "pc" ? "text-lg font-black mb-1" : "font-bold text-sm mb-1";
    var descClass =
      device === "pc"
        ? "text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4"
        : "text-xs text-slate-500 line-clamp-2 mb-3";
    var powerClass = device === "pc" ? "text-xs" : "text-[11px]";
    var badgeClass = device === "pc" ? "text-xs px-2.5 py-1 mb-3" : "text-[10px] px-2 py-0.5 mb-2";
    var isDark = device === "pc";

    return (
      '<div class="group bg-white rounded-2xl border border-slate-200' +
      (isDark ? " dark:border-slate-700" : "") +
      ' hover:border-primary hover:shadow-lg transition-all duration-300 overflow-hidden" data-link="' +
      href +
      '">' +
      '<div class="aspect-[4/3] bg-white overflow-hidden cursor-pointer">' +
      (img
        ? '<img alt="' +
          escHtml(p.model) +
          '" class="w-full h-full object-contain ' +
          imgClass +
          ' group-hover:scale-105 transition-transform duration-300" src="' +
          escHtml(img) +
          '" loading="lazy">'
        : '<div style="font-size:' +
          imgSize +
          ';color:#d1d5db;display:flex;align-items:center;justify-content:center;height:100%">&##x1f4e6;</div>') +
      "</div>" +
      '<div class="' +
      padClass +
      '">' +
      (p.category
        ? '<a href="' +
          catHref +
          '" class="inline-block ' +
          badgeClass +
          ' rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-bold" data-i18n="' +
          (CATEGORY_I18N_MAP[p.category] || "") +
          '">' +
          escHtml(translateCategory(p.category)) +
          "</a>"
        : "") +
      '<h3 class="' +
      titleClass +
      '">' +
      escHtml(p.model) +
      "</h3>" +
      (typeof getProductField === "function" && getProductField(p, "name")
        ? '<p class="' +
          descClass +
          '">' +
          escHtml(tl("product_" + _prodKey(p.model) + "_name", getProductField(p, "name") || p.model)) +
          "</p>"
        : '<div class="mb-4"></div>') +
      '<div class="flex justify-between items-center pt-2 border-t border-slate-100' +
      (isDark ? " dark:border-slate-700" : "") +
      '">' +
      (p.power
        ? '<span class="' + powerClass + ' font-bold text-slate-400">' + escHtml(p.power) + "</span>"
        : "<span></span>") +
      '<a href="' +
      href +
      '" data-no-swup class="font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all duration-300 hover:opacity-80" data-i18n="home_hw_learn_more" style="font-size:' +
      (device === "pc" ? "0.875rem" : "0.75rem") +
      ';line-height:1.25rem">' +
      tl("home_hw_learn_more", "了解更多") +
      ' <span class="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span></a>' +
      "</div></div></div>"
    );
  }

  /* ────────── 渲染 ────────── */

  function render(container, products, device) {
    if (!products || products.length === 0) {
      container.innerHTML = '<div class="text-center text-slate-400 py-8">' + _reInjectSrcset(container);
      escHtml(tl("no_scenario_products", "暂无场景产品数据")) + "</div>";
      return;
    }

    var VIS_COUNT = device === "pc" ? 8 : 4;
    var gridClass = device === "pc" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8" : "grid grid-cols-2 gap-3";
    var hasMore = products.length > VIS_COUNT;
    var visProducts = hasMore ? products.slice(0, VIS_COUNT) : products;
    var restProducts = hasMore ? products.slice(VIS_COUNT) : [];

    var html = '<div class="' + gridClass + '">';
    visProducts.forEach(function (p) {
      html += buildCard(p, device);
    });
    html += "</div>";

    if (hasMore) {
      var hiddenId = "scenario-hidden-" + device;
      html += '<div id="' + hiddenId + '" style="display:none" class="' + gridClass + ' mt-4">';
      restProducts.forEach(function (p) {
        html += buildCard(p, device);
      });
      html += "</div>";

      if (device === "mobile") {
        html +=
          '<button id="scenario-load-more" class="w-full mt-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-primary hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-center gap-2" onclick="(function(){var h=document.getElementById(\'' +
          hiddenId +
          "');var b=document.getElementById('scenario-load-more');if(h&&b){h.style.display='';b.style.display='none';window.translationManager&&window.translationManager.applyTo(h.parentElement);}})()\">" +
          '<span class="material-symbols-outlined text-lg">expand_more</span> ' +
          escHtml(tl("home_show_more", "更多产品")) +
          "</button>";
      } else {
        html +=
          '<div class="flex justify-center mt-8">' +
          '<button class="px-6 py-2.5 rounded-full border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all cursor-pointer text-sm" onclick="(function(){var h=document.getElementById(\'' +
          hiddenId +
          "');var b=this;if(h.style.display==='none'){h.style.display='';b.textContent=typeof window.uiText==='function'?window.uiText('home_hw_collapse','收起 ▲'):'收起 ▲'}else{h.style.display='none';b.textContent=typeof window.uiText==='function'?window.uiText('home_hw_show_more','查看更多产品 ▼'):'查看更多产品 ▼'}})()\" data-i18n=\"home_hw_show_more\">" +
          tl("home_hw_show_more", "查看更多产品 ▼") +
          "</button></div>";
      }
    }

    container.innerHTML = html;
    if (window.translationManager && window.translationManager.applyTo) {
      _reInjectSrcset(container);
      window.translationManager.applyTo(container);
    }
  }

  /* ────────── 初始化 ────────── */

  function init() {
    var containers = document.querySelectorAll("[data-scenario]");
    if (!containers.length) return;

    for (var i = 0; i < containers.length; i++) {
      var el = containers[i];
      var scenarioKey = el.dataset.scenario;
      var device = el.dataset.device;

      if (!scenarioKey || !SCENARIO_PRODUCTS[scenarioKey]) continue;

      loadProducts(scenarioKey, function (products) {
        render(el, products, device);
      });
    }
  }

  document.addEventListener("spa:load", function () {
    init();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Re-render on language change — listen on both document and window
  function _onLangChange() {
    init();
  }
  document.addEventListener("languageChanged", _onLangChange);
  window.addEventListener("languageChanged", _onLangChange);
})();
