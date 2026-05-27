/**
 * search-engine.js — Multi-language Product Search Engine
 *
 * Provides a lightweight, debounced search over the full product catalog.
 * Searches across: product name, model number, category, and translated fields.
 * Results are displayed in a floating dropdown panel below the search bar.
 *
 * Dependencies:
 *   - window.AppUtils.buildProductCatalog()
 *   - window.translationManager (for current language + product translations)
 *   - CommonUtils.tr (fallback)
 *
 * Exposes: window.ProductSearchEngine
 */

(function (_global) {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (key == null) key = evt + ":" + (++_spaRegs.__k || (_spaRegs.__k = 1));
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Fallback tr() if CommonUtils is not loaded yet */
  function tr(key, fallback) {
    if (window.CommonUtils && typeof window.CommonUtils.tr === "function") {
      return window.CommonUtils.tr(key, fallback);
    }
    var v = typeof window.t === "function" ? window.t(key) : key;
    return v && v !== key ? v : fallback;
  }

  /** Simple debounce */
  function debounce(fn, ms) {
    ms = ms || 250;
    var timer;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, ms);
    };
  }

  /** HTML-escape a string */
  function esc(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ─── State ────────────────────────────────────────────────────────────────

  var panel = null; // DOM reference to results panel
  var isOpen = false;
  var currentQuery = "";
  var highlightedIndex = -1;
  var resultItems = []; // array of product objects in current results

  // ─── Search Logic ─────────────────────────────────────────────────────────

  /**
   * Build an enhanced product array with translated names for the current language.
   * Each product gets an additional `_searchName` field combining all searchable fields.
   */
  function buildSearchableProducts() {
    // Use product-data-table.js (146 products) instead of static series
    var table = window.PRODUCT_DATA_TABLE || [];
    var catI18n = {
      翻炒系列: "nav_products_stirfry",
      炖煮系列: "nav_products_stewing",
      蒸煮系列: "nav_products_steaming",
      煎炸系列: "nav_products_frying",
      切配系列: "nav_products_cutting",
      辅助系列: "nav_products_other",
    };
    return table.map(function (p) {
      var model = p.model || "";
      var name = p.name || model;
      var category = p.category || "";
      var catKey = catI18n[category] || "filter_" + category;
      var translatedCategory = tr(catKey, category) || category;
      // Priority: PDT embedded translation (nameEn) > tr() > fallback to Chinese name
      var lang =
        (typeof window.translationManager !== "undefined" && window.translationManager.currentLanguage) || "zh-CN";
      var suffix =
        lang.charAt(0).toUpperCase() +
        lang.slice(1).replace(/-([a-z])/g, function (m, c) {
          return c.toUpperCase();
        });
      var translatedName = (lang !== "zh-CN" && p["name" + suffix]) || "";
      if (!translatedName) {
        var trKey = "product_" + model.toLowerCase().replace(/[-/]/g, "_") + "_name";
        translatedName = tr(trKey, name || model) || name || model;
      }
      var imgSrc = "";
      if (p.images && p.images.length > 0) {
        var primary =
          p.images.find(function (i) {
            return i.isPrimary;
          }) || p.images[0];
        if (primary && primary.filePath) imgSrc = primary.filePath;
      }
      if (!imgSrc) imgSrc = "/assets/images/products/" + model + "-1.webp";
      return Object.assign({}, p, {
        _displayName: translatedName,
        _displayCategory: translatedCategory,
        _searchText: [
          translatedName || name,
          name, // always include Chinese name for cross-language search
          p.nameEn || "", // always include English name
          model,
          translatedCategory || category,
          category,
          p.specifications || "",
          p.specificationsEn || "",
          p.throughput || "",
          p.voltage || "",
          p.power || "",
          p.material || "",
          p.scenarios || "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
        productImage: imgSrc,
        imageUrl: imgSrc,
        // navigator.js renderResults 期望的字段
        type: "product",
        labelKey: "search_type_product",
        labelFallback: "产品",
        path: "/products/" + encodeURIComponent(model) + "/",
        title: translatedName,
        snippet: (translatedCategory || category) + " · " + model,
        category: tr("search_type_product", "产品"),
      });
    });
  }

  // ─── Page search index ────────────────────────────────────────────────

  var _pageIndex = null; // cached

  function getPageIndex() {
    if (_pageIndex) return _pageIndex;
    // Try pre-loaded (SSG inlined)
    if (window.__SEARCH_INDEX) {
      _pageIndex = window.__SEARCH_INDEX;
      return _pageIndex;
    }
    // Fallback: fetch search-index.json
    return _pageIndex;
  }

  function buildSearchablePages() {
    var index = getPageIndex();
    if (!index || !index.length) return [];
    return index.map(function (e) {
      // Determine display title based on current language
      var lang =
        (typeof window.translationManager !== "undefined" && window.translationManager.currentLanguage) || "zh-CN";
      var displayTitle = (lang !== "zh-CN" && e.titleEn) || e.title || "";
      var displaySnippet = (lang !== "zh-CN" && e.snippetEn) || e.snippet || "";
      // Searchable text includes BOTH Chinese and English for cross-language search
      return {
        type: e.type || "page",
        labelKey: e.labelKey || "search_type_page",
        labelFallback: e.labelFallback || "Page",
        path: e.path,
        title: displayTitle,
        snippet: displaySnippet,
        _searchText: [
          e.title,
          e.titleEn || "",
          e.snippet,
          e.snippetEn || "",
          e.keywords || "",
          e.keywordsEn || "",
          e.labelFallback || "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
        category: tr(e.labelKey, e.labelFallback) || e.labelFallback || "",
      };
    });
  }

  // Lazy-load page index on first search
  function ensurePageIndex() {
    if (_pageIndex) return Promise.resolve(_pageIndex);
    if (window.__SEARCH_INDEX) {
      _pageIndex = window.__SEARCH_INDEX;
      return Promise.resolve(_pageIndex);
    }
    return fetch("/search-index.json")
      .then(function (r) {
        return r.ok ? r.json() : [];
      })
      .then(function (data) {
        _pageIndex = data;
        return data;
      })
      .catch(function () {
        _pageIndex = [];
        return [];
      });
  }

  /**
   * Perform the actual search across products AND pages.
   * @param {string} query - The search query
   * @returns {Array} Matching items (max 8), mixed products and pages
   */
  function doSearch(query) {
    if (!query || query.length < 1) return [];

    var q = query.toLowerCase().trim();
    var tokens = q
      .replace(/\//g, " ")
      .split(/[\s,，、-]+/)
      .filter(Boolean);

    // CJK 双字符滑动窗口分词：对每个非纯空白 token 做双字切分
    var cjkTokens = [];
    for (var t = 0; t < tokens.length; t++) {
      var token = tokens[t];
      // 如果 token 长度 >= 2 且包含 CJK 字符，生成双字滑动窗口
      if (token.length >= 2) {
        for (var i = 0; i < token.length - 1; i++) {
          var bigram = token.substring(i, i + 2);
          // 只加纯 CJK 或不含英语字母的双字
          if (/[\u4e00-\u9fff]/.test(bigram) || /[^\u4e00-\u9fff]/.test(q)) {
            cjkTokens.push(bigram);
          }
        }
      }
    }
    // 去重
    var seenBigram = {};
    for (t = 0; t < cjkTokens.length; t++) {
      if (!seenBigram[cjkTokens[t]]) {
        seenBigram[cjkTokens[t]] = true;
        tokens.push(cjkTokens[t]);
      }
    }

    var allItems = buildSearchableProducts().concat(buildSearchablePages());
    var results = [];
    var seen = {};

    for (i = 0; i < allItems.length && results.length < 20; i++) {
      var p = allItems[i];
      if (p.isActive === false) continue;

      // Deduplicate by path (pages) or model (products)
      var dedupKey = p.path || p.model;
      if (dedupKey && seen[dedupKey]) continue;
      if (dedupKey) seen[dedupKey] = true;

      var text = p._searchText;
      var score = 0;
      var matched = false;

      for (t = 0; t < tokens.length; t++) {
        token = tokens[t];
        var idx = text.indexOf(token);
        if (idx === -1) {
          matched = false;
          break;
        }
        matched = true;
        if (p.model && p.model.toLowerCase() === token) score += 100;
        else if (p.model && p.model.toLowerCase().indexOf(token) === 0) score += 50;
        else if (p.title && p.title.toLowerCase().indexOf(token) === 0) score += 40;
        else if (p._displayName && p._displayName.toLowerCase().indexOf(token) === 0) score += 30;
        else score += 10;
        score -= Math.floor(idx / 50);
      }

      if (matched) {
        p._score = score;
        results.push(p);
      }
    }

    results.sort(function (a, b) {
      return (b._score || 0) - (a._score || 0);
    });
    return results.slice(0, 8);
  }

  // ─── UI Rendering ─────────────────────────────────────────────────────────

  function createPanel() {
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "ios-search-results";
    panel.className = "ios-search-results";
    panel.setAttribute("role", "listbox");
    panel.setAttribute("aria-label", "Search results");
    document.body.appendChild(panel);

    // Close on click outside
    document.addEventListener("mousedown", function (e) {
      if (panel && !panel.contains(e.target)) {
        var bar = document.querySelector(".ios-search-bar");
        if (!bar || !bar.contains(e.target)) {
          hidePanel();
        }
      }
    });

    return panel;
  }

  function showPanel() {
    if (!panel) createPanel();
    if (isOpen) return;
    isOpen = true;
    panel.style.display = "block";
    panel.classList.add("is-visible");

    // Position below search bar
    positionPanel();
  }

  function hidePanel() {
    if (!panel || !isOpen) return;
    isOpen = false;
    highlightedIndex = -1;
    panel.style.display = "none";
    panel.classList.remove("is-visible");
  }

  function positionPanel() {
    var bar = document.querySelector(".ios-search-bar");
    if (!bar || !panel) return;

    var rect = bar.getBoundingClientRect();
    var isRTL = document.documentElement.dir === "rtl";

    panel.style.position = "fixed";
    panel.style.top = rect.bottom + 6 + "px";
    panel.style.zIndex = "9998";

    var panelWidth = Math.max(rect.width, 320);
    var vpWidth = window.innerWidth;

    if (isRTL) {
      panel.style.right = "auto";
      panel.style.left = rect.left + "px";
    } else {
      // Align panel right edge to bar right edge, but clamp within viewport
      var rightEdge = rect.right;
      if (rightEdge + 8 > vpWidth) rightEdge = vpWidth - 8;
      panel.style.left = "auto";
      panel.style.right = vpWidth - rightEdge + "px";
    }

    // Ensure panel doesn't overflow left edge
    if (vpWidth - parseFloat(panel.style.right || 0) - panelWidth < 8) {
      panel.style.left = "8px";
      panel.style.right = "auto";
    }

    panel.style.width = panelWidth + "px";
  }

  function renderResults(results, query) {
    if (!panel) createPanel();

    if (!results || results.length === 0) {
      var noResultsText = tr("search_no_results", "No matching products found");
      var hintText = tr("search_hint", "Try searching by model number or product type");
      panel.innerHTML =
        '<div class="ios-search-empty">' +
        '<span class="material-symbols-outlined ios-search-empty-icon">search_off</span>' +
        '<p class="ios-search-empty-title">' +
        esc(noResultsText) +
        "</p>" +
        (query.length >= 2 ? '<p class="ios-search-empty-hint">' + esc(hintText) + "</p>" : "") +
        "</div>";
      showPanel();
      return;
    }

    var countText = tr("search_results_count", "{count} products found").replace("{count}", String(results.length));
    var viewAllText = tr("search_view_all", "View all products");

    var html =
      '<div class="ios-search-header">' + '<span class="ios-search-count">' + esc(countText) + "</span>" + "</div>";

    html += '<div class="ios-search-results-list">';

    for (var i = 0; i < results.length; i++) {
      var p = results[i];
      var idx = i;
      var name = esc(p._displayName || p.model || "");
      var model = esc(p.model || "");
      var category = esc(p._displayCategory || p.category || tr("filter_all", "All"));
      var badge = p._displayBadge ? '<span class="ios-search-badge">' + esc(p._displayBadge) + "</span>" : "";
      var imgSrc = p.productImage || p.imageUrl || "";
      var hlClass = idx === highlightedIndex ? " is-highlighted" : "";

      var detailHref = "/products/" + (p.model ? encodeURIComponent(p.model) + "/" : "");
      html +=
        '<a class="ios-search-result-item' +
        hlClass +
        '" href="' +
        esc(detailHref) +
        '" data-search-idx="' +
        idx +
        '" role="option">' +
        '<div class="ios-search-result-img">' +
        (imgSrc
          ? '<img src="' +
            esc(imgSrc) +
            '" alt="" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">'
          : '<span class="material-symbols-outlined">inventory_2</span>') +
        "</div>" +
        '<div class="ios-search-result-info">' +
        '<div class="ios-search-result-name">' +
        name +
        badge +
        "</div>" +
        '<div class="ios-search-result-meta">' +
        '<span class="ios-search-result-model">' +
        model +
        "</span>" +
        '<span class="ios-search-result-sep">·</span>' +
        '<span class="ios-search-result-category">' +
        category +
        "</span>" +
        "</div>" +
        "</div>" +
        "</a>";
    }

    html += "</div>";

    html +=
      '<a class="ios-search-view-all" href="/products/">' +
      "<span>" +
      esc(viewAllText) +
      "</span>" +
      '<span class="material-symbols-outlined">arrow_forward</span>' +
      "</a>";

    panel.innerHTML = html;

    // Bind click events on result items
    var items = panel.querySelectorAll(".ios-search-result-item");
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener("click", function (e) {
        e.preventDefault();
        var href = this.getAttribute("href");
        console.warn("[search] 点击结果:", href);
        hidePanel();
        if (href) {
          if (window.SpaRouter && window.SpaRouter.navigate) {
            console.warn("[search] SpaRouter.navigate(", href, ")");
            window.SpaRouter.navigate(href);
          } else {
            console.warn("[search] SpaRouter 不可用，window.location.href = ", href);
            window.location.href = href;
          }
        }
      });
    }

    // View all link
    var viewAllLink = panel.querySelector(".ios-search-view-all");
    if (viewAllLink) {
      viewAllLink.addEventListener("click", function (e) {
        e.preventDefault();
        hidePanel();
        console.warn("[search] view-all 点击，导航到 /products/");
        if (window.SpaRouter && window.SpaRouter.navigate) {
          window.SpaRouter.navigate("/products/");
        } else {
          window.location.href = "/products/";
        }
      });
    }

    showPanel();
    resultItems = results;
  }

  function highlightItem(index) {
    var items = panel ? panel.querySelectorAll(".ios-search-result-item") : [];
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle("is-highlighted", i === index);
    }
    highlightedIndex = index;

    // Scroll into view
    if (index >= 0 && items[index]) {
      items[index].scrollIntoView({ block: "nearest" });
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  var debouncedSearch = debounce(function (query) {
    if (query === currentQuery) return;
    currentQuery = query;

    if (!query || query.length < 1) {
      hidePanel();
      return;
    }

    var results = doSearch(query);
    renderResults(results, query);
  }, 200);

  /**
   * Initialize search: bind to the iOS search bar input.
   * Should be called after navigator.js has rendered the search bar.
   */
  function init() {
    // Pre-load page index in background
    ensurePageIndex();

    // Support unified search bar input (.ios-search-input)
    var input = document.querySelector(".ios-search-bar .ios-search-input");
    if (!input) {
      // Navigator may not have mounted yet — defer to end of tick
      // so that navigator.js (loaded later in page) has a chance to render.
      if (!window.__searchInitDeferred) {
        window.__searchInitDeferred = true;
        setTimeout(function () {
          window.__searchInitDeferred = false;
          init();
        }, 0);
      }
      return;
    }

    // Input event
    input.addEventListener("input", function () {
      debouncedSearch(input.value.trim());
    });

    // Focus — show results panel + is-focused style
    input.addEventListener("focus", function () {
      var bar = input.closest && input.closest(".ios-search-bar");
      if (bar) bar.classList.add("is-focused");
      if (currentQuery && currentQuery.length >= 1) {
        showPanel();
      }
    });

    // Blur — remove is-focused
    input.addEventListener("blur", function () {
      var bar = input.closest && input.closest(".ios-search-bar");
      if (bar) bar.classList.remove("is-focused");
    });

    // Keyboard navigation
    input.addEventListener("keydown", function (e) {
      var maxIndex = resultItems.length - 1;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) {
            debouncedSearch(input.value.trim());
            return;
          }
          if (highlightedIndex < maxIndex) {
            highlightItem(highlightedIndex + 1);
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (highlightedIndex > 0) {
            highlightItem(highlightedIndex - 1);
          }
          break;

        case "Enter":
          if (isOpen && highlightedIndex >= 0 && resultItems[highlightedIndex]) {
            e.preventDefault();
            hidePanel();
            // Navigate to products page
            if (window.SpaRouter && window.SpaRouter.navigate) {
              window.SpaRouter.navigate("/products/");
            } else {
              window.location.href = "/products/";
            }
          }
          break;

        case "Escape":
          hidePanel();
          input.blur();
          break;
      }
    });
  }

  /**
   * Re-initialize (e.g. after SPA navigation re-renders the header).
   */
  function reinit() {
    panel = null;
    isOpen = false;
    currentQuery = "";
    highlightedIndex = -1;
    resultItems = [];
    init();
  }

  /**
   * Destroy the search engine (cleanup).
   */
  function destroy() {
    hidePanel();
    if (panel && panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
    panel = null;
    isOpen = false;
    currentQuery = "";
  }

  // ─── Inject Styles (once) ────────────────────────────────────────────────

  // ─── Auto-init ───────────────────────────────────────────────────────────

  // Inject styles immediately
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
    });
  } else {
    init();
  }

  // Re-init on SPA navigation (spa:ready ensures translations + DOM are ready)
  _spaOn(
    document,
    "spa:ready",
    function () {
      reinit();
    },
    "spa:ready:reinit"
  );

  // Re-init on language change
  if (window.translationManager) {
    window.translationManager.on("languageChanged", function () {
      // Clear current query and hide panel
      currentQuery = "";
      hidePanel();
    });
  }
  _spaOn(
    window,
    "languageChanged",
    function () {
      currentQuery = "";
      hidePanel();
    },
    "languageChanged"
  );

  // ─── Expose ──────────────────────────────────────────────────────────────

  window.ProductSearchEngine = {
    init: init,
    reinit: reinit,
    destroy: destroy,
    search: function (query) {
      return doSearch(query);
    },
  };
})(window);
