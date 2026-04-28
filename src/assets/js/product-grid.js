/**
 * ProductGrid — renders product cards and manages category tabs
 * Supports PC / tablet / mobile layouts via CSS classes
 */
(function() {
  'use strict';

  var STORE_KEY = 'PRODUCT_DATA_TABLE';

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
    return '<article class="product-card group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" data-category="' + cat + '" data-tier="' + esc(p.tier || '') + '" data-model="' + model + '" data-sort-order="' + (p.sort_order || 0) + '" data-created="' + (p.created_at || '') + '">' +
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
          '<a href="' + link + '" class="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"><span>查看详情</span><span class="material-symbols-outlined text-sm">arrow_forward</span></a>' +
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
    return '<article class="product-card-tablet bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden" data-category="' + cat + '" data-model="' + model + '" data-tier="' + esc(p.tier || '') + '" data-sort-order="' + (p.sort_order || 0) + '" data-created="' + (p.created_at || '') + '">' +
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
          '<a href="' + link + '" class="flex items-center gap-1 text-primary text-sm font-bold hover:underline"><span>查看详情</span><span class="material-symbols-outlined text-xs">arrow_forward</span></a>' +
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
    return '<article class="product-card-mobile bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden" data-category="' + cat + '" data-model="' + model + '" data-tier="' + esc(p.tier || '') + '" data-sort-order="' + (p.sort_order || 0) + '" data-created="' + (p.created_at || '') + '">' +
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

  // ─── Grid rendering ────────────────────────────────────────────

  function renderGrid(containerId, renderer, maxCount) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var products = getAllProducts();
    var total = products.length;
    var show = Math.min(total, maxCount || 100);
    container.innerHTML = products.slice(0, maxCount || 100).map(renderer).join('');
    var loadMore = container.parentElement && container.parentElement.querySelector('[data-i18n="products_load_more"]')
      || document.querySelector('[data-i18n="products_load_more"]');
    if (loadMore) loadMore.style.display = total <= show ? 'none' : '';
  }

  // ─── Auto render ───────────────────────────────────────────────

  function autoRender() {
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
      if (name) categories.push({ key: cat.category, name: name });
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
    // Reset init flag for SPA navigation
    document.querySelectorAll('.category-tab-container').forEach(function(el) {
      el._categoryTabsInit = false;
    });
    autoRender();
  });

  window.ProductGrid = {
    renderPC: function(max) { renderGrid('product-grid', renderPC, max); },
    renderTablet: function(max) { renderGrid('product-grid', renderTablet, max); },
    renderMobile: function(max) { renderGrid('product-list', renderMobile, max); },
    getAll: getAllProducts,
    renderCustom: function(id, renderer, max) { renderGrid(id, renderer, max); }
  };
})();
