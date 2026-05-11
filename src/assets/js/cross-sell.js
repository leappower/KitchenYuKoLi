/**
 * cross-sell.js — Cross-sell recommendations & scene entry links
 *
 * Renders on product category pages:
 *   - "搭配推荐" cross-sell cards (3-4 per category)
 *   - "适用场景" scene entry links (3 per category, with descriptions)
 *
 * Also populates PDP category navigation (#product-category-nav).
 *
 * Responsive layout:
 *   PC (≥1280px): 4 cols cross-sell, 3 cols scene
 *   Tablet (768-1279px): 2-3 cols
 *   Mobile (<768px): horizontal scroll or stacked cards
 */
(function () {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  function tl(key, fallback) {
    if (typeof window.t === "function") {
      var result = window.t(key);
      if (result && result !== key) return result;
    }
    return fallback || key;
  }

  // ─── Category data ────────────────────────────────────────────

  var PRODUCT_SLUGS = {
    stirfry: { key: "nav_products_stirfry", label: "翻炒系列", icon: "local_fire_department" },
    cutting: { key: "nav_products_cutting", label: "切配系列", icon: "content_cut" },
    frying: { key: "nav_products_frying", label: "煎炸系列", icon: "outdoor_grill" },
    stewing: { key: "nav_products_stewing", label: "炖煮系列", icon: "soup_kitchen" },
    steaming: { key: "nav_products_steaming", label: "蒸煮系列", icon: "cloud" },
    other: { key: "nav_products_other", label: "辅助设备", icon: "more_horiz" },
  };

  var CATEGORY_KEY_TO_SLUG = {};
  Object.keys(PRODUCT_SLUGS).forEach(function (slug) {
    CATEGORY_KEY_TO_SLUG[PRODUCT_SLUGS[slug].key] = slug;
  });

  // ─── Cross-sell: 3-4 items per category with rich copy ────────

  var CROSS_SELL_MAP = {
    stirfry: [
      { slug: "cutting", reason: "切配后直接翻炒，备料到出餐无缝衔接", highlight: "效率 +200%" },
      { slug: "steaming", reason: "蒸饭蒸菜同步进行，午高峰不排队", highlight: "出餐 -40min" },
      { slug: "other", reason: "洗碗机+保温台，后厨动线一次到位", highlight: "人手 -3人" },
      { slug: "stewing", reason: "炖汤+炒菜双线出餐，菜品更丰富", highlight: "菜品 +30%" },
    ],
    cutting: [
      { slug: "stirfry", reason: "切好直接下锅，备料到烹饪零等待", highlight: "效率 +180%" },
      { slug: "steaming", reason: "切配+蒸煮一体化，前处理更高效", highlight: "备料 -60min" },
      { slug: "other", reason: "传送带+分拣台，流水线式切配作业", highlight: "产能 +4倍" },
    ],
    frying: [
      { slug: "stirfry", reason: "炸+炒双线并行，出餐速度翻倍", highlight: "出餐 +100%" },
      { slug: "cutting", reason: "切配备料跟上油炸节奏，不缺料", highlight: "备料 0等待" },
      { slug: "other", reason: "滤油台+排烟系统，油炸区干净整洁", highlight: "油烟 -80%" },
    ],
    stewing: [
      { slug: "stirfry", reason: "炖汤+炒菜组合，满足多样化菜单", highlight: "菜品 +25%" },
      { slug: "steaming", reason: "炖煮蒸饭同步，大锅饭不再手忙脚乱", highlight: "同步出餐" },
      { slug: "cutting", reason: "自动切配炖菜食材，规格统一味道稳", highlight: "口味一致" },
    ],
    steaming: [
      { slug: "stirfry", reason: "蒸+炒搭档，炒菜蒸饭同时搞定", highlight: "效率 +150%" },
      { slug: "cutting", reason: "蒸前切配自动完成，食材现切现蒸", highlight: "鲜度提升" },
      { slug: "stewing", reason: "蒸+炖组合，汤饭粥一灶全出", highlight: "一灶多用" },
      { slug: "other", reason: "保温分餐台搭配蒸柜，热菜直达窗口", highlight: "温度不降" },
    ],
    other: [
      { slug: "stirfry", reason: "核心烹饪+辅助设备，后厨全套配齐", highlight: "一站式" },
      { slug: "cutting", reason: "切配+辅助传送，流水线完整配置", highlight: "流水线化" },
      { slug: "steaming", reason: "蒸柜+保温台，从蒸到分餐不断链", highlight: "温度可控" },
    ],
  };

  // ─── Scene entry: 3 scenes per category with descriptions ─────

  var SCENE_ENTRY_MAP = {
    stirfry: [
      {
        href: "/applications/small-restaurant/",
        slug: "small-restaurant",
        icon: "storefront",
        desc: "2-5人小后厨，一台炒菜机顶3个厨师",
      },
      {
        href: "/applications/canteen/",
        slug: "canteen",
        icon: "restaurant",
        desc: "食堂午高峰500-5000人，90分钟出完热菜",
      },
      {
        href: "/applications/central-kitchen/",
        slug: "central-kitchen",
        icon: "apartment",
        desc: "中央厨房批量出餐，菜品口味标准化",
      },
    ],
    cutting: [
      {
        href: "/applications/central-kitchen/",
        slug: "central-kitchen",
        icon: "apartment",
        desc: "千份级备料，切配规格统一不出错",
      },
      {
        href: "/applications/food-factory/",
        slug: "food-factory",
        icon: "factory",
        desc: "食品工厂流水线切配，日产能提升6倍",
      },
      { href: "/applications/canteen/", slug: "canteen", icon: "restaurant", desc: "食堂切菜工序自动化，2小时→20分钟" },
    ],
    frying: [
      {
        href: "/applications/small-restaurant/",
        slug: "small-restaurant",
        icon: "storefront",
        desc: "炸鸡炸薯条出餐快，外卖高峰不爆单",
      },
      {
        href: "/applications/chain-restaurant/",
        slug: "chain-restaurant",
        icon: "store",
        desc: "连锁店炸品口味统一，每批出品标准化",
      },
      {
        href: "/applications/cloud-kitchen/",
        slug: "cloud-kitchen",
        icon: "delivery_dining",
        desc: "云厨房多品牌共用，炸炉轮流出餐",
      },
    ],
    stewing: [
      { href: "/applications/canteen/", slug: "canteen", icon: "restaurant", desc: "食堂炖汤一大锅，千人份同时供应" },
      {
        href: "/applications/central-kitchen/",
        slug: "central-kitchen",
        icon: "apartment",
        desc: "中央厨房炖品批量出，口味稳定如一",
      },
      {
        href: "/applications/chain-restaurant/",
        slug: "chain-restaurant",
        icon: "store",
        desc: "连锁店招牌炖品，每家店味道都一样",
      },
    ],
    steaming: [
      {
        href: "/applications/canteen/",
        slug: "canteen",
        icon: "restaurant",
        desc: "食堂蒸饭蒸菜同步，千人份量轻松搞定",
      },
      {
        href: "/applications/central-kitchen/",
        slug: "central-kitchen",
        icon: "apartment",
        desc: "中央厨房批量蒸制，配送前锁鲜保味",
      },
      {
        href: "/applications/food-factory/",
        slug: "food-factory",
        icon: "factory",
        desc: "食品工厂蒸煮工序，全自动温度控制",
      },
    ],
    other: [
      { href: "/applications/canteen/", slug: "canteen", icon: "restaurant", desc: "食堂洗碗分餐一体，后厨人手省一半" },
      {
        href: "/applications/chain-restaurant/",
        slug: "chain-restaurant",
        icon: "store",
        desc: "连锁店排烟+清洗标准化，后厨干净合规",
      },
      {
        href: "/applications/central-kitchen/",
        slug: "central-kitchen",
        icon: "apartment",
        desc: "中央厨房传送+包装，全流程自动化",
      },
    ],
    all: [
      {
        href: "/applications/small-restaurant/",
        slug: "small-restaurant",
        icon: "storefront",
        desc: "2-5人小后厨，一台炒菜机顶3个厨师",
      },
      {
        href: "/applications/canteen/",
        slug: "canteen",
        icon: "restaurant",
        desc: "食堂午高峰500-5000人，90分钟出完热菜",
      },
      {
        href: "/applications/central-kitchen/",
        slug: "central-kitchen",
        icon: "apartment",
        desc: "中央厨房批量出餐，菜品口味标准化",
      },
      {
        href: "/applications/chain-restaurant/",
        slug: "chain-restaurant",
        icon: "dining",
        desc: "连锁门店统一出品，告别厨师依赖",
      },
      {
        href: "/applications/cloud-kitchen/",
        slug: "cloud-kitchen",
        icon: "delivery_dining",
        desc: "外卖云厨房，单店日产能3000+单",
      },
      {
        href: "/applications/food-factory/",
        slug: "food-factory",
        icon: "factory",
        desc: "食品工厂产线自动化，日产能万份以上",
      },
      { href: "/applications/menu-lab/", slug: "menu-lab", icon: "science", desc: "菜系实验室，一键复制各国风味" },
    ],
  };

  var APP_LABELS = {
    "small-restaurant": "小型餐饮",
    "central-kitchen": "中央厨房",
    canteen: "智慧食堂",
    "chain-restaurant": "连锁餐饮",
    "cloud-kitchen": "云厨房/外卖",
    "food-factory": "食品工厂",
    "menu-lab": "菜系实验室",
  };

  function getAppLabel(slug) {
    return tl(APP_LABELS[slug], APP_LABELS[slug]);
  }

  // ─── Detect current page ───────────────────────────────────────

  function detectCategorySlug() {
    var path = (window.location.pathname || "/").replace(/\/$/, "");
    var match = path.match(/^\/products\/(all|stirfry|cutting|frying|stewing|steaming|other)$/);
    return match ? match[1] : null;
  }

  function isPdpPage() {
    var path = (window.location.pathname || "/").replace(/\/$/, "");
    return /^\/products\/(detail\/?(?:\?model=([^&]+))?|([^/]+))$/.test(path);
  }

  // ─── Helpers ───────────────────────────────────────────────────

  function esc(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ─── Cross-sell renderer ──────────────────────────────────────

  function renderCrossSell(slug) {
    var items = CROSS_SELL_MAP[slug];
    if (!items || !items.length) return "";

    var catLabel = tl(PRODUCT_SLUGS[slug].label, PRODUCT_SLUGS[slug].label);
    var html = '<div class="text-center mb-8">';
    html +=
      '<h3 class="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mb-2">' +
      tl("cross_sell_title", "搭配推荐") +
      "</h3>";
    html +=
      '<p class="text-sm text-slate-500 dark:text-slate-400">' +
      tl("cross_sell_subtitle", "买了" + catLabel + "的客户还配了").replace("{cat}", esc(catLabel)) +
      "</p>";
    html += "</div>";

    // Responsive grid: 1 col mobile (single row, no squeeze), 2 cols tablet, 4 cols PC
    var gridCols = items.length >= 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2";
    html += '<div class="grid ' + gridCols + ' gap-3 lg:gap-6">';

    items.forEach(function (item) {
      var info = PRODUCT_SLUGS[item.slug];
      var label = tl(info.label, info.label);

      html +=
        '<a href="/products/' +
        item.slug +
        '/" class="group relative flex items-center gap-3 p-3 md:p-5 lg:p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all">';

      // Icon
      html += '<div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">';
      html += '<span class="material-symbols-outlined text-primary text-lg">' + info.icon + "</span>";
      html += "</div>";

      // Text content (name + description)
      html += '<div class="flex-1 min-w-0">';
      html +=
        '<div class="flex items-center justify-between gap-2">' +
        '<span class="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary transition-colors">' +
        esc(label) +
        "</span>";
      html +=
        '<span class="material-symbols-outlined text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all text-lg shrink-0">arrow_forward</span>';
      html += "</div>";
      html +=
        '<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5 truncate">' +
        esc(item.reason) +
        "</p>";
      html += "</div>";

      // Highlight badge (hidden on mobile, shown md+)
      html +=
        '<span class="hidden md:inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/8 text-primary text-xs font-bold shrink-0">' +
        esc(item.highlight) +
        "</span>";

      html += "</a>";
    });
    html += "</div>";
    return html;
  }

  // ─── Scene entry renderer ─────────────────────────────────────

  function renderSceneEntry(slug) {
    var scenes = SCENE_ENTRY_MAP[slug];
    if (!scenes || !scenes.length) return "";

    var html = '<div class="mt-10 lg:mt-12">';
    html += '<div class="text-center mb-8">';
    html +=
      '<h3 class="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mb-2">' +
      tl("scene_entry_title", "适用场景") +
      "</h3>";
    html +=
      '<p class="text-sm text-slate-500 dark:text-slate-400">' +
      tl("scene_entry_subtitle", "看看这些场景怎么用") +
      "</p>";
    html += "</div>";

    html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">';

    scenes.forEach(function (scene) {
      var label = getAppLabel(scene.slug);

      html +=
        '<a href="' +
        scene.href +
        '" class="group relative block p-5 lg:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900/60 border border-slate-200 dark:border-slate-700/60 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all overflow-hidden">';

      // Decorative gradient blob
      html +=
        '<div class="absolute -top-8 -right-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>';

      html += '<div class="relative">';

      // Icon
      html += '<div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">';
      html += '<span class="material-symbols-outlined text-primary text-xl">' + scene.icon + "</span>";
      html += "</div>";

      // Label
      html +=
        '<h4 class="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors mb-2">' +
        esc(label) +
        "</h4>";

      // Description
      html += '<p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">' + esc(scene.desc) + "</p>";

      // Arrow indicator
      html +=
        '<div class="flex items-center gap-1 mt-4 text-xs font-bold text-slate-400 group-hover:text-primary transition-colors">';
      html += "<span>" + tl("scene_view_detail", "查看方案") + "</span>";
      html +=
        '<span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-all">arrow_forward</span>';
      html += "</div>";

      html += "</div>";
      html += "</a>";
    });
    html += "</div>"; // close grid
    html += "</div>"; // close mt-10 wrapper
    return html;
  }

  // ─── PDP category nav ─────────────────────────────────────────

  function updatePdpCategoryNav() {
    if (!isPdpPage()) return;
    var nav = document.getElementById("product-category-nav");
    if (!nav) return;

    var referrer = sessionStorage.getItem("pdp_referrer") || "";
    var refSlug = referrer.replace(/\/$/, "").split("/").pop();
    if (refSlug && PRODUCT_SLUGS[refSlug]) {
      showPdpNav(nav, refSlug);
      return;
    }

    window.addEventListener("product-data-ready", function onReady() {
      window.removeEventListener("product-data-ready", onReady);
      if (window.ProductGrid && window.ProductGrid.getAllProducts) {
        var path = (window.location.pathname || "/").replace(/\/$/, "");
        var pdpMatch = path.match(/^\/products\/(detail\/?(?:\?model=([^&]+))?|([^/]+))$/);
        var model = pdpMatch ? pdpMatch[2] || pdpMatch[3] || "" : "";
        var products = window.ProductGrid.getAllProducts();
        var found = products.find(function (p) {
          return p.model === model;
        });
        if (found && found._category) {
          var slug = CATEGORY_KEY_TO_SLUG[found._category] || "";
          if (slug) showPdpNav(nav, slug);
        }
      }
    });
  }

  function showPdpNav(nav, slug) {
    var info = PRODUCT_SLUGS[slug];
    if (!info) return;
    var label = tl(info.label, info.label);
    var catLink = nav.querySelector("#pdp-category-link");
    if (catLink) {
      catLink.href = "/products/" + slug + "/";
      catLink.textContent = label;
      catLink.setAttribute("data-i18n", info.key);
    }
    nav.classList.remove("hidden");
  }

  // ─── Referrer tracking ─────────────────────────────────────────

  function trackPdpReferrer() {
    var path = (window.location.pathname || "/").replace(/\/$/, "");
    if (/^\/products\/(stirfry|cutting|frying|stewing|steaming|other)$/.test(path)) {
      sessionStorage.setItem("pdp_referrer", path);
    }
  }

  // ─── Init ─────────────────────────────────────────────────────

  // ─── Render helper (always available) ─────────────────────────
  var _externalSlug = null;

  function renderCrossSellForCurrentPage(overrideSlug) {
    var slug = overrideSlug || _externalSlug || detectCategorySlug();
    if (!slug) return;
    // Cross-sell: skip on /products/all/ (no single category to recommend from)
    if (slug !== "all") {
      var crossSellContainer = document.getElementById("cross-sell-container");
      if (crossSellContainer) {
        var crossSellHtml = renderCrossSell(slug);
        if (crossSellHtml) {
          crossSellContainer.innerHTML = crossSellHtml;
        } else {
        }
      } else {
      }
    }
    var sceneEntryContainer = document.getElementById("scene-entry-container");
    if (sceneEntryContainer) {
      var sceneHtml = renderSceneEntry(slug);
      if (sceneHtml) {
        sceneEntryContainer.innerHTML = sceneHtml;
      } else {
      }
    }
  }

  // ─── Init ─────────────────────────────────────────────────────

  function init() {
    trackPdpReferrer();
    updatePdpCategoryNav();
    renderCrossSellForCurrentPage();
  }

  // ─── Public API ────────────────────────────────────────────────

  window.Breadcrumb = {
    goBack: function () {
      var referrer = sessionStorage.getItem("pdp_referrer");
      if (
        referrer &&
        window.location.pathname.indexOf("/products/") === 0 &&
        !/stirfry|cutting|frying|stewing|steaming|other|compare/.test(
          window.location.pathname.replace("/products/", "")
        )
      ) {
        if (window.SpaRouter && typeof window.SpaRouter.navigate === "function") {
          window.SpaRouter.navigate(referrer);
        } else {
          window.location.href = referrer;
        }
      } else {
        window.history.back();
      }
    },
    SLUG_TO_CATEGORY_KEY: {},
    CATEGORY_KEY_TO_SLUG: CATEGORY_KEY_TO_SLUG,
    PRODUCT_SLUGS: PRODUCT_SLUGS,
  };

  // ─── Public API: allow external category control (e.g. /products/all/ Tab switching) ──
  window.CrossSell = {
    setCategory: function (slug) {
      _externalSlug = slug;
      renderCrossSellForCurrentPage(slug);
    },
    clearCategory: function () {
      _externalSlug = null;
      var cc = document.getElementById("cross-sell-container");
      var sc = document.getElementById("scene-entry-container");
      if (cc) cc.innerHTML = "";
      if (sc) sc.innerHTML = "";
    },
  };

  // Initial render
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // SPA navigation — always registered, always re-renders for category pages
  _spaOn(document, "spa:load", function () {
    trackPdpReferrer();
    updatePdpCategoryNav();
    renderCrossSellForCurrentPage();
  });
})();
