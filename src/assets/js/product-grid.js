/**
 * ProductGrid — renders product cards and manages category tabs
 * Supports PC / tablet / mobile layouts via CSS classes
 * Includes product compare integration (cross-page via localStorage)
 */
(function () {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (key == null) key = evt + ":" + (++_spaRegs.__k || (_spaRegs.__k = 1));
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  function tl(key, fallback) {
    if (typeof window.uiText === "function") {
      return window.uiText(key, fallback);
    }
    return fallback;
  }

  var STORE_KEY = "PRODUCT_DATA_TABLE";
  var COMPARE_KEY = "YUKOLI_COMPARE_ITEMS";
  var MAX_COMPARE = 3;

  // ─── Compare helpers ───────────────────────────────────────────

  function getCompareItems() {
    try {
      var data = localStorage.getItem(COMPARE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCompareItems(items) {
    try {
      if (items.length === 0) {
        localStorage.removeItem(COMPARE_KEY);
      } else {
        localStorage.setItem(COMPARE_KEY, JSON.stringify(items));
      }
    } catch (e) {}
  }

  function isProductCompared(model) {
    return getCompareItems().some(function (item) {
      return item.model === model;
    });
  }

  function toggleCompareFromCard(model) {
    var products = getAllProducts();
    var product = products.find(function (p) {
      return p.model === model;
    });
    if (!product) return;
    var items = getCompareItems();
    var idx = items.findIndex(function (s) {
      return s.model === model;
    });
    if (idx >= 0) {
      items.splice(idx, 1);
    } else {
      if (items.length >= MAX_COMPARE) {
        showToast(tl("compare_max_selected", "最多只能选择 " + MAX_COMPARE + " 款产品进行对比"));
        return;
      }
      items.push(product);
    }
    saveCompareItems(items);
    updateCompareButtons();
    updateFloatingBar();
  }

  function clearCompareItems() {
    saveCompareItems([]);
    updateCompareButtons();
    updateFloatingBar();
  }

  function removeCompareItem(model) {
    var items = getCompareItems().filter(function (s) {
      return s.model !== model;
    });
    saveCompareItems(items);
    updateCompareButtons();
    updateFloatingBar();
  }

  // ─── Compare button state sync ─────────────────────────────────

  function updateCompareButtons() {
    var items = getCompareItems();
    document.querySelectorAll(".compare-btn[data-model]").forEach(function (btn) {
      var model = btn.dataset.model;
      var isSelected = items.some(function (s) {
        return s.model === model;
      });
      btn.classList.toggle("compare-btn-active", isSelected);
      // Update visual
      var icon = btn.querySelector(".compare-icon");
      var article = btn.closest("article") || btn.closest(".product-card-mobile");
      if (isSelected) {
        if (icon) icon.textContent = "check";
        if (article) article.classList.add("compare-selected");
        btn.classList.add("bg-primary", "text-white", "border-primary");
        btn.classList.remove(
          "bg-slate-100",
          "dark:bg-slate-700",
          "text-slate-500",
          "border-slate-200",
          "dark:border-slate-600"
        );
      } else {
        if (icon) icon.textContent = "compare_arrows";
        if (article) article.classList.remove("compare-selected");
        btn.classList.remove("bg-primary", "text-white", "border-primary");
        btn.classList.add(
          "bg-slate-100",
          "dark:bg-slate-700",
          "text-slate-500",
          "border-slate-200",
          "dark:border-slate-600"
        );
      }
    });
  }

  // ─── Toast ─────────────────────────────────────────────────────

  function showToast(msg) {
    var toast = document.createElement("div");
    toast.className =
      "compare-toast fixed top-24 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-xl shadow-xl z-[200] text-sm font-medium transition-all duration-300";
    toast.style.cssText = "opacity:0;transform:translate(-50%,-10px)";
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.style.opacity = "1";
      toast.style.transform = "translate(-50%,0)";
    });
    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%,-10px)";
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 2000);
  }

  // ─── Floating Compare Bar ──────────────────────────────────────

  var floatingBarId = "compare-floating-bar";

  function getDeviceType() {
    var w = window.innerWidth;
    if (w < 768) return "mobile";
    if (w < 1280) return "tablet";
    return "pc";
  }

  function updateFloatingBar() {
    var bar = document.getElementById(floatingBarId);
    if (!bar) return;
    var items = getCompareItems();
    if (items.length === 0) {
      bar.classList.remove("visible");
      return;
    }
    bar.classList.add("visible");
    var device = getDeviceType();
    var container = bar.querySelector(".compare-bar-inner");
    if (!container) return;

    if (device === "tablet") {
      container.innerHTML = renderTabletBar(items);
    } else if (device === "mobile") {
      container.innerHTML = renderMobileBar(items);
    } else {
      container.innerHTML = renderDesktopBar(items);
    }
    bindFloatingBarEvents(container);
  }

  function renderMobileBar(items) {
    var thumbs = items
      .map(function (p) {
        return (
          '<div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-1.5 flex-shrink-0">' +
          '<img src="' +
          esc(p._imageUrl) +
          '" class="w-6 h-6 rounded object-cover" onerror="this.src=\'/assets/images/products/default.webp\'">' +
          '<span class="text-[10px] font-bold text-slate-900 dark:text-white truncate max-w-[56px]">' +
          esc(p.name || p.model) +
          "</span>" +
          '<button class="float-remove flex-shrink-0 text-slate-400 hover:text-red-500" data-model="' +
          esc(p.model) +
          '"><span class="material-symbols-outlined text-sm">close</span></button>' +
          "</div>"
        );
      })
      .join("");

    return (
      '<div class="flex items-center gap-2 w-full">' +
      '<div class="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide py-1">' +
      thumbs +
      "</div>" +
      '<div class="flex items-center gap-1.5 flex-shrink-0">' +
      '<button class="float-clear px-3 py-2 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">' +
      esc(tl("compare_clear", "清空")) +
      "</button>" +
      '<a href="/products/compare/" class="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">' +
      esc(tl("compare_view", "对比")) +
      "(" +
      items.length +
      ")</a>" +
      "</div>" +
      "</div>"
    );
  }

  function renderTabletBar(items) {
    var thumbs = items
      .map(function (p) {
        return (
          '<div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-1.5 flex-shrink-0">' +
          '<img src="' +
          esc(p._imageUrl) +
          '" class="w-7 h-7 rounded object-cover" onerror="this.src=\'/assets/images/products/default.webp\'">' +
          '<span class="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[80px]">' +
          esc(p.name || p.model) +
          "</span>" +
          '<button class="float-remove flex-shrink-0 text-slate-400 hover:text-red-500" data-model="' +
          esc(p.model) +
          '"><span class="material-symbols-outlined text-sm">close</span></button>' +
          "</div>"
        );
      })
      .join("");

    return (
      '<div class="flex flex-col gap-2 w-full">' +
      '<div class="flex items-center gap-2 overflow-x-auto scrollbar-hide py-0.5">' +
      thumbs +
      "</div>" +
      '<div class="flex items-center justify-end gap-2">' +
      '<button class="float-clear px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">' +
      esc(tl("compare_clear", "清空")) +
      "</button>" +
      '<a href="/products/compare/" class="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">' +
      esc(tl("compare_view", "对比")) +
      "(" +
      items.length +
      ")</a>" +
      "</div>" +
      "</div>"
    );
  }

  function renderDesktopBar(items) {
    var thumbs = items
      .map(function (p) {
        return (
          '<div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-xl px-3 py-2 flex-shrink-0">' +
          '<img src="' +
          esc(p._imageUrl) +
          '" class="w-8 h-8 rounded-lg object-cover" onerror="this.src=\'/assets/images/products/default.webp\'">' +
          '<div class="min-w-0"><p class="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[120px]">' +
          esc(p.name || p.model) +
          "</p></div>" +
          '<button class="float-remove flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors" data-model="' +
          esc(p.model) +
          '"><span class="material-symbols-outlined text-base">close</span></button>' +
          "</div>"
        );
      })
      .join("");

    return (
      '<div class="flex items-center gap-3 flex-wrap sm:flex-nowrap">' +
      '<div class="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">' +
      '<span class="material-symbols-outlined text-primary">compare_arrows</span>' +
      "<span>" +
      esc(tl("compare_selected_count", "已选")) +
      ' <span class="text-primary">' +
      items.length +
      "</span>/3</span>" +
      "</div>" +
      '<div class="flex items-center gap-3 flex-1 overflow-x-auto scrollbar-hide">' +
      thumbs +
      "</div>" +
      '<div class="flex items-center gap-2 flex-shrink-0">' +
      '<button class="float-clear px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-slate-200 dark:border-slate-700 hover:border-red-300">' +
      esc(tl("compare_clear", "清空")) +
      "</button>" +
      '<a href="/products/compare/" class="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-1"><span>' +
      esc(tl("compare_view", "对比")) +
      '</span><span class="material-symbols-outlined text-sm">arrow_forward</span></a>' +
      "</div>" +
      "</div>"
    );
  }

  function bindFloatingBarEvents(container) {
    container.querySelectorAll(".float-remove").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        removeCompareItem(this.dataset.model);
      });
    });
    var clearBtn = container.querySelector(".float-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        clearCompareItems();
      });
    }
  }

  function createFloatingBar() {
    if (document.getElementById(floatingBarId)) return;

    var device = getDeviceType();
    var bar = document.createElement("div");
    bar.id = floatingBarId;

    if (device === "mobile") {
      bar.className =
        "fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3 z-50";
    } else if (device === "tablet") {
      bar.className =
        "fixed bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 px-4 py-3 z-50 w-[calc(100%-2rem)]";
    } else {
      bar.className =
        "fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 px-6 py-4 z-50 max-w-4xl w-[calc(100%-3rem)]";
    }

    bar.innerHTML = '<div class="compare-bar-inner"></div>';
    document.body.appendChild(bar);
    updateFloatingBar();
  }

  // Listen for storage events from other tabs
  window.addEventListener("storage", function (e) {
    if (e.key === COMPARE_KEY) {
      updateCompareButtons();
      updateFloatingBar();
    }
  });

  // ─── Data loader (fetch from API if not already loaded) ───────
  var _dataLoaded = false;
  var _fetchPromise = null;
  var _dataCallbacks = [];

  function loadFromAPI(callback) {
    if (_dataLoaded) {
      callback();
      return;
    }
    // SSG path: use PRODUCT_DATA_TABLE inlined from product-data-table.js
    function trySsg(retries) {
      retries = retries || 0;
      var has = window[STORE_KEY] && Array.isArray(window[STORE_KEY]) && window[STORE_KEY].length > 0;
      if (has) {
        _dataLoaded = true;
        if (typeof callback === "function") callback();
        window.dispatchEvent(new Event("product-data-ready"));
        return true;
      }
      // Fallback: try localStorage cache
      try {
        var cached = JSON.parse(localStorage.getItem("pdt_v2"));
        if (Array.isArray(cached) && cached.length > 0) {
          window[STORE_KEY] = cached;
          _dataLoaded = true;
          if (typeof callback === "function") callback();
          window.dispatchEvent(new Event("product-data-ready"));
          return true;
        }
      } catch (e) {}
      // Retry with delay (max 3 times, 50ms apart) — handles edge cases where
      // product-data-table.js hasn't finished executing yet
      if (retries < 3) {
        setTimeout(function () {
          trySsg(retries + 1);
        }, 50);
        return true; // will retry
      }
      return false;
    }
    function tryOnReady() {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
          trySsg();
        });
      } else {
        trySsg();
      }
    }
    if (typeof callback === "function") _dataCallbacks.push(callback);
    tryOnReady();
  }

  function getCategories() {
    var raw = window[STORE_KEY];
    if (!Array.isArray(raw)) return [];
    // 扁平结构（来自 product-data-table.js）：raw[0].model 存在说明是产品数组
    if (raw.length > 0 && raw[0].model && !raw[0].products) {
      // 提取唯一品类名作为 tab
      var seenCat = {};
      var result = [];
      raw.forEach(function (p) {
        var cat = p.category || "";
        if (cat && !seenCat[cat]) {
          seenCat[cat] = true;
          result.push({ category: cat });
        }
      });
      return result;
    }
    return raw;
  }

  function getAllProducts() {
    var raw = window[STORE_KEY];
    if (!Array.isArray(raw)) return [];
    var result = [];

    // 扁平结构（来自 product-data-table.js）：raw 里每个元素都是产品
    if (raw.length > 0 && raw[0].model) {
      raw.forEach(function (p) {
        var img = "/assets/images/products/" + (p.model || "default") + ".webp";
        result.push(
          Object.assign({}, p, {
            _category: p.category || "",
            _imageUrl: img,
          })
        );
      });
      return result;
    }

    // 嵌套结构（来自 API）：raw 里每个元素是 { category, products: [...] }
    raw.forEach(function (cat) {
      if (!cat.products || !Array.isArray(cat.products)) return;
      cat.products.forEach(function (p) {
        var img = "/assets/images/products/" + (p.model || "default") + ".webp";
        if (p.images && Array.isArray(p.images) && p.images.length > 0) {
          var primary =
            p.images.find(function (i) {
              return i.isPrimary;
            }) || p.images[0];
          if (primary && primary.filePath) img = primary.filePath;
        } else if (p.image) {
          img = p.image;
        } else if (p.imageUrl) {
          img = p.imageUrl;
        }
        result.push(
          Object.assign({}, p, {
            _category: cat.category || cat.slug || "",
            _imageUrl: img,
          })
        );
      });
    });
    return result;
  }

  function esc(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ─── Compare button HTML builder ───────────────────────────────

  function buildCompareBtnHTML(model) {
    var isSelected = isProductCompared(model);
    var activeClass = isSelected
      ? "bg-primary text-white border-primary"
      : "bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600";
    return (
      '<button class="compare-btn ' +
      activeClass +
      ' flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-bold flex-shrink-0" data-model="' +
      model +
      '" onclick="event.preventDefault();event.stopPropagation();window.ProductGrid.toggleCompare(\'' +
      model.replace(/'/g, "\\'") +
      "')\">" +
      '<span class="compare-icon material-symbols-outlined text-lg">' +
      (isSelected ? "check" : "compare_arrows") +
      "</span>" +
      "</button>"
    );
  }

  function buildMobileCompareBtnHTML(model) {
    var isSelected = isProductCompared(model);
    var bgClass = isSelected ? "bg-primary text-white" : "bg-white/90 dark:bg-slate-800/90 text-primary";
    var borderClass = isSelected ? "border-primary" : "border-slate-300 dark:border-slate-500";
    return (
      '<button class="compare-btn compare-btn-mobile ' +
      bgClass +
      " w-8 h-8 rounded-lg border-2 " +
      borderClass +
      ' flex items-center justify-center shadow-md backdrop-blur-sm" data-model="' +
      model +
      '" onclick="event.preventDefault();event.stopPropagation();window.ProductGrid.toggleCompare(\'' +
      model.replace(/'/g, "\\'") +
      "')\">" +
      '<span class="compare-icon material-symbols-outlined text-[18px]">' +
      (isSelected ? "check" : "compare_arrows") +
      "</span>" +
      "</button>"
    );
  }

  // ─── Card renderers ────────────────────────────────────────────

  function renderPC(p) {
    var cat = esc(p._category);
    var model = esc(p.model || "");
    var name = esc(p.name || model);
    var desc = esc(p.description || p.card_desc || p.highlights || "");
    var img = esc(p._imageUrl);
    var subCatRaw = p.subCategory || cat;
    var subCat = esc(subCatRaw);
    var subCatDataI18n = ' data-i18n="' + esc(subCatRaw) + '"';
    var specs = [];
    if (p.power) specs.push(esc(p.power));
    if (p.throughput) specs.push(esc(p.throughput));
    if (p.averageTime) specs.push(esc(p.averageTime));
    var specHTML = specs
      .map(function (s) {
        return '<span class="spec-badge px-2 py-1 rounded text-xs font-medium text-primary">' + s + "</span>";
      })
      .join("");
    var badge = "";
    if (p.badge) {
      badge =
        '<span class="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">' + esc(p.badge) + "</span>";
    }
    var link = "/products/" + encodeURIComponent(model) + "/";
    var isSelected = isProductCompared(p.model);
    var selectedClass = isSelected ? " compare-selected" : "";
    return (
      '<article class="product-card group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden' +
      selectedClass +
      '" data-category="' +
      cat +
      '" data-tier="' +
      esc(p.tier || "") +
      '" data-model="' +
      model +
      '" data-sort-order="' +
      (p.sort_order || 0) +
      '" data-created="' +
      (p.created_at || "") +
      '">' +
      '<div class="relative aspect-[4/3] overflow-hidden bg-white dark:bg-slate-800 flex items-center justify-center">' +
      '<img loading="lazy" alt="' +
      name +
      '" class="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" src="' +
      img +
      "\" onerror=\"if(!this.dataset.errored){this.dataset.errored='1';this.src='/assets/images/products/default.webp' }\">" +
      (badge ? '<div class="absolute top-4 left-4 flex gap-2">' + badge + "</div>" : "") +
      "</div>" +
      '<div class="p-6">' +
      '<div class="flex items-center gap-2 mb-3"><span class="material-symbols-outlined text-primary">local_fire_department</span><span class="text-sm font-bold text-primary uppercase tracking-wider"' +
      subCatDataI18n +
      ">" +
      subCat +
      "</span></div>" +
      '<h3 class="text-xl font-bold mb-2 text-slate-900 dark:text-white">' +
      name +
      "</h3>" +
      '<p class="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">' +
      desc +
      "</p>" +
      (specHTML ? '<div class="flex flex-wrap gap-2 mb-4">' + specHTML + "</div>" : "") +
      '<div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">' +
      '<div><span class="text-xs text-slate-400">' +
      esc(tl("products_starting_price", "起售价")) +
      '</span><p class="text-xl font-black text-primary">' +
      esc(tl("products_inquire", "询价")) +
      "</p></div>" +
      '<div class="flex items-center gap-2">' +
      '<a href="' +
      link +
      '" class="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"><span>' +
      esc(tl("btn_view_details", "查看详情")) +
      '</span><span class="material-symbols-outlined text-sm">arrow_forward</span></a>' +
      buildCompareBtnHTML(model) +
      "</div>" +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function renderTablet(p) {
    var cat = esc(p._category);
    var model = esc(p.model || "");
    var name = esc(p.name || model);
    var desc = esc(p.description || p.card_desc || "");
    var img = esc(p._imageUrl);
    var subCatRaw = p.subCategory || cat;
    var subCat = esc(subCatRaw);
    var subCatDataI18n = ' data-i18n="' + esc(subCatRaw) + '"';
    var badge = "";
    if (p.badge) {
      badge =
        '<span class="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded">' + esc(p.badge) + "</span>";
    }
    var link = "/products/" + encodeURIComponent(model) + "/";
    var isSelected = isProductCompared(p.model);
    var selectedClass = isSelected ? " compare-selected" : "";
    return (
      '<article class="product-card-tablet bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden' +
      selectedClass +
      '" data-category="' +
      cat +
      '" data-model="' +
      model +
      '" data-tier="' +
      esc(p.tier || "") +
      '" data-sort-order="' +
      (p.sort_order || 0) +
      '" data-created="' +
      (p.created_at || "") +
      '">' +
      '<div class="relative aspect-[4/3] overflow-hidden bg-white dark:bg-slate-800 flex items-center justify-center">' +
      '<img loading="lazy" alt="' +
      name +
      '" class="w-full h-full object-contain p-2" src="' +
      img +
      "\" onerror=\"if(!this.dataset.errored){this.dataset.errored='1';this.src='/assets/images/products/default.webp' }\">" +
      (badge ? '<div class="absolute top-3 left-3 flex gap-1.5">' + badge + "</div>" : "") +
      "</div>" +
      '<div class="p-4">' +
      '<div class="flex items-center gap-1.5 mb-2"><span class="material-symbols-outlined text-primary text-sm">local_fire_department</span><span class="text-xs font-bold text-primary uppercase tracking-wider"' +
      subCatDataI18n +
      ">" +
      subCat +
      "</span></div>" +
      '<h3 class="text-base font-bold mb-1 text-slate-900 dark:text-white">' +
      name +
      "</h3>" +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">' +
      desc +
      "</p>" +
      '<div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">' +
      '<span class="text-base font-black text-primary">' +
      esc(tl("products_inquire", "询价")) +
      "</span>" +
      '<div class="flex items-center gap-2">' +
      '<a href="' +
      link +
      '" class="flex items-center gap-1 text-primary text-sm font-bold hover:underline"><span>' +
      esc(tl("btn_view_details", "查看详情")) +
      '</span><span class="material-symbols-outlined text-xs">arrow_forward</span></a>' +
      buildCompareBtnHTML(model) +
      "</div>" +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function renderMobile(p) {
    var cat = esc(p._category);
    var model = esc(p.model || "");
    var name = esc(p.name || model);
    var desc = esc(p.description || p.card_desc || "");
    var img = esc(p._imageUrl);
    var link = "/products/" + encodeURIComponent(model) + "/";
    var isSelected = isProductCompared(p.model);
    var selectedClass = isSelected ? " compare-selected" : "";
    return (
      '<article class="product-card-mobile bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative' +
      selectedClass +
      '" data-category="' +
      cat +
      '" data-model="' +
      model +
      '" data-tier="' +
      esc(p.tier || "") +
      '" data-sort-order="' +
      (p.sort_order || 0) +
      '" data-created="' +
      (p.created_at || "") +
      '">' +
      buildMobileCompareBtnHTML(model) +
      '<a href="' +
      link +
      '" class="flex gap-4 p-3">' +
      '<div class="w-24 h-24 rounded-lg bg-white dark:bg-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center">' +
      '<img loading="lazy" alt="' +
      name +
      '" class="w-full h-full object-contain p-1" src="' +
      img +
      "\" onerror=\"if(!this.dataset.errored){this.dataset.errored='1';this.src='/assets/images/products/default.webp' }\">" +
      "</div>" +
      '<div class="flex-1 min-w-0">' +
      '<h3 class="text-sm font-bold text-slate-900 dark:text-white mb-1 truncate">' +
      name +
      "</h3>" +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">' +
      desc +
      "</p>" +
      '<div class="flex items-center justify-between">' +
      '<span class="text-sm font-black text-primary">' +
      esc(tl("products_inquire", "询价")) +
      "</span>" +
      '<span class="material-symbols-outlined text-slate-400 text-sm">arrow_forward</span>' +
      "</div>" +
      "</div>" +
      "</a>" +
      "</article>"
    );
  }

  // ─── Filter state ────────────────────────────────────────────
  var _activeCategory = "all";
  var _activeTier = "all";

  function getFilteredProducts() {
    var products = getAllProducts();
    if (_activeCategory !== "all") {
      products = products.filter(function (p) {
        return p._category === _activeCategory;
      });
    }
    if (_activeTier !== "all") {
      products = products.filter(function (p) {
        return (p.tier || "") === _activeTier;
      });
    }
    return products;
  }

  // ─── Grid rendering with pagination ──────────────────────────
  var _shownCount = {};

  function getPageSize() {
    var w = window.innerWidth || 1024;
    if (w >= 1280) return 12; // PC: 4 cols × 3 rows
    if (w >= 768) return 9; // Tablet: 3 cols × 3 rows
    return 6; // Mobile: 2 cols × 3 rows
  }

  function renderGrid(containerId, renderer, maxCount) {
    var container = document.getElementById(containerId);
    if (!container) {
      return;
    }
    var products = getFilteredProducts();
    var total = products.length;
    var initial = Math.min(total, getPageSize());

    _shownCount[containerId] = initial;
    var html = products.slice(0, initial).map(renderer).join("");
    container.innerHTML = html;
    updateLoadMoreBtn(containerId, total, initial);
    bindLoadMore(containerId, renderer, products);
    // Init floating bar after grid render
    createFloatingBar();
  }

  function updateLoadMoreBtn(containerId, total, shown) {
    var loadMore = document.querySelector('[data-i18n="products_load_more"]');
    if (loadMore) loadMore.style.display = total <= shown ? "none" : "";
  }

  function bindLoadMore(containerId, renderer, products) {
    var loadMore = document.querySelector('[data-i18n="products_load_more"]');
    if (!loadMore || loadMore._bound) return;
    loadMore._bound = true;
    loadMore.addEventListener("click", function () {
      var container = document.getElementById(containerId);
      if (!container) return;
      var shown = _shownCount[containerId] || getPageSize();
      var next = Math.min(shown + getPageSize(), products.length);
      _shownCount[containerId] = next;
      // Append new products
      container.innerHTML = products.slice(0, next).map(renderer).join("");
      updateLoadMoreBtn(containerId, products.length, next);
      // Re-sync compare button states for newly rendered cards
      updateCompareButtons();
    });
  }

  // ─── Auto render (deduped) ─────────────────────────────────────

  var _renderPending = false;

  var _autoRenderRetries = 0;
  function autoRender() {
    if (_renderPending) return;
    var data = window[STORE_KEY];
    var hasData = Array.isArray(data) && data.length > 0;
    if (hasData) {
      _renderPending = false;
      _autoRenderRetries = 0;
      doRender();
    } else {
      // Retry with exponential backoff up to ~1s total
      if (_autoRenderRetries < 7) {
        _autoRenderRetries++;
        var delay = Math.min(50 * Math.pow(1.5, _autoRenderRetries - 1), 300);
        setTimeout(autoRender, delay);
        return;
      }
      _autoRenderRetries = 0;
      _renderPending = true;
      loadFromAPI(function () {
        _renderPending = false;
        doRender();
      });
    }
  }

  function doRender() {
    var cats = getCategories();
    var prods = getAllProducts();
    if (!cats.length) {
      return;
    }
    var productListEl = document.getElementById("product-list");
    var productGridEl = document.getElementById("product-grid");
    if (productListEl) {
      renderGrid("product-list", renderMobile, 100);
    } else if (productGridEl) {
      if (productGridEl.classList.contains("md:grid-cols-2")) {
        renderGrid("product-grid", renderPC, 100);
      } else {
        renderGrid("product-grid", renderTablet, 100);
      }
    }
    initCategoryTabs();
    initTierFilter();

    // Hide skeleton overlay after first successful render
    var overlay = document.getElementById("skeleton-overlay");
    if (overlay) overlay.setAttribute("hidden", "");
    var container = document.getElementById("spa-content");
    if (container) container.style.display = "";
    // Ensure product grid is visible — Swup may set display:none during container replacement
    document.querySelectorAll("#product-grid, #product-list").forEach(function (el) {
      el.style.removeProperty("display");
    });
  }

  // ─── Category tabs ─────────────────────────────────────────────

  function initTierFilter() {
    document.querySelectorAll(".filter-chip").forEach(function (chip) {
      if (chip._tierFilterBound) return;
      chip._tierFilterBound = true;
      chip.addEventListener("click", function () {
        document.querySelectorAll(".filter-chip").forEach(function (c) {
          c.classList.remove("active");
        });
        this.classList.add("active");
        _activeTier = this.dataset.filter || "all";
        _shownCount = {};
        doRender();
      });
    });
  }

  function initCategoryTabs() {
    var container = document.querySelector(".category-tab-container");
    if (!container) return;

    // Prevent duplicate init
    if (container._categoryTabsInit) return;
    container._categoryTabsInit = true;

    var categories = [];
    getCategories().forEach(function (cat) {
      var name = cat.categoryName || cat.category;
      if (name) {
        // Translate category if it's an i18n key (e.g. nav_products_stirfry)
        var translated = typeof window.t === "function" ? window.t(cat.category) : null;
        var label = translated && translated !== cat.category ? translated : name;
        categories.push({ key: cat.category, name: label });
      }
    });
    if (!categories.length) return;

    // Build tab buttons
    var allTabs = [];
    var isMobile = window.innerWidth < 768;
    var tabSizeClass = isMobile ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

    // "全部产品" button
    var allBtn = document.createElement("button");
    allBtn.className =
      "category-tab active " +
      tabSizeClass +
      " font-bold whitespace-nowrap rounded-full border border-slate-200 dark:border-slate-700";
    allBtn.dataset.category = "all";
    allBtn.textContent =
      typeof window.t === "function"
        ? window.uiText("products_all", "\u5168\u90e8\u4ea7\u54c1")
        : "\u5168\u90e8\u4ea7\u54c1";
    allTabs.push(allBtn);

    categories.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.className =
        "category-tab " +
        tabSizeClass +
        " font-medium whitespace-nowrap rounded-full border border-slate-200 dark:border-slate-700";
      btn.dataset.category = cat.key;
      btn.textContent = cat.name;
      allTabs.push(btn);
    });

    // "More" toggle button
    var moreBtn = document.createElement("button");
    moreBtn.className =
      "category-tab-more px-3 py-2 text-xs font-bold whitespace-nowrap rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-pointer";

    // Dynamic visible tab count: measures actual tab widths against container
    var dynamicMax = Infinity;
    function calcDynamicMax() {
      if (window.innerWidth >= 1280) {
        dynamicMax = Infinity;
        return;
      }
      var totalAvailable = container.clientWidth || container.offsetWidth;
      if (totalAvailable <= 0) {
        dynamicMax = 3;
        return;
      }
      // Create a temp more-btn to measure its real width
      var tmpMore = moreBtn.cloneNode(true);
      tmpMore.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
      tmpMore.textContent = tl("products_more", "+9 更多 ▼").replace("{n}", "9");
      container.appendChild(tmpMore);
      var moreBtnWidth = tmpMore.offsetWidth + 8; // +8 for gap
      container.removeChild(tmpMore);

      // Create a hidden wrapper to measure all tab widths
      var measureWrap = document.createElement("div");
      measureWrap.style.cssText = "display:inline-flex;position:absolute;visibility:hidden;pointer-events:none";
      container.appendChild(measureWrap);
      var used = 0;
      var fit = 0;
      for (var i = 0; i < allTabs.length; i++) {
        var clone = allTabs[i].cloneNode(true);
        measureWrap.appendChild(clone);
        var w = clone.offsetWidth + 8; // 8px gap between tabs
        if (used + w > totalAvailable - moreBtnWidth) {
          clone.remove();
          break;
        }
        used += w;
        fit++;
      }
      container.removeChild(measureWrap);
      dynamicMax = Math.max(fit, 2); // at least 2 visible
    }

    var isExpanded = false;

    function getVisibleCount() {
      if (window.innerWidth >= 1280) return Infinity;
      return dynamicMax;
    }

    function renderTabs() {
      container.innerHTML = "";
      var maxVis = getVisibleCount();
      var showCount = isExpanded ? allTabs.length : Math.min(maxVis, allTabs.length);
      // Mobile: allow wrap when expanded, prevent when collapsed
      if (isMobile) {
        container.style.flexWrap = isExpanded ? "wrap" : "nowrap";
        container.style.overflow = isExpanded ? "visible" : "hidden";
      }
      for (var i = 0; i < showCount; i++) {
        var tab = allTabs[i];
        // Set active state based on current category
        if ((_activeCategory === "all" && tab.dataset.category === "all") || tab.dataset.category === _activeCategory) {
          tab.classList.add("active");
        } else {
          tab.classList.remove("active");
        }
        container.appendChild(tab);
      }
      if (allTabs.length > maxVis) {
        var remaining = allTabs.length - maxVis;
        var collapseText =
          typeof window.t === "function"
            ? window.uiText("products_collapse", "\u6536\u8d77 \u25B2")
            : "\u6536\u8d77 \u25B2";
        var moreText =
          typeof window.t === "function"
            ? window.uiText("products_more", "+" + remaining + " \u66f4\u591a \u25BC").replace("{n}", remaining)
            : "\u002B" + remaining + " \u66f4\u591a \u25BC";
        moreBtn.textContent = isExpanded ? collapseText : moreText;
        container.appendChild(moreBtn);
      }
    }

    // First render with fallback, then recalculate after fonts + layout settle
    calcDynamicMax();
    renderTabs();
    scheduleRecalc();

    function scheduleRecalc() {
      // Wait for fonts to load, then recalculate with accurate widths
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          requestAnimationFrame(function () {
            calcDynamicMax();
            renderTabs();
          });
        });
      }
      // Also recalculate after a short delay as a safety net (images, etc.)
      setTimeout(function () {
        calcDynamicMax();
        renderTabs();
      }, 300);
    }

    // Recalculate on resize (debounced)
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        calcDynamicMax();
        renderTabs();
      }, 150);
    });

    // More button toggle
    moreBtn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      isExpanded = !isExpanded;
      renderTabs();
    });

    // Tab click handler
    container.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".category-tab");
      if (!btn) return;
      var cat = btn.dataset.category;

      // Update active state
      container.querySelectorAll(".category-tab").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");

      // Filter products
      var selector =
        "#product-grid .product-card, #product-grid .product-card-tablet, #product-list .product-card-mobile";
      // Update active category and re-render
      _activeCategory = cat;
      _shownCount = {};
      doRender();

      // Notify cross-sell module of category change (for /products/all/ page)
      if (cat === "all") {
        if (window.CrossSell && window.CrossSell.clearCategory) window.CrossSell.clearCategory();
      } else {
        // Map category key (e.g. "nav_products_cutting") back to slug (e.g. "cutting")
        var KEY_TO_SLUG = {
          nav_products_stirfry: "stirfry",
          nav_products_cutting: "cutting",
          nav_products_frying: "frying",
          nav_products_stewing: "stewing",
          nav_products_steaming: "steaming",
          nav_products_other: "other",
        };
        var slug = KEY_TO_SLUG[cat] || cat;
        if (window.CrossSell && window.CrossSell.setCategory) window.CrossSell.setCategory(slug);
      }
    });

    // Filter chip click handler (moved to initTierFilter)
    initTierFilter();
  }

  // ─── Init ──────────────────────────────────────────────────────

  // Resolve initial category from URL for SSG page loads (e.g. /products/cutting/ → "nav_products_cutting")
  // This runs before autoRender so the first render filters correctly.
  (function initCategoryFromUrl() {
    var match = window.location.pathname.match(/^\/products\/([^/]+)\/$/);
    if (match) {
      var slug = match[1];
      var SLUG_MAP = {
        all: "all",
        cutting: "切配系列",
        stirfry: "翻炒系列",
        frying: "煎炸系列",
        stewing: "炖煮系列",
        steaming: "蒸煮系列",
        other: "辅助系列",
      };
      var cat = SLUG_MAP[slug];
      if (cat) _activeCategory = cat;
    }
  })();

  // First load: render on DOMContentLoaded (SSG pages already have HTML in DOM)
  if (document.readyState !== "loading") {
    autoRender();
  } else {
    document.addEventListener("DOMContentLoaded", autoRender);
  }

  // product-data-ready: re-render if data arrives late (e.g. after dynamic import)
  window.addEventListener("product-data-ready", function () {
    autoRender();
  });

  // Re-render on language change
  document.addEventListener("languageChanged", function () {
    autoRender();
  });

  // Safety net: if API fails and no cached data, clear skeleton after 5s
  // to prevent permanent skeleton display
  setTimeout(function () {
    var grid = document.getElementById("product-grid");
    var list = document.getElementById("product-list");
    if (grid && grid.querySelector(".sk-product-card")) {
      var gridErrorMsg =
        typeof window.t === "function"
          ? window.uiText("products_load_error", "Failed to load products. Please refresh.")
          : window.uiText("products_load_error", "Failed to load products. Please refresh.");
      var gridRetryText =
        typeof window.t === "function" ? window.uiText("products_load_retry", "重新加载") : "重新加载";
      grid.innerHTML =
        '<div class="col-span-full text-center py-16"><p class="text-slate-500 dark:text-slate-400 text-lg" data-i18n="products_load_error">' +
        gridErrorMsg +
        '</p><button class="mt-4 inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all" data-i18n="products_load_retry" onclick="window.ProductGrid.retryLoad()">' +
        '<span class="material-symbols-outlined text-sm">refresh</span>' +
        gridRetryText +
        "</button></div>";
    }
    if (list && list.querySelector(".sk-product-card")) {
      var listErrorMsg =
        typeof window.t === "function"
          ? window.uiText("products_load_error", "Failed to load products. Please refresh.")
          : window.uiText("products_load_error", "Failed to load products. Please refresh.");
      var listRetryText =
        typeof window.t === "function" ? window.uiText("products_load_retry", "重新加载") : "重新加载";
      list.innerHTML =
        '<div class="text-center py-16"><p class="text-slate-500 dark:text-slate-400 text-lg" data-i18n="products_load_error">' +
        listErrorMsg +
        '</p><button class="mt-4 inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all" data-i18n="products_load_retry" onclick="window.ProductGrid.retryLoad()">' +
        '<span class="material-symbols-outlined text-sm">refresh</span>' +
        listRetryText +
        "</button></div>";
    }
  }, 5000);

  // spa:load: re-render on SPA navigation (content replaced by Swup)
  _spaOn(document, "spa:load", function () {
    _renderPending = false; // reset dedup flag for new page
    // Reset init flag and pagination for SPA navigation
    document.querySelectorAll(".category-tab-container").forEach(function (el) {
      el._categoryTabsInit = false;
    });
    _shownCount = {};
    _activeTier = "all";
    var loadMore = document.querySelector('[data-i18n="products_load_more"]');
    if (loadMore) loadMore._bound = false;

    // Init tier filter (independent of category tabs)
    initTierFilter();

    // Auto-select category from URL (e.g. /products/stewing/)
    var categoryFromUrl = "";
    var match = window.location.pathname.match(/^\/products\/([^/]+)\/$/);
    if (match) {
      var slug = match[1];
      var SLUG_MAP = {
        all: "all",
        cutting: "切配系列",
        stirfry: "翻炒系列",
        frying: "煎炸系列",
        stewing: "炖煮系列",
        steaming: "蒸煮系列",
        other: "辅助系列",
      };
      categoryFromUrl = SLUG_MAP[slug];
    }
    _activeCategory = categoryFromUrl || "all";

    autoRender();
  });

  // Translations may load after product-data-ready; refresh tab labels once ready
  // No spa:ready re-render needed — category labels use data-i18n attributes
  // so applyTranslations() handles them on every spa:load cycle.

  // Public API
  window.ProductGrid = {
    renderPC: function (max) {
      renderGrid("product-grid", renderPC, max);
    },
    renderTablet: function (max) {
      renderGrid("product-grid", renderTablet, max);
    },
    renderMobile: function (max) {
      renderGrid("product-list", renderMobile, max);
    },
    getAll: getAllProducts,
    renderCustom: function (id, renderer, max) {
      renderGrid(id, renderer, max);
    },
    toggleCompare: toggleCompareFromCard,
    getCompareItems: getCompareItems,
    saveCompareItems: saveCompareItems,
    clearCompareItems: clearCompareItems,
    removeCompareItem: removeCompareItem,
    autoRender: autoRender,
    setCategory: function (catKey) {
      _activeCategory = catKey;
    },
    setActiveTier: function (tier) {
      _activeTier = tier;
    },
    retryLoad: function () {
      _dataLoaded = false;
      _fetchPromise = null;
      _renderPending = false;
      delete window[STORE_KEY];
      autoRender();
    },
  };
})();
