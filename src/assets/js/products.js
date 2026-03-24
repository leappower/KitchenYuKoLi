// products.js - Product data, filtering, rendering
// IIFE wrapper for src2 (no build tools)
// Depends on: window.MediaQueries, window.CommonUtils, window.AppUtils, window.smartPopup
// Outputs: window.Products (+ individual functions on window for HTML access)

(function (global) {
  "use strict";

  // ─── Fallbacks ─────────────────────────────────────────────────────────────
  function getMq() {
    return global.MediaQueries || {};
  }

  /**
   * 返回可用的 debounce 实现。
   * 优先使用 CommonUtils.debounce（common.js 权威实现），
   * 否则内联最小 fallback，避免硬依赖加载顺序。
   */
  function getDebounce() {
    if (global.CommonUtils && typeof global.CommonUtils.debounce === "function") {
      return global.CommonUtils.debounce;
    }
    return function debounce(func, wait) {
      var timeout;
      return function () {
        var context = this,
          args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function () {
          func.apply(context, args);
        }, wait);
      };
    };
  }

  // ─── i18n helpers ──────────────────────────────────────────────────────────
  /**
   * 翻译辅助函数。代理至 CommonUtils.tr（权威实现在 common.js）。
   * Fallback：CommonUtils 未加载时直接调用 window.t，再降级返回 fallback。
   */
  function tr(key, fallback) {
    if (global.CommonUtils && typeof global.CommonUtils.tr === "function") {
      return global.CommonUtils.tr(key, fallback);
    }
    var value = typeof global.t === "function" ? global.t(key) : key;
    return value && value !== key ? value : fallback;
  }

  /**
   * 产品分类名 → i18n key。
   * 代理至 AppUtils.getCategoryI18nKey（权威实现在 utils.js）。
   * Fallback：AppUtils 未加载时直接拼接 'filter_' + category。
   */
  function getCategoryI18nKey(category) {
    var utils = getAppUtils();
    if (utils && typeof utils.getCategoryI18nKey === "function") {
      return utils.getCategoryI18nKey(category);
    }
    return "filter_" + category;
  }

  // ─── AppUtils accessor ─────────────────────────────────────────────────────
  function getAppUtils() {
    return global.AppUtils || null;
  }

  function resolveImage(imageKey) {
    var utils = getAppUtils();
    return utils ? utils.resolveImage(imageKey) : "";
  }

  // ─── State ─────────────────────────────────────────────────────────────────
  var products = [];
  var currentPage = 1;
  var currentFilter = "";
  var productFilterSwipeHintBound = false;
  var productRenderRafId = 0;
  var filterBarRendered = false;
  var lastItemsPerPage = 0;

  var _mobileCtrlFadeTimer = null;
  var _mobileCtrlTouchHandler = null;
  var _mobileCtrlTouchEndHandler = null;
  var _mobileCtrlCenterRevealHandler = null;
  var _mobileCtrlCenterRevealRaf = 0;

  // ─── Product data ──────────────────────────────────────────────────────────
  function getProducts() {
    if (products.length > 0) return products;
    var utils = getAppUtils();
    if (!utils) return [];
    products = utils.buildProductCatalog();
    return products;
  }

  // ─── Items per page ────────────────────────────────────────────────────────
  function getItemsPerPage() {
    var mq = getMq();
    if (mq.mqMobileSmall) return 3;
    if (mq.mqDesktop) return 8;
    if (mq.mqTablet) return 9;
    return 4;
  }

  function isMobileProductCarousel() {
    return getMq().mqMobileSmall;
  }

  // ─── Schedule render ───────────────────────────────────────────────────────
  function scheduleRenderProducts() {
    if (productRenderRafId) return;
    productRenderRafId = global.requestAnimationFrame(function () {
      productRenderRafId = 0;
      renderProducts();
    });
  }

  // ─── Mobile product step width ─────────────────────────────────────────────
  function getMobileProductStepWidth() {
    var grid = document.getElementById("product-grid");
    if (!grid) return 280;
    var firstCard = grid.querySelector(".product-card");
    if (!firstCard) return Math.max(240, Math.floor(grid.clientWidth * 0.82));
    var cardStyles = global.getComputedStyle(firstCard);
    var cardWidth = firstCard.getBoundingClientRect().width;
    var cardMarginRight = parseFloat(cardStyles.marginRight || "0") || 0;
    return Math.max(220, Math.round(cardWidth + cardMarginRight + 14));
  }

  // ─── Mobile nav state ──────────────────────────────────────────────────────
  function updateMobileProductNavState() {
    if (!isMobileProductCarousel()) return;
    var grid = document.getElementById("product-grid");
    var prevBtn = document.getElementById("product-mobile-prev");
    var nextBtn = document.getElementById("product-mobile-next");
    if (!grid || !prevBtn || !nextBtn) return;
    var maxScrollLeft = Math.max(0, grid.scrollWidth - grid.clientWidth);
    var canScroll = maxScrollLeft > 8;
    var atStart = grid.scrollLeft <= 8;
    var atEnd = grid.scrollLeft >= maxScrollLeft - 8;
    prevBtn.disabled = !canScroll || atStart;
    nextBtn.disabled = !canScroll || atEnd;
    prevBtn.classList.toggle("is-disabled", prevBtn.disabled);
    nextBtn.classList.toggle("is-disabled", nextBtn.disabled);
  }

  // ─── Product grid shell ────────────────────────────────────────────────────
  function ensureProductGridShell(grid) {
    var shell = document.getElementById("product-grid-shell");
    if (shell) return shell;
    shell = document.createElement("div");
    shell.id = "product-grid-shell";
    shell.className = "product-grid-mobile-shell";
    grid.parentNode.insertBefore(shell, grid);
    shell.appendChild(grid);
    return shell;
  }

  // ─── Mobile controls fade timer ───────────────────────────────────────────
  function resetMobileCtrlFadeTimer() {
    var controls = document.getElementById("product-grid-mobile-controls");
    if (!controls || controls.classList.contains("is-hidden")) return;
    controls.classList.remove("is-faded");
    if (_mobileCtrlFadeTimer) clearTimeout(_mobileCtrlFadeTimer);
    _mobileCtrlFadeTimer = setTimeout(function () {
      var c = document.getElementById("product-grid-mobile-controls");
      if (c) c.classList.add("is-faded");
    }, 1400);
  }

  function revealMobileControlsOnCenteredCard() {
    if (!isMobileProductCarousel()) return;
    var grid = document.getElementById("product-grid");
    var controls = document.getElementById("product-grid-mobile-controls");
    if (!grid || !controls || controls.classList.contains("is-hidden")) return;
    var cards = grid.querySelectorAll(".product-card");
    if (!cards || cards.length === 0) return;
    var gridRect = grid.getBoundingClientRect();
    var viewportCenterX = gridRect.left + gridRect.width / 2;
    var nearestDist = Number.POSITIVE_INFINITY;
    var nearestCardWidth = 0;
    cards.forEach(function (card) {
      var rect = card.getBoundingClientRect();
      var cardCenterX = rect.left + rect.width / 2;
      var dist = Math.abs(cardCenterX - viewportCenterX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestCardWidth = rect.width;
      }
    });
    var centerThreshold = Math.max(24, nearestCardWidth * 0.16);
    if (nearestDist <= centerThreshold) resetMobileCtrlFadeTimer();
  }

  function renderMobileProductSideControls(showControls, disableControls) {
    var grid = document.getElementById("product-grid");
    if (!grid) return;
    var shell = ensureProductGridShell(grid);
    var controls = document.getElementById("product-grid-mobile-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.id = "product-grid-mobile-controls";
      controls.className = "product-grid-mobile-controls is-hidden";
      shell.appendChild(controls);
    }
    if (!showControls) {
      if (_mobileCtrlFadeTimer) {
        clearTimeout(_mobileCtrlFadeTimer);
        _mobileCtrlFadeTimer = null;
      }
      controls.classList.add("is-hidden");
      controls.classList.remove("is-faded");
      controls.innerHTML = "";
      return;
    }
    controls.classList.remove("is-hidden", "is-faded");
    controls.innerHTML = [
      '<button type="button" id="product-mobile-prev"',
      ' class="product-side-nav-btn product-side-nav-btn-prev ios-nav-btn ' +
        (disableControls ? "is-disabled" : "") +
        '"',
      disableControls ? " disabled" : "",
      ' aria-label="' + tr("product_prev_page", "Previous page") + '">',
      '<span class="material-symbols-outlined" aria-hidden="true">keyboard_arrow_left</span>',
      "</button>",
      '<button type="button" id="product-mobile-next"',
      ' class="product-side-nav-btn product-side-nav-btn-next ios-nav-btn ' +
        (disableControls ? "is-disabled" : "") +
        '"',
      disableControls ? " disabled" : "",
      ' aria-label="' + tr("product_next_page", "Next page") + '">',
      '<span class="material-symbols-outlined" aria-hidden="true">keyboard_arrow_right</span>',
      "</button>",
    ].join("");
    var prevBtn = controls.querySelector("#product-mobile-prev");
    var nextBtn = controls.querySelector("#product-mobile-next");
    if (prevBtn)
      prevBtn.addEventListener("click", function () {
        scrollMobileProducts(-1);
      });
    if (nextBtn)
      nextBtn.addEventListener("click", function () {
        scrollMobileProducts(1);
      });
    resetMobileCtrlFadeTimer();
  }

  function scrollMobileProducts(direction) {
    if (!isMobileProductCarousel()) {
      goToPage(currentPage + direction);
      return;
    }
    var grid = document.getElementById("product-grid");
    if (!grid) return;
    var stepWidth = getMobileProductStepWidth();
    grid.scrollBy({ left: direction * stepWidth, behavior: "smooth" });
    global.setTimeout(updateMobileProductNavState, 220);
  }

  lastItemsPerPage = getItemsPerPage();
  global.addEventListener(
    "resize",
    getDebounce()(function () {
      var nextItemsPerPage = getItemsPerPage();
      if (nextItemsPerPage !== lastItemsPerPage) {
        lastItemsPerPage = nextItemsPerPage;
        scheduleRenderProducts();
      }
    }, 150)
  );

  // ─── Filter swipe hint ────────────────────────────────────────────────────
  function updateProductFilterSwipeHint() {
    var filterBar = document.getElementById("product-filter-bar");
    var hint = document.getElementById("product-filter-swipe-hint");
    if (!filterBar || !hint) return;
    var isMobile = getMq().mqMobile;
    var canScroll = filterBar.scrollWidth - filterBar.clientWidth > 8;
    var scrolledToEnd = filterBar.scrollLeft + filterBar.clientWidth >= filterBar.scrollWidth - 8;
    var shouldShow = isMobile && canScroll && !scrolledToEnd;
    hint.classList.toggle("is-hidden", !shouldShow);
  }

  function setupProductFilterSwipeHint() {
    if (productFilterSwipeHintBound) return;
    var filterBar = document.getElementById("product-filter-bar");
    if (!filterBar) return;
    filterBar.addEventListener("scroll", updateProductFilterSwipeHint, { passive: true });
    global.addEventListener("resize", getDebounce()(updateProductFilterSwipeHint, 150));
    var hint = document.getElementById("product-filter-swipe-hint");
    if (hint) {
      hint.addEventListener("click", function () {
        filterBar.scrollBy({ left: 120, behavior: "smooth" });
      });
    }
    productFilterSwipeHintBound = true;
  }

  // ─── Filter button state ──────────────────────────────────────────────────
  function updateProductFilterButtonState(activeFilter) {
    document.querySelectorAll("#product-filter-bar .filter-btn").forEach(function (btn) {
      var isActive = btn.getAttribute("data-filter") === activeFilter;
      btn.setAttribute("data-active", isActive ? "true" : "false");
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      if (isActive) {
        btn.classList.remove("bg-white", "dark:bg-slate-800", "text-slate-700", "dark:text-slate-300");
        btn.classList.add("bg-primary", "text-white");
      } else {
        btn.classList.add("bg-white", "dark:bg-slate-800", "text-slate-700", "dark:text-slate-300");
        btn.classList.remove("bg-primary", "text-white");
      }
    });
  }

  function filterProducts(filter) {
    currentFilter = filter;
    currentPage = 1;
    updateProductFilterButtonState(filter);
    scheduleRenderProducts();
  }

  // ─── i18n field helper ────────────────────────────────────────────────────
  function getProductI18nField(product, field, fallback) {
    if (fallback === undefined) fallback = "";
    var id = product && product.i18nId;
    if (id) {
      var key = id + "_" + field;
      var translated = tr(key);
      if (translated && translated !== key) return translated;
      // Log miss only for 'name' field to avoid noise
      if (field === "name") {
        // intentionally left blank — no-op for missing translations
      }
    }
    return fallback;
  }

  // ─── Render filter bar ────────────────────────────────────────────────────
  function renderProductFilters() {
    var filterBar = document.getElementById("product-filter-bar");
    if (!filterBar) return "";
    var utils = getAppUtils();
    var seriesFilters = utils ? utils.getSeriesFilters() : [];
    var defaultFilter = (seriesFilters[0] && seriesFilters[0].key) || "";
    filterBar.innerHTML = seriesFilters
      .map(function (sf) {
        var key = sf.key,
          filterKey = sf.filterKey;
        var isActive = key === currentFilter || (!currentFilter && key === defaultFilter);
        var baseClass = "filter-btn px-5 py-2 rounded-full text-sm font-bold transition-all";
        var stateClass = isActive
          ? "bg-primary text-white"
          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700";
        var label = tr(filterKey, key);
        return (
          '<button class="' +
          baseClass +
          " " +
          stateClass +
          '" data-i18n="' +
          filterKey +
          '" data-filter="' +
          key +
          '" data-active="' +
          (isActive ? "true" : "false") +
          '" aria-pressed="' +
          (isActive ? "true" : "false") +
          '">' +
          label +
          "</button>"
        );
      })
      .join("");
    setupProductFilterSwipeHint();
    updateProductFilterSwipeHint();
    return defaultFilter;
  }

  // ─── Init filter bar & products ───────────────────────────────────────────
  function initFilterBarAndProducts() {
    if (filterBarRendered) return;
    filterBarRendered = true;
    var utils = getAppUtils();
    if (utils) utils.applyImageAssets();
    currentFilter = renderProductFilters();
    scheduleRenderProducts();
  }

  // ─── Render products ──────────────────────────────────────────────────────
  function renderProducts() {
    var grid = document.getElementById("product-grid");
    if (!grid) return;

    var meta = document.getElementById("product-grid-meta");
    if (!meta) {
      meta = document.createElement("div");
      meta.id = "product-grid-meta";
      meta.className =
        "mb-4 rounded-xl border border-primary/10 bg-white/80 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 product-grid-meta";
      grid.parentNode.insertBefore(meta, grid);
    }

    var allProducts = getProducts();
    var filtered = currentFilter
      ? allProducts.filter(function (p) {
          return p.category === currentFilter;
        })
      : allProducts;
    var orderedProducts = filtered;
    // Diagnostic: check how many products get a translated name on this render pass
    if (orderedProducts.length > 0) {
      var _lang = window.translationManager ? window.translationManager.currentLanguage : "unknown";
    }
    var mobileCarousel = isMobileProductCarousel();
    var itemsPerPage = mobileCarousel ? Math.max(1, orderedProducts.length) : getItemsPerPage();
    var totalPages = Math.max(1, Math.ceil(orderedProducts.length / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;
    var start = (currentPage - 1) * itemsPerPage;
    var pageProducts = orderedProducts.slice(start, start + itemsPerPage);
    var from = orderedProducts.length === 0 ? 0 : start + 1;
    var to = orderedProducts.length === 0 ? 0 : Math.min(start + pageProducts.length, orderedProducts.length);
    var currentPageCount = pageProducts.length;
    var prevDisabled = currentPage <= 1;
    var nextDisabled = currentPage >= totalPages;

    meta.innerHTML = [
      '<div class="lg:flex lg:items-center lg:justify-between lg:gap-4">',
      '<div class="flex w-full items-center justify-between gap-3 overflow-x-auto whitespace-nowrap px-1 pb-1 sm:justify-center sm:px-0 sm:pb-0 lg:flex-1 lg:justify-start lg:pb-0">',
      '<span class="shrink-0">' +
        tr("product_label_series", "Series") +
        ": <strong>" +
        (currentFilter ? tr(getCategoryI18nKey(currentFilter), currentFilter) : tr("all", "All")) +
        "</strong></span>",
      '<span class="hidden shrink-0 sm:inline">' +
        tr("product_label_page", "Page") +
        ": <strong>" +
        currentPage +
        "/" +
        totalPages +
        "</strong></span>",
      '<span class="hidden shrink-0 sm:inline">' +
        tr("product_label_results", "Results") +
        ": <strong>" +
        currentPageCount +
        "</strong> / " +
        orderedProducts.length +
        "</span>",
      "</div>",
      '<div class="mt-2 hidden w-full grid-cols-2 gap-2 product-meta-nav sm:mt-1 sm:flex sm:w-auto sm:grid-cols-none sm:gap-2 sm:justify-end lg:mt-0 lg:ml-4 lg:shrink-0">',
      '<button type="button" data-page="' +
        (currentPage - 1) +
        '" class="product-meta-nav-btn ios-nav-btn w-full justify-start ' +
        (prevDisabled ? "is-disabled" : "") +
        ' sm:w-auto sm:justify-center" ' +
        (prevDisabled ? "disabled" : "") +
        ' aria-label="' +
        tr("product_prev_page", "Previous page") +
        '">',
      '<span class="product-meta-nav-icon material-symbols-outlined" aria-hidden="true">keyboard_arrow_left</span>',
      '<span class="product-meta-nav-label">' + tr("product_prev_page", "Previous") + "</span>",
      "</button>",
      '<button type="button" data-page="' +
        (currentPage + 1) +
        '" class="product-meta-nav-btn ios-nav-btn w-full justify-end ' +
        (nextDisabled ? "is-disabled" : "") +
        ' sm:w-auto sm:justify-center" ' +
        (nextDisabled ? "disabled" : "") +
        ' aria-label="' +
        tr("product_next_page", "Next page") +
        '">',
      '<span class="product-meta-nav-label">' + tr("product_next_page", "Next") + "</span>",
      '<span class="product-meta-nav-icon material-symbols-outlined" aria-hidden="true">keyboard_arrow_right</span>',
      "</button>",
      "</div></div>",
    ].join("");

    meta.querySelectorAll(".product-meta-nav-btn[data-page]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        goToPage(Number(btn.dataset.page));
      });
    });

    if (orderedProducts.length === 0) {
      grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8";
      renderMobileProductSideControls(false);
      grid.innerHTML = [
        '<div class="col-span-full rounded-2xl border border-dashed border-primary/30 bg-white/70 dark:bg-slate-900/60 p-10 text-center">',
        '<span class="material-symbols-outlined text-4xl text-primary/70">inventory_2</span>',
        '<p class="mt-3 text-base font-bold text-primary dark:text-slate-100">' +
          tr("product_empty_title", "No matching products found") +
          "</p>",
        '<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">' +
          tr("product_empty_desc", "Try another series filter or contact us for custom recommendation.") +
          "</p>",
        "</div>",
      ].join("");
      renderPagination(1);
      return;
    }

    grid.innerHTML = pageProducts
      .map(function (p) {
        var displayName =
          getProductI18nField(p, "name", p.name) ||
          (tr(getCategoryI18nKey(p.category), p.category) + " " + (p.model || "")).trim();
        var badgeColorClass = p.badgeColor || "bg-primary";
        var material = getProductI18nField(p, "material", p.material);
        var minimumOrderQuantity = getProductI18nField(p, "minimumOrderQuantity", p.minimumOrderQuantity);
        var throughput = getProductI18nField(p, "throughput", p.throughput);
        var voltage = getProductI18nField(p, "voltage", p.voltage);
        var frequency = getProductI18nField(p, "frequency", p.frequency);
        var badge = getProductI18nField(p, "badge", p.badge);
        var status = getProductI18nField(p, "status", p.status);
        var imageRecognitionKey = p.imageRecognitionKey;
        var launchDate = getProductI18nField(p, "launchTime", p.launchTime) || p.launchDate;
        var scene = getProductI18nField(p, "scenarios", p.scenarios);
        return [
          '<article class="product-card flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-primary/10 group" data-category="' +
            p.category +
            '">',
          '<div class="relative h-[200px] sm:h-[210px] lg:h-[230px] w-full overflow-hidden bg-slate-50 dark:bg-slate-800/60 shrink-0">',
          '<img data-src="' + (p.productImage || resolveImage(imageRecognitionKey)) + '"',
          " src=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E\"",
          ' alt="' + displayName + '" loading="lazy" decoding="async"',
          ' class="w-full h-full object-contain p-4 group-hover:scale-[1.03] transition-transform duration-500 lazy-img">',
          badge
            ? '<span class="absolute top-2 left-2 ' +
              badgeColorClass +
              ' text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow">' +
              badge +
              "</span>"
            : "",
          status
            ? '<span class="absolute top-2 right-2 bg-slate-900/80 text-white px-2 py-0.5 rounded-full text-[10px]">' +
              status +
              "</span>"
            : "",
          "</div>",
          '<div class="p-3 flex flex-col">',
          '<div class="flex items-center justify-between gap-2 mb-1.5 shrink-0">',
          '<div class="flex-1 min-w-0"><h3 class="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight line-clamp-2">' +
            displayName +
            "</h3></div>",
          '<div class="shrink-0 w-20 h-full min-h-[36px] flex flex-col items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 py-1 text-center self-stretch">',
          '<p class="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-none mb-0.5">' +
            tr("product_label_model", "Model") +
            "</p>",
          '<p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-none">' +
            (p.model || "-") +
            "</p>",
          "</div></div>",
          '<div class="grid grid-cols-2 gap-1 mb-1.5 shrink-0">',
          '<div class="flex items-center rounded-md bg-slate-50 dark:bg-slate-800/70 p-1 min-w-0"><p class="text-[10px] text-slate-500 dark:text-slate-400 truncate flex-shrink-0">' +
            tr("product_label_capacity_throughput", "Capacity") +
            ':</p><p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex-1 min-w-0 ml-1">' +
            (throughput || "-") +
            "</p></div>",
          '<div class="flex items-center rounded-md bg-slate-50 dark:bg-slate-800/70 p-1 min-w-0"><p class="text-[10px] text-slate-500 dark:text-slate-400 truncate flex-shrink-0">' +
            tr("product_label_voltage_frequency", "Voltage") +
            ':</p><p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex-1 min-w-0 ml-1">' +
            (voltage || frequency ? (voltage || "-") + " / " + (frequency || "-") : "-") +
            "</p></div>",
          '<div class="flex items-center rounded-md bg-slate-50 dark:bg-slate-800/70 p-1 min-w-0"><p class="text-[10px] text-slate-500 dark:text-slate-400 truncate flex-shrink-0">' +
            tr("product_label_min_order_qty", "MOQ") +
            ':</p><p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex-1 min-w-0 ml-1">' +
            tr(minimumOrderQuantity || "-", minimumOrderQuantity || "-") +
            "</p></div>",
          '<div class="flex items-center rounded-md bg-slate-50 dark:bg-slate-800/70 p-1 min-w-0"><p class="text-[10px] text-slate-500 dark:text-slate-400 truncate flex-shrink-0">' +
            tr("product_label_launch_date", "LaunchDate") +
            ':</p><p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex-1 min-w-0 ml-1">' +
            tr(launchDate || "2025", launchDate || "2025") +
            "</p></div>",
          "</div>",
          '<div class="grid grid-cols-1 gap-1 mb-1.5 shrink-0">',
          '<div class="flex items-center rounded-md bg-slate-50 dark:bg-slate-800/70 p-1 min-w-0"><p class="text-[10px] text-slate-500 dark:text-slate-400 truncate flex-shrink-0">' +
            tr("product_label_material", "Material") +
            ':</p><p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex-1 min-w-0 ml-1">' +
            (material || "-") +
            "</p></div>",
          '<div class="flex items-center rounded-md bg-slate-50 dark:bg-slate-800/70 p-1 min-w-0"><p class="text-[10px] text-slate-500 dark:text-slate-400 truncate flex-shrink-0">' +
            tr("product_label_scene", "Scene") +
            ':</p><p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex-1 min-w-0 ml-1">' +
            (scene || "-") +
            "</p></div>",
          "</div>",
          '<div class="mt-auto grid grid-cols-2 gap-1 shrink-0">',
          '<button data-action="show-popup" class="inline-flex h-[36px] items-center justify-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"><span class="material-symbols-outlined text-[10px]">tune</span><span class="truncate">' +
            tr("product_optional_specs", "Optional") +
            "</span></button>",
          '<button data-action="show-popup" class="inline-flex h-[36px] items-center justify-center gap-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-bold text-white hover:bg-primary/90 transition-colors"><span class="material-symbols-outlined text-[10px]">request_page</span><span class="truncate">' +
            tr("product_request", "Request") +
            "</span></button>",
          "</div></div></article>",
        ].join("");
      })
      .join("");

    if (mobileCarousel) {
      grid.className = "product-grid-mobile mb-8";
      renderMobileProductSideControls(true, orderedProducts.length <= 1);
      grid.removeEventListener("scroll", updateMobileProductNavState);
      grid.removeEventListener("scroll", resetMobileCtrlFadeTimer);
      if (_mobileCtrlCenterRevealHandler) grid.removeEventListener("scroll", _mobileCtrlCenterRevealHandler);
      grid.addEventListener("scroll", updateMobileProductNavState, { passive: true });
      grid.addEventListener("scroll", resetMobileCtrlFadeTimer, { passive: true });
      _mobileCtrlCenterRevealHandler = function () {
        if (_mobileCtrlCenterRevealRaf) return;
        _mobileCtrlCenterRevealRaf = global.requestAnimationFrame(function () {
          _mobileCtrlCenterRevealRaf = 0;
          revealMobileControlsOnCenteredCard();
        });
      };
      grid.addEventListener("scroll", _mobileCtrlCenterRevealHandler, { passive: true });
      if (_mobileCtrlTouchHandler) grid.removeEventListener("touchstart", _mobileCtrlTouchHandler);
      if (_mobileCtrlTouchEndHandler) grid.removeEventListener("touchend", _mobileCtrlTouchEndHandler);
      _mobileCtrlTouchHandler = function () {
        resetMobileCtrlFadeTimer();
      };
      _mobileCtrlTouchEndHandler = function () {
        global.setTimeout(function () {
          updateMobileProductNavState();
          revealMobileControlsOnCenteredCard();
          resetMobileCtrlFadeTimer();
        }, 100);
      };
      grid.addEventListener("touchstart", _mobileCtrlTouchHandler, { passive: true });
      grid.addEventListener("touchend", _mobileCtrlTouchEndHandler, { passive: true });
      global.setTimeout(updateMobileProductNavState, 30);
    } else {
      grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8";
      renderMobileProductSideControls(false);
      grid.removeEventListener("scroll", updateMobileProductNavState);
      grid.removeEventListener("scroll", resetMobileCtrlFadeTimer);
      if (_mobileCtrlCenterRevealHandler) {
        grid.removeEventListener("scroll", _mobileCtrlCenterRevealHandler);
        _mobileCtrlCenterRevealHandler = null;
      }
      if (_mobileCtrlCenterRevealRaf) {
        global.cancelAnimationFrame(_mobileCtrlCenterRevealRaf);
        _mobileCtrlCenterRevealRaf = 0;
      }
      if (_mobileCtrlTouchHandler) {
        grid.removeEventListener("touchstart", _mobileCtrlTouchHandler);
        _mobileCtrlTouchHandler = null;
      }
      if (_mobileCtrlTouchEndHandler) {
        grid.removeEventListener("touchend", _mobileCtrlTouchEndHandler);
        _mobileCtrlTouchEndHandler = null;
      }
    }

    renderPagination(totalPages, {
      totalCount: orderedProducts.length,
      from: from,
      to: to,
      currentPageCount: currentPageCount,
    });

    grid.querySelectorAll('[data-action="show-popup"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (global.smartPopup && typeof global.smartPopup.showPopup === "function") {
          global.smartPopup.showPopup("manual-click", { manual: true });
        }
      });
    });
    var filterBar = document.getElementById("product-filter-bar");
    if (filterBar) {
      filterBar.querySelectorAll("button[data-filter]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          filterProducts(btn.dataset.filter);
        });
      });
    }
  }

  // ─── Render pagination ────────────────────────────────────────────────────
  function renderPagination(totalPages, pageStats) {
    var pagination = document.getElementById("pagination");
    if (!pagination) return;
    if (isMobileProductCarousel()) {
      pagination.innerHTML = "";
      return;
    }
    if (totalPages <= 1) {
      pagination.innerHTML = "";
      return;
    }

    var allCount =
      pageStats && isFinite(pageStats.totalCount)
        ? pageStats.totalCount
        : currentFilter
          ? getProducts().filter(function (p) {
              return p.category === currentFilter;
            }).length
          : getProducts().length;
    var itemsPerPage = getItemsPerPage();
    var fallbackFrom = (currentPage - 1) * itemsPerPage + 1;
    var fallbackTo = Math.min(currentPage * itemsPerPage, allCount);
    var from = pageStats && isFinite(pageStats.from) ? pageStats.from : fallbackFrom;
    var to = pageStats && isFinite(pageStats.to) ? pageStats.to : fallbackTo;
    var currentPageCount =
      pageStats && isFinite(pageStats.currentPageCount) ? pageStats.currentPageCount : Math.max(0, to - from + 1);

    var html = "";
    html +=
      '<div class="w-full mb-2 text-center text-xs text-slate-500 dark:text-slate-400">' +
      tr("product_pagination_summary", "Showing") +
      " " +
      currentPageCount +
      " " +
      tr("product_pagination_of", "of") +
      " " +
      allCount +
      " · " +
      tr("product_label_page", "Page") +
      " " +
      currentPage +
      "/" +
      totalPages +
      "</div>";
    html +=
      '<button data-page="' +
      (currentPage - 1) +
      '" class="pagination-btn inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm ' +
      (currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-200 dark:hover:bg-slate-700") +
      '" ' +
      (currentPage === 1 ? "disabled" : "") +
      '><span class="material-symbols-outlined text-lg">chevron_left</span><span>' +
      tr("product_prev_page", "Previous") +
      "</span></button>";
    for (var i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        html +=
          '<button data-page="' +
          i +
          '" class="pagination-btn px-4 py-2 rounded-lg text-sm font-medium ' +
          (i === currentPage ? "bg-primary text-white" : "hover:bg-slate-200 dark:hover:bg-slate-700") +
          '">' +
          i +
          "</button>";
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        html += '<span class="px-2">...</span>';
      }
    }
    html +=
      '<button data-page="' +
      (currentPage + 1) +
      '" class="pagination-btn inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm ' +
      (currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-200 dark:hover:bg-slate-700") +
      '" ' +
      (currentPage === totalPages ? "disabled" : "") +
      "><span>" +
      tr("product_next_page", "Next") +
      '</span><span class="material-symbols-outlined text-lg">chevron_right</span></button>';
    pagination.innerHTML = html;
    pagination.querySelectorAll(".pagination-btn[data-page]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        goToPage(Number(btn.dataset.page));
      });
    });
  }

  // ─── Go to page ───────────────────────────────────────────────────────────
  function goToPage(page) {
    if (isMobileProductCarousel()) return;
    var allProducts = getProducts();
    var filtered = currentFilter
      ? allProducts.filter(function (p) {
          return p.category === currentFilter;
        })
      : allProducts;
    var itemsPerPage = getItemsPerPage();
    var totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
      scheduleRenderProducts();
      var el = document.getElementById("products");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }

  // ─── Translation event wiring ─────────────────────────────────────────────
  if (global.translationManager) {
    global.translationManager.on("translationsApplied", initFilterBarAndProducts);
  } else {
    global.addEventListener("translationsApplied", initFilterBarAndProducts);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var tmDone = global.translationManager && global.translationManager.isInitialized;
    if (tmDone || !global.translationManager) {
      initFilterBarAndProducts();
      return;
    }
    var translationTimeout = setTimeout(function () {
      if (!filterBarRendered) {
        console.warn("[i18n] translationsApplied not received within 3 s — rendering with fallback data");
        initFilterBarAndProducts();
      }
    }, 3000);
    var clearTranslationTimeout = function () {
      clearTimeout(translationTimeout);
    };
    if (global.translationManager) {
      global.translationManager.on("translationsApplied", clearTranslationTimeout);
    } else {
      global.addEventListener("translationsApplied", clearTranslationTimeout);
    }
  });

  global.addEventListener("languageChanged", function () {
    filterBarRendered = false;
    var defaultFilter = renderProductFilters();
    filterBarRendered = true;
    if (!currentFilter) currentFilter = defaultFilter;
    updateProductFilterButtonState(currentFilter || defaultFilter);
    scheduleRenderProducts();
  });

  global.addEventListener("productTranslationsLoaded", function () {
    scheduleRenderProducts();
  });

  // ─── Expose ───────────────────────────────────────────────────────────────
  global.Products = {
    getProducts: getProducts,
    filterProducts: filterProducts,
    renderProducts: renderProducts,
    renderProductFilters: renderProductFilters,
    initFilterBarAndProducts: initFilterBarAndProducts,
    renderPagination: renderPagination,
    goToPage: goToPage,
    scheduleRenderProducts: scheduleRenderProducts,
    scrollMobileProducts: scrollMobileProducts,
    updateProductFilterButtonState: updateProductFilterButtonState,
    getCategoryI18nKey: getCategoryI18nKey,
  };

  // Direct window bindings for HTML inline calls
  global.filterProducts = filterProducts;
  global.scrollMobileProducts = scrollMobileProducts;
  global.updateProductFilterButtonState = updateProductFilterButtonState;
})(window);
