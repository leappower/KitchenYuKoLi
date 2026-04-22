/**
 * product-grid.js — 产品网格动态渲染引擎
 * 从 window.PRODUCT_DATA_TABLE 读取数据，替换硬编码 HTML 卡片
 * 依赖：window.PRODUCT_DATA_TABLE（CMS publish 生成）
 */
(function () {
  'use strict';

  var DATA_KEY = 'PRODUCT_DATA_TABLE';

  function getProducts() {
    return Array.isArray(window[DATA_KEY]) ? window[DATA_KEY] : [];
  }

  function getAllProducts() {
    var products = [];
    getProducts().forEach(function (series) {
      if (series.products && Array.isArray(series.products)) {
        series.products.forEach(function (p) {
          // Resolve primary image from images array (CMS publish format)
          var primaryImg = '/assets/images/products/' + (p.model || 'default') + '.webp';
          if (p.images && Array.isArray(p.images) && p.images.length > 0) {
            var pri = p.images.find(function(img) { return img.isPrimary; }) || p.images[0];
            if (pri && pri.filePath) primaryImg = pri.filePath;
          } else if (p.image) {
            primaryImg = p.image;
          } else if (p.imageUrl) {
            primaryImg = p.imageUrl;
          }
          products.push(Object.assign({}, p, {
            _category: series.category || series.slug || '',
            _imageUrl: primaryImg
          }));
        });
      }
    });
    return products;
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function t(key) {
    if (window.translationManager && window.translationManager.t) return window.translationManager.t(key) || key;
    return key;
  }

  // ─── PC Card Template ───────────────────────────────────────
  function renderPCCard(p) {
    var category = esc(p._category);
    var model = esc(p.model || '');
    var name = esc(p.name || model);
    var desc = esc(p.description || p.card_desc || p.highlights || '');
    var img = esc(p._imageUrl);
    var specs = [];
    if (p.power) specs.push(esc(p.power));
    if (p.throughput) specs.push(esc(p.throughput));
    if (p.averageTime) specs.push(esc(p.averageTime));
    var specBadges = specs.map(function (s) { return '<span class="spec-badge px-2 py-1 rounded text-xs font-medium text-primary">' + s + '</span>'; }).join('');
    var badge = '';
    if (p.badge) badge = '<span class="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">' + esc(p.badge) + '</span>';
    var pdpLink = '/pdp/?model=' + encodeURIComponent(model);

    return '<article class="product-card group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" data-category="' + category + '" data-tier="' + esc(p.tier || '') + '" data-model="' + model + '" data-sort-order="' + (p.sort_order || 0) + '" data-created="' + (p.created_at || '') + '">' +
      '<div class="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-700">' +
      '<img loading="lazy" alt="' + name + '" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="' + img + '" onerror="if(!this.dataset.errored){this.dataset.errored=\'1\';this.src=\'/assets/images/products/default.webp\' }">' +
      (badge ? '<div class="absolute top-4 left-4 flex gap-2">' + badge + '</div>' : '') +
      '</div>' +
      '<div class="p-6">' +
      '<div class="flex items-center gap-2 mb-3">' +
      '<span class="material-symbols-outlined text-primary text-sm">local_fire_department</span>' +
      '<span class="text-xs font-bold text-primary uppercase tracking-wider">' + esc(p.subCategory || category) + '</span>' +
      '</div>' +
      '<h3 class="text-xl font-bold mb-2 text-slate-900 dark:text-white">' + name + '</h3>' +
      '<p class="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">' + desc + '</p>' +
      (specBadges ? '<div class="flex flex-wrap gap-2 mb-4">' + specBadges + '</div>' : '') +
      '<div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">' +
      '<div><span class="text-xs text-slate-400">起售价</span><p class="text-xl font-black text-primary">询价</p></div>' +
      '<a href="' + pdpLink + '" class="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">' +
      '<span>查看详情</span><span class="material-symbols-outlined text-sm">arrow_forward</span></a>' +
      '</div></div></article>';
  }

  // ─── Tablet Card Template ───────────────────────────────────
  function renderTabletCard(p) {
    var model = esc(p.model || '');
    var name = esc(p.name || model);
    var desc = esc(p.description || p.card_desc || '');
    var img = esc(p._imageUrl);
    var pdpLink = '/pdp/?model=' + encodeURIComponent(model);
    var badge = p.badge ? '<span class="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded">' + esc(p.badge) + '</span>' : '';

    return '<article class="product-card-tablet bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden" data-model="' + model + ' data-tier="' + esc(p.tier || '') + ' data-sort-order="' + (p.sort_order || 0) + ' data-created="' + (p.created_at || '') + '">' +
      '<div class="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-700">' +
      '<img loading="lazy" alt="' + name + '" class="w-full h-full object-cover" src="' + img + '" onerror="if(!this.dataset.errored){this.dataset.errored=\'1\';this.src=\'/assets/images/products/default.webp\' }">' +
      (badge ? '<div class="absolute top-3 left-3 flex gap-1.5">' + badge + '</div>' : '') +
      '</div>' +
      '<div class="p-4">' +
      '<div class="flex items-center gap-1.5 mb-2"><span class="material-symbols-outlined text-primary text-xs">local_fire_department</span>' +
      '<span class="text-[10px] font-bold text-primary uppercase tracking-wider">' + esc(p.subCategory || p._category) + '</span></div>' +
      '<h3 class="text-base font-bold mb-1 text-slate-900 dark:text-white">' + name + '</h3>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">' + desc + '</p>' +
      '<div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">' +
      '<span class="text-base font-black text-primary">询价</span>' +
      '<a href="' + pdpLink + '" class="flex items-center gap-1 text-xs font-bold hover:text-primary"><span>查看详情</span><span class="material-symbols-outlined text-xs">arrow_forward</span></a>' +
      '</div></div></article>';
  }

  // ─── Mobile Card Template ───────────────────────────────────
  function renderMobileCard(p) {
    var model = esc(p.model || '');
    var name = esc(p.name || model);
    var desc = esc(p.description || p.card_desc || '');
    var img = esc(p._imageUrl);
    var pdpLink = '/pdp/?model=' + encodeURIComponent(model);

    return '<article class="product-card-mobile bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden" data-model="' + model + ' data-tier="' + esc(p.tier || '') + ' data-sort-order="' + (p.sort_order || 0) + ' data-created="' + (p.created_at || '') + '">' +
      '<a href="' + pdpLink + '" class="flex gap-4 p-3">' +
      '<div class="w-24 h-24 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden">' +
      '<img loading="lazy" alt="' + name + '" class="w-full h-full object-cover" src="' + img + '" onerror="if(!this.dataset.errored){this.dataset.errored=\'1\';this.src=\'/assets/images/products/default.webp\' }">' +
      '</div>' +
      '<div class="flex-1 min-w-0">' +
      '<h3 class="text-sm font-bold text-slate-900 dark:text-white mb-1 truncate">' + name + '</h3>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">' + desc + '</p>' +
      '<div class="flex items-center justify-between">' +
      '<span class="text-sm font-black text-primary">询价</span>' +
      '<span class="material-symbols-outlined text-slate-400 text-sm">arrow_forward</span>' +
      '</div></div></a></article>';
  }

  // ─── Grid Renderer ──────────────────────────────────────────
  function renderGrid(containerId, renderer, limit) {
    var grid = document.getElementById(containerId);
    if (!grid) return;
    var products = getAllProducts();
    var html = products.slice(0, limit || 100).map(renderer).join('');
    grid.innerHTML = html;
  }

  // ─── Auto-render on SPA navigation ──────────────────────
  function autoRender() {
    console.log('[ProductGrid] autoRender called, readyState:', document.readyState,
      'PRODUCT_DATA_TABLE:', window.PRODUCT_DATA_TABLE ? window.PRODUCT_DATA_TABLE.length + ' items' : 'MISSING',
      'grid:', !!document.getElementById('product-grid'),
      'list:', !!document.getElementById('product-list'),
      'url:', location.pathname);
    // Ensure data is available
    if (!getProducts().length) {
      console.log('[ProductGrid] No products data, skipping render');
      return;
    }
    // Detect device and render
    if (document.getElementById('product-grid')) {
      if (document.getElementById('product-list')) {
        console.log('[ProductGrid] Rendering mobile:', getProducts().length, 'products');
        renderGrid('product-list', renderMobileCard, 100);
      } else {
        // PC or Tablet — detect by grid cols
        var grid = document.getElementById('product-grid');
        if (grid && grid.classList.contains('md:grid-cols-2')) {
          console.log('[ProductGrid] Rendering PC:', getProducts().length, 'products');
          renderGrid('product-grid', renderPCCard, 100);
        } else {
          console.log('[ProductGrid] Rendering Tablet:', getProducts().length, 'products');
          renderGrid('product-grid', renderTabletCard, 100);
        }
      }
    } else {
      console.log('[ProductGrid] No #product-grid or #product-list element found');
    }
  }

  // ─── Dynamic category tabs ───────────────────────────────────
  // Replaces hardcoded category tabs in products page HTML.
  // Called after render so the DOM has product cards with data-category.
  function setupCategoryTabs() {
    var tabContainer = document.querySelector('.category-tab') && document.querySelector('.category-tab').parentElement;
    if (!tabContainer) return;
    // Get unique categories from PRODUCT_DATA_TABLE (including empty ones)
    var categories = [];
    getProducts().forEach(function(series) {
      // Use categoryName for display, fallback to i18n translation, then raw key
      var displayName = series.categoryName || (typeof t === 'function' ? t(series.category) : null) || series.category;
      categories.push({ key: series.category, name: displayName, count: (series.products || []).length });
    });
    if (!categories.length) return;
    // Build tabs: All + each category
    var allTab = document.createElement('button');
    allTab.className = 'category-tab active px-4 py-2 text-sm font-bold whitespace-nowrap';
    allTab.dataset.category = 'all';
    allTab.textContent = '全部产品';
    var html = allTab.outerHTML + ' ';
    categories.forEach(function(cat) {
      var label = esc(cat.name) + (cat.count > 0 ? '' : '');
      html += '<button class="category-tab px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white whitespace-nowrap transition-colors" data-category="' + esc(cat.key) + '">' + label + '</button> ';
    });
    tabContainer.innerHTML = html;
    // Bind click events with delegation on parent
    tabContainer.addEventListener('click', function(e) {
      var tab = e.target.closest('.category-tab');
      if (!tab) return;
      var category = tab.dataset.category;
      tabContainer.querySelectorAll('.category-tab').forEach(function(t) { t.classList.remove('active'); t.classList.add('text-slate-500'); });
      tab.classList.add('active');
      tab.classList.remove('text-slate-500');
      document.querySelectorAll('#product-grid .product-card, #product-list .product-card-mobile').forEach(function(card) {
        card.style.display = (category === 'all' || card.dataset.category === category) ? '' : 'none';
      });
    });
    // Bind filter-chips (industrial/commercial/compact) + sort select
    document.querySelectorAll('.filter-chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        var tier = this.dataset.filter;
        document.querySelectorAll('.filter-chip').forEach(function(c) { c.classList.remove('active'); });
        this.classList.add('active');
        applyFilters();
      });
    });
    var sortSelect = document.querySelector('#products .flex select');
    if (sortSelect) {
      sortSelect.addEventListener('change', function() { applyFilters(); });
    }
    function applyFilters() {
      var activeTier = (document.querySelector('.filter-chip.active') || {}).dataset || { filter: 'all' };
      var tierFilter = activeTier.filter || 'all';
      var sortBy = sortSelect ? sortSelect.value : 'featured';
      var grid = document.getElementById('product-grid') || document.getElementById('product-list');
      if (!grid) return;
      var cards = Array.from(grid.children);
      // Filter by tier
      cards.forEach(function(card) {
        var cardTier = card.dataset.tier || '';
        card.style.display = (tierFilter === 'all' || cardTier === tierFilter) ? '' : 'none';
      });
      // Sort visible cards
      var visible = cards.filter(function(c) { return c.style.display !== 'none'; });
      visible.sort(function(a, b) {
        if (sortBy === 'newest') {
          return (b.dataset.created || '').localeCompare(a.dataset.created || '');
        } else if (sortBy === 'capacity') {
          return (b.dataset.sortOrder || 0) - (a.dataset.sortOrder || 0);
        }
        return 0; // featured = default order
      });
      visible.forEach(function(card) { grid.appendChild(card); });
    }
  }

  console.log('[ProductGrid] Script loaded, registering events');
  // Try immediately + listen for events
  if (document.readyState !== 'loading') autoRender();
  else document.addEventListener('DOMContentLoaded', autoRender);
  window.addEventListener('product-data-ready', function() {
    console.log('[ProductGrid] product-data-ready event fired');
    autoRender();
    setTimeout(setupCategoryTabs, 50);
  });
  document.addEventListener('spa:load', function() {
    console.log('[ProductGrid] spa:load event fired');
    autoRender();
    setTimeout(setupCategoryTabs, 50);
  });

  // ─── Public API ─────────────────────────────────────────────
  window.ProductGrid = {
    renderPC: function (limit) { renderGrid('product-grid', renderPCCard, limit); },
    renderTablet: function (limit) { renderGrid('product-grid', renderTabletCard, limit); },
    renderMobile: function (limit) { renderGrid('product-list', renderMobileCard, limit); },
    getAll: getAllProducts,
    renderCustom: function (containerId, renderer, limit) { renderGrid(containerId, renderer, limit); }
  };
})();
