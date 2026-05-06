/**
 * ProductGrid — renders product cards and manages category tabs
 * Supports PC / tablet / mobile layouts via CSS classes
 * Includes product compare integration (cross-page via localStorage)
 */
(function() {
  'use strict';

  var STORE_KEY = 'PRODUCT_DATA_TABLE';
  var COMPARE_KEY = 'YUKOLI_COMPARE_ITEMS';
  var MAX_COMPARE = 3;

  // ─── Compare helpers ───────────────────────────────────────────

  function getCompareItems() {
    try {
      var data = localStorage.getItem(COMPARE_KEY);
      return data ? JSON.parse(data) : [];
    } catch(e) { return []; }
  }

  function saveCompareItems(items) {
    try {
      if (items.length === 0) {
        localStorage.removeItem(COMPARE_KEY);
      } else {
        localStorage.setItem(COMPARE_KEY, JSON.stringify(items));
      }
    } catch(e) {}
  }

  function isProductCompared(model) {
    return getCompareItems().some(function(item) { return item.model === model; });
  }

  function toggleCompareFromCard(model) {
    var products = getAllProducts();
    var product = products.find(function(p) { return p.model === model; });
    if (!product) return;
    var items = getCompareItems();
    var idx = items.findIndex(function(s) { return s.model === model; });
    if (idx >= 0) {
      items.splice(idx, 1);
    } else {
      if (items.length >= MAX_COMPARE) {
        showToast('最多只能选择 ' + MAX_COMPARE + ' 款产品进行对比');
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
    var items = getCompareItems().filter(function(s) { return s.model !== model; });
    saveCompareItems(items);
    updateCompareButtons();
    updateFloatingBar();
  }

  // ─── Compare button state sync ─────────────────────────────────

  function updateCompareButtons() {
    var items = getCompareItems();
    document.querySelectorAll('.compare-btn[data-model]').forEach(function(btn) {
      var model = btn.dataset.model;
      var isSelected = items.some(function(s) { return s.model === model; });
      btn.classList.toggle('compare-btn-active', isSelected);
      // Update visual
      var icon = btn.querySelector('.compare-icon');
      var article = btn.closest('article') || btn.closest('.product-card-mobile');
      if (isSelected) {
        if (icon) icon.textContent = 'check';
        if (article) article.classList.add('compare-selected');
        btn.classList.add('bg-primary', 'text-white', 'border-primary');
        btn.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'text-slate-500', 'border-slate-200', 'dark:border-slate-600');
      } else {
        if (icon) icon.textContent = 'compare_arrows';
        if (article) article.classList.remove('compare-selected');
        btn.classList.remove('bg-primary', 'text-white', 'border-primary');
        btn.classList.add('bg-slate-100', 'dark:bg-slate-700', 'text-slate-500', 'border-slate-200', 'dark:border-slate-600');
      }
    });
  }

  // ─── Toast ─────────────────────────────────────────────────────

  function showToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'compare-toast fixed top-24 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-xl shadow-xl z-[200] text-sm font-medium transition-all duration-300';
    toast.style.cssText = 'opacity:0;transform:translate(-50%,-10px)';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function() {
      toast.style.opacity = '1';
      toast.style.transform = 'translate(-50%,0)';
    });
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%,-10px)';
      setTimeout(function() { toast.remove(); }, 300);
    }, 2000);
  }

  // ─── Floating Compare Bar ──────────────────────────────────────

  var floatingBarId = 'compare-floating-bar';

  function injectFloatingBarStyles() {
    if (document.getElementById('compare-bar-styles')) return;
    var style = document.createElement('style');
    style.id = 'compare-bar-styles';
    style.textContent =
      '#compare-floating-bar { transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease; transform: translateY(100%); opacity: 0; pointer-events: none; }' +
      '#compare-floating-bar.visible { transform: translateY(0); opacity: 1; pointer-events: auto; }' +
      '.compare-selected { box-shadow: 0 0 0 2px rgba(236,91,19,0.5); }' +
      '.compare-btn { transition: all 0.2s ease; }' +
      '.compare-btn:hover { opacity: 0.85; }' +
      '.compare-btn-mobile { position: absolute; top: 8px; right: 8px; z-index: 10; }' +
      '@media (max-width: 767px) { body { padding-bottom: 70px; } }';
    document.head.appendChild(style);
  }

  function getDeviceType() {
    var w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1280) return 'tablet';
    return 'pc';
  }

  function updateFloatingBar() {
    var bar = document.getElementById(floatingBarId);
    if (!bar) return;
    var items = getCompareItems();
    if (items.length === 0) {
      bar.classList.remove('visible');
      return;
    }
    bar.classList.add('visible');
    var device = getDeviceType();
    var container = bar.querySelector('.compare-bar-inner');
    if (!container) return;

    if (device === 'mobile' || device === 'tablet') {
      container.innerHTML = renderMobileBar(items);
    } else {
      container.innerHTML = renderDesktopBar(items);
    }
    bindFloatingBarEvents(container);
  }

  function renderMobileBar(items) {
    var thumbs = items.map(function(p) {
      return '<div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-1.5 flex-shrink-0">' +
        '<img src="' + esc(p._imageUrl) + '" class="w-6 h-6 rounded object-cover" onerror="this.src=\'/assets/images/products/default.webp\'">' +
        '<span class="text-[10px] font-bold text-slate-900 dark:text-white truncate max-w-[56px]">' + esc(p.name || p.model) + '</span>' +
        '<button class="float-remove flex-shrink-0 text-slate-400 hover:text-red-500" data-model="' + esc(p.model) + '"><span class="material-symbols-outlined text-sm">close</span></button>' +
      '</div>';
    }).join('');

    return '<div class="flex items-center gap-2 w-full">' +
      '<div class="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide py-1">' + thumbs + '</div>' +
      '<button class="float-clear flex-shrink-0 px-2.5 py-2 rounded-lg text-[10px] font-bold text-slate-500 hover:text-red-500 transition-colors">清空</button>' +
      '<a href="/products/compare/" class="flex-shrink-0 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold">对比(' + items.length + ')</a>' +
    '</div>';
  }

  function renderDesktopBar(items) {
    var thumbs = items.map(function(p) {
      return '<div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-xl px-3 py-2 flex-shrink-0">' +
        '<img src="' + esc(p._imageUrl) + '" class="w-8 h-8 rounded-lg object-cover" onerror="this.src=\'/assets/images/products/default.webp\'">' +
        '<div class="min-w-0"><p class="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[120px]">' + esc(p.name || p.model) + '</p></div>' +
        '<button class="float-remove flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors" data-model="' + esc(p.model) + '"><span class="material-symbols-outlined text-base">close</span></button>' +
      '</div>';
    }).join('');

    return '<div class="flex items-center gap-3 flex-wrap sm:flex-nowrap">' +
      '<div class="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">' +
        '<span class="material-symbols-outlined text-primary">compare_arrows</span>' +
        '<span>已选 <span class="text-primary">' + items.length + '</span>/3</span>' +
      '</div>' +
      '<div class="flex items-center gap-3 flex-1 overflow-x-auto scrollbar-hide">' + thumbs + '</div>' +
      '<div class="flex items-center gap-2 flex-shrink-0">' +
        '<button class="float-clear px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-slate-200 dark:border-slate-700 hover:border-red-300">清空</button>' +
        '<a href="/products/compare/" class="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-1"><span>对比</span><span class="material-symbols-outlined text-sm">arrow_forward</span></a>' +
      '</div>' +
    '</div>';
  }

  function bindFloatingBarEvents(container) {
    container.querySelectorAll('.float-remove').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        removeCompareItem(this.dataset.model);
      });
    });
    var clearBtn = container.querySelector('.float-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        clearCompareItems();
      });
    }
  }

  function createFloatingBar() {
    if (document.getElementById(floatingBarId)) return;
    injectFloatingBarStyles();

    var device = getDeviceType();
    var bar = document.createElement('div');
    bar.id = floatingBarId;

    if (device === 'mobile') {
      bar.className = 'fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3 z-50';
    } else if (device === 'tablet') {
      bar.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 px-4 py-3 z-50 w-[calc(100%-2rem)]';
    } else {
      bar.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 px-6 py-4 z-50 max-w-4xl w-[calc(100%-3rem)]';
    }

    bar.innerHTML = '<div class="compare-bar-inner"></div>';
    document.body.appendChild(bar);
    updateFloatingBar();
  }

  // Listen for storage events from other tabs
  window.addEventListener('storage', function(e) {
    if (e.key === COMPARE_KEY) {
      updateCompareButtons();
      updateFloatingBar();
    }
  });

  // ─── Data loader (fetch from API if not already loaded) ───────
  var _dataLoaded = false;
  var _dataCallbacks = [];

  function loadFromAPI(callback) {
    if (_dataLoaded) { callback(); return; }
    _dataCallbacks.push(callback);
    if (_dataCallbacks.length > 1) return; // already fetching
    fetch('/api/cms/products-data', { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        window[STORE_KEY] = data;
        _dataLoaded = true;
        _dataCallbacks.forEach(function(cb) { cb(); });
        _dataCallbacks = [];
        window.dispatchEvent(new Event('product-data-ready'));
      })
      .catch(function(err) {
        console.error('[ProductGrid] Failed to load product data:', err);
        _dataCallbacks = [];
      });
  }

  function getCategories() {
    return Array.isArray(window[STORE_KEY]) ? window[STORE_KEY] : [];
  }

  function getAllProducts() {
    var result = [];
    getCategories().forEach(function(cat) {
      if (!cat.products || !Array.isArray(cat.products)) return;
      cat.products.forEach(function(p) {
        var img = '/assets/images/products/' + (p.model || 'default') + '.webp';
        if (p.images && Array.isArray(p.images) && p.images.length > 0) {
          var primary = p.images.find(function(i) { return i.isPrimary; }) || p.images[0];
          if (primary && primary.filePath) img = primary.filePath;
        } else if (p.image) {
          img = p.image;
        } else if (p.imageUrl) {
          img = p.imageUrl;
        }
        result.push(Object.assign({}, p, {
          _category: cat.category || cat.slug || '',
          _imageUrl: img
        }));
      });
    });
    return result;
  }

  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── Compare button HTML builder ───────────────────────────────

  function buildCompareBtnHTML(model) {
    var isSelected = isProductCompared(model);
    var activeClass = isSelected ? 'bg-primary text-white border-primary' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600';
        return '<button class="compare-btn ' + activeClass + ' flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-bold flex-shrink-0" data-model="' + model +
      '" onclick="event.preventDefault();event.stopPropagation();window.ProductGrid.toggleCompare(\'' + model.replace(/'/g, "\\'") + '\')">' +
      '<span class="compare-icon material-symbols-outlined text-lg">' + (isSelected ? 'check' : 'compare_arrows') + '</span>' +
    '</button>';
  }

  function buildMobileCompareBtnHTML(model) {
    var isSelected = isProductCompared(model);
    var bgClass = isSelected ? 'bg-primary text-white' : 'bg-white/90 dark:bg-slate-800/90 text-primary';
    var borderClass = isSelected ? 'border-primary' : 'border-slate-300 dark:border-slate-500';
        return '<button class="compare-btn compare-btn-mobile ' + bgClass + ' w-8 h-8 rounded-lg border-2 ' + borderClass + ' flex items-center justify-center shadow-md backdrop-blur-sm" data-model="' + model +
      '" onclick="event.preventDefault();event.stopPropagation();window.ProductGrid.toggleCompare(\'' + model.replace(/'/g, "\\'") + '\')">' +
      '<span class="compare-icon material-symbols-outlined text-[18px]">' + (isSelected ? 'check' : 'compare_arrows') + '</span>' +
    '</button>';
  }

  // ─── Card renderers ────────────────────────────────────────────

  function renderPC(p) {
    var cat = esc(p._category);
    var model = esc(p.model || '');
    var name = esc(p.name || model);
    var desc = esc(p.description || p.card_desc || p.highlights || '');
    var img = esc(p._imageUrl);
    var subCat = esc(p.subCategory || cat);
    var specs = [];
    if (p.power) specs.push(esc(p.power));
    if (p.throughput) specs.push(esc(p.throughput));
    if (p.averageTime) specs.push(esc(p.averageTime));
    var specHTML = specs.map(function(s) {
      return '<span class="spec-badge px-2 py-1 rounded text-xs font-medium text-primary">' + s + '</span>';
    }).join('');
    var badge = '';
    if (p.badge) {
      badge = '<span class="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">' + esc(p.badge) + '</span>';
    }
    var link = '/products/' + encodeURIComponent(model) + '/';
    var isSelected = isProductCompared(p.model);
    var selectedClass = isSelected ? ' compare-selected' : '';
        return '<article class="product-card group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden' + selectedClass + '" data-category="' + cat + '" data-tier="' + esc(p.tier || '') +
      '" data-model="' + model + '" data-sort-order="' + (p.sort_order || 0) + '" data-created="' + (p.created_at || '') + '">' +
      '<div class="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-700">' +
        '<img loading="lazy" alt="' + name + '" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="' + img + '" onerror="if(!this.dataset.errored){this.dataset.errored=\'1\';this.src=\'/assets/images/products/default.webp\' }">' +
        (badge ? '<div class="absolute top-4 left-4 flex gap-2">' + badge + '</div>' : '') +
      '</div>' +
      '<div class="p-6">' +
        '<div class="flex items-center gap-2 mb-3"><span class="material-symbols-outlined text-primary text-sm">local_fire_department</span><span class="text-xs font-bold text-primary uppercase tracking-wider">' + subCat + '</span></div>' +
        '<h3 class="text-xl font-bold mb-2 text-slate-900 dark:text-white">' + name + '</h3>' +
        '<p class="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">' + desc + '</p>' +
        (specHTML ? '<div class="flex flex-wrap gap-2 mb-4">' + specHTML + '</div>' : '') +
        '<div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">' +
          '<div><span class="text-xs text-slate-400">起售价</span><p class="text-xl font-black text-primary">询价</p></div>' +
          '<div class="flex items-center gap-2">' +
            '<a href="' + link + '" class="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"><span>查看详情</span><span class="material-symbols-outlined text-sm">arrow_forward</span></a>' +
            buildCompareBtnHTML(model) +
          '</div>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderTablet(p) {
    var cat = esc(p._category);
    var model = esc(p.model || '');
    var name = esc(p.name || model);
    var desc = esc(p.description || p.card_desc || '');
    var img = esc(p._imageUrl);
    var subCat = esc(p.subCategory || cat);
    var badge = '';
    if (p.badge) {
      badge = '<span class="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded">' + esc(p.badge) + '</span>';
    }
    var link = '/products/' + encodeURIComponent(model) + '/';
    var isSelected = isProductCompared(p.model);
    var selectedClass = isSelected ? ' compare-selected' : '';
        return '<article class="product-card-tablet bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden' + selectedClass + '" data-category="' + cat + '" data-model="' + model + '" data-tier="' +
      esc(p.tier || '') + '" data-sort-order="' + (p.sort_order || 0) + '" data-created="' + (p.created_at || '') + '">' +
      '<div class="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-700">' +
        '<img loading="lazy" alt="' + name + '" class="w-full h-full object-cover" src="' + img + '" onerror="if(!this.dataset.errored){this.dataset.errored=\'1\';this.src=\'/assets/images/products/default.webp\' }">' +
        (badge ? '<div class="absolute top-3 left-3 flex gap-1.5">' + badge + '</div>' : '') +
      '</div>' +
      '<div class="p-4">' +
        '<div class="flex items-center gap-1.5 mb-2"><span class="material-symbols-outlined text-primary text-xs">local_fire_department</span><span class="text-[10px] font-bold text-primary uppercase tracking-wider">' + subCat + '</span></div>' +
        '<h3 class="text-base font-bold mb-1 text-slate-900 dark:text-white">' + name + '</h3>' +
        '<p class="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">' + desc + '</p>' +
        '<div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">' +
          '<span class="text-base font-black text-primary">询价</span>' +
          '<div class="flex items-center gap-2">' +
            '<a href="' + link + '" class="flex items-center gap-1 text-primary text-sm font-bold hover:underline"><span>查看详情</span><span class="material-symbols-outlined text-xs">arrow_forward</span></a>' +
            buildCompareBtnHTML(model) +
          '</div>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderMobile(p) {
    var cat = esc(p._category);
    var model = esc(p.model || '');
    var name = esc(p.name || model);
    var desc = esc(p.description || p.card_desc || '');
    var img = esc(p._imageUrl);
    var link = '/products/' + encodeURIComponent(model) + '/';
    var isSelected = isProductCompared(p.model);
    var selectedClass = isSelected ? ' compare-selected' : '';
        return '<article class="product-card-mobile bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative' + selectedClass + '" data-category="' + cat + '" data-model="' + model + '" data-tier="' +
      esc(p.tier || '') + '" data-sort-order="' + (p.sort_order || 0) + '" data-created="' + (p.created_at || '') + '">' +
      buildMobileCompareBtnHTML(model) +
      '<a href="' + link + '" class="flex gap-4 p-3">' +
        '<div class="w-24 h-24 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden">' +
          '<img loading="lazy" alt="' + name + '" class="w-full h-full object-cover" src="' + img + '" onerror="if(!this.dataset.errored){this.dataset.errored=\'1\';this.src=\'/assets/images/products/default.webp\' }">' +
        '</div>' +
        '<div class="flex-1 min-w-0">' +
          '<h3 class="text-sm font-bold text-slate-900 dark:text-white mb-1 truncate">' + name + '</h3>' +
          '<p class="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">' + desc + '</p>' +
          '<div class="flex items-center justify-between">' +
            '<span class="text-sm font-black text-primary">询价</span>' +
            '<span class="material-symbols-outlined text-slate-400 text-sm">arrow_forward</span>' +
          '</div>' +
        '</div>' +
      '</a>' +
    '</article>';
  }

  // ─── Grid rendering with pagination ──────────────────────────
  var _shownCount = {};

  function getPageSize() {
    var w = window.innerWidth || 1024;
    if (w >= 1280) return 12;  // PC: 4 cols × 3 rows
    if (w >= 768) return 9;   // Tablet: 3 cols × 3 rows
    return 6;                  // Mobile: 2 cols × 3 rows
  }

  function renderGrid(containerId, renderer, maxCount) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var products = getAllProducts();
    var total = products.length;
    var initial = Math.min(total, getPageSize());
    _shownCount[containerId] = initial;
    container.innerHTML = products.slice(0, initial).map(renderer).join('');
    updateLoadMoreBtn(containerId, total, initial);
    bindLoadMore(containerId, renderer, products);
    // Init floating bar after grid render
    createFloatingBar();
  }

  function updateLoadMoreBtn(containerId, total, shown) {
    var loadMore = document.querySelector('[data-i18n="products_load_more"]');
    if (loadMore) loadMore.style.display = total <= shown ? 'none' : '';
  }

  function bindLoadMore(containerId, renderer, products) {
    var loadMore = document.querySelector('[data-i18n="products_load_more"]');
    if (!loadMore || loadMore._bound) return;
    loadMore._bound = true;
    loadMore.addEventListener('click', function() {
      var container = document.getElementById(containerId);
      if (!container) return;
      var shown = _shownCount[containerId] || getPageSize();
      var next = Math.min(shown + getPageSize(), products.length);
      _shownCount[containerId] = next;
      // Append new products
      container.innerHTML = products.slice(0, next).map(renderer).join('');
      updateLoadMoreBtn(containerId, products.length, next);
      // Re-sync compare button states for newly rendered cards
      updateCompareButtons();
    });
  }

  // ─── Auto render ───────────────────────────────────────────────

  function autoRender() {
    if (Array.isArray(window[STORE_KEY]) && window[STORE_KEY].length > 0) {
      doRender();
    } else {
      loadFromAPI(doRender);
    }
  }

  function doRender() {
    if (!getCategories().length) return;
    if (document.getElementById('product-list')) {
      renderGrid('product-list', renderMobile, 100);
    } else if (document.getElementById('product-grid')) {
      var grid = document.getElementById('product-grid');
      if (grid && grid.classList.contains('md:grid-cols-2')) {
        renderGrid('product-grid', renderPC, 100);
      } else {
        renderGrid('product-grid', renderTablet, 100);
      }
    }
    initCategoryTabs();
  }

  // ─── Category tabs ─────────────────────────────────────────────

  function initCategoryTabs() {
    var container = document.querySelector('.category-tab-container');
    if (!container) return;

    // Prevent duplicate init
    if (container._categoryTabsInit) return;
    container._categoryTabsInit = true;

    var categories = [];
    getCategories().forEach(function(cat) {
      var name = cat.categoryName || cat.category;
      if (name) {
        // Translate category if it's an i18n key (e.g. nav_products_stirfry)
        var translated = (typeof window.t === 'function') ? window.t(cat.category) : null;
        var label = (translated && translated !== cat.category) ? translated : name;
        categories.push({ key: cat.category, name: label });
      }
    });
    if (!categories.length) return;

    // Build tab buttons
    var allTabs = [];
    var isMobile = window.innerWidth < 768;
    var tabSizeClass = isMobile
      ? 'px-3 py-1.5 text-xs'
      : 'px-4 py-2 text-sm';

    // "全部产品" button
    var allBtn = document.createElement('button');
    allBtn.className = 'category-tab active ' + tabSizeClass + ' font-bold whitespace-nowrap rounded-full border border-slate-200 dark:border-slate-700';
    allBtn.dataset.category = 'all';
    allBtn.textContent = '全部产品';
    allTabs.push(allBtn);

    categories.forEach(function(cat) {
      var btn = document.createElement('button');
      btn.className = 'category-tab ' + tabSizeClass + ' font-medium whitespace-nowrap rounded-full border border-slate-200 dark:border-slate-700';
      btn.dataset.category = cat.key;
      btn.textContent = cat.name;
      allTabs.push(btn);
    });

    // "More" toggle button
    var moreBtn = document.createElement('button');
    moreBtn.className = 'category-tab-more px-3 py-2 text-xs font-bold whitespace-nowrap rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-pointer';

    // Dynamic visible tab count: measures actual tab widths against container
    var dynamicMax = Infinity;
    function calcDynamicMax() {
      if (window.innerWidth >= 1280) { dynamicMax = Infinity; return; }
      var totalAvailable = container.clientWidth || container.offsetWidth;
      if (totalAvailable <= 0) { dynamicMax = 3; return; }
      // Create a temp more-btn to measure its real width
      var tmpMore = moreBtn.cloneNode(true);
      tmpMore.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
      tmpMore.textContent = '+9 更多 \u25BC';  // worst-case width estimate
      container.appendChild(tmpMore);
      var moreBtnWidth = tmpMore.offsetWidth + 8;  // +8 for gap
      container.removeChild(tmpMore);

      // Create a hidden wrapper to measure all tab widths
      var measureWrap = document.createElement('div');
      measureWrap.style.cssText = 'display:inline-flex;position:absolute;visibility:hidden;pointer-events:none';
      container.appendChild(measureWrap);
      var used = 0;
      var fit = 0;
      for (var i = 0; i < allTabs.length; i++) {
        var clone = allTabs[i].cloneNode(true);
        measureWrap.appendChild(clone);
        var w = clone.offsetWidth + 8;  // 8px gap between tabs
        if (used + w > totalAvailable - moreBtnWidth) {
          clone.remove();
          break;
        }
        used += w;
        fit++;
      }
      container.removeChild(measureWrap);
      dynamicMax = Math.max(fit, 2);  // at least 2 visible
    }

    var isExpanded = false;

    function getVisibleCount() {
      if (window.innerWidth >= 1280) return Infinity;
      return dynamicMax;
    }

    function renderTabs() {
      container.innerHTML = '';
      var maxVis = getVisibleCount();
      var showCount = isExpanded ? allTabs.length : Math.min(maxVis, allTabs.length);
      // Mobile: allow wrap when expanded, prevent when collapsed
      if (isMobile) {
        container.style.flexWrap = isExpanded ? 'wrap' : 'nowrap';
        container.style.overflow = isExpanded ? 'visible' : 'hidden';
      }
      for (var i = 0; i < showCount; i++) {
        container.appendChild(allTabs[i]);
      }
      if (allTabs.length > maxVis) {
        var remaining = allTabs.length - maxVis;
        moreBtn.textContent = isExpanded ? ('收起 \u25B2') : ('\u002B' + remaining + ' 更多 \u25BC');
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
        document.fonts.ready.then(function() {
          requestAnimationFrame(function() {
            calcDynamicMax();
            renderTabs();
          });
        });
      }
      // Also recalculate after a short delay as a safety net (images, etc.)
      setTimeout(function() {
        calcDynamicMax();
        renderTabs();
      }, 300);
    }

    // Recalculate on resize (debounced)
    var resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        calcDynamicMax();
        renderTabs();
      }, 150);
    });

    // More button toggle
    moreBtn.addEventListener('click', function(ev) {
      ev.stopPropagation();
      isExpanded = !isExpanded;
      renderTabs();
    });

    // Tab click handler
    container.addEventListener('click', function(ev) {
      var btn = ev.target.closest('.category-tab');
      if (!btn) return;
      var cat = btn.dataset.category;

      // Update active state
      container.querySelectorAll('.category-tab').forEach(function(b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');

      // Filter products
      var selector = '#product-grid .product-card, #product-grid .product-card-tablet, #product-list .product-card-mobile';
      document.querySelectorAll(selector).forEach(function(card) {
        card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
      });
    });

    // Filter chip click handler
    document.querySelectorAll('.filter-chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        document.querySelectorAll('.filter-chip').forEach(function(c) { c.classList.remove('active'); });
        this.classList.add('active');
        applyTierFilter();
      });
    });

  }

  // ─── Tier filter ────────────────────────────────────────────────

  function applyTierFilter() {
    var activeChip = document.querySelector('.filter-chip.active');
    var tierFilter = (activeChip ? activeChip.dataset.filter : 'all') || 'all';
    var cards = Array.from(container.children);
    // Filter by tier
    cards.forEach(function(card) {
      var tier = card.dataset.tier || '';
      card.style.display = (tierFilter === 'all' || tier === tierFilter) ? '' : 'none';
    });
  }

  // ─── Init ──────────────────────────────────────────────────────

  console.log('[ProductGrid] Script loaded');

  if (document.readyState !== 'loading') {
    autoRender();
  } else {
    document.addEventListener('DOMContentLoaded', autoRender);
  }

  window.addEventListener('product-data-ready', function() {
    autoRender();
  });

  document.addEventListener('spa:load', function() {
    // Reset init flag and pagination for SPA navigation
    document.querySelectorAll('.category-tab-container').forEach(function(el) {
      el._categoryTabsInit = false;
    });
    _shownCount = {};
    var loadMore = document.querySelector('[data-i18n="products_load_more"]');
    if (loadMore) loadMore._bound = false;
    autoRender();
  });

  // Public API
  window.ProductGrid = {
    renderPC: function(max) { renderGrid('product-grid', renderPC, max); },
    renderTablet: function(max) { renderGrid('product-grid', renderTablet, max); },
    renderMobile: function(max) { renderGrid('product-list', renderMobile, max); },
    getAll: getAllProducts,
    renderCustom: function(id, renderer, max) { renderGrid(id, renderer, max); },
    toggleCompare: toggleCompareFromCard,
    getCompareItems: getCompareItems,
    saveCompareItems: saveCompareItems,
    clearCompareItems: clearCompareItems,
    removeCompareItem: removeCompareItem
  };
})();

