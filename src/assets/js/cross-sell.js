/**
 * cross-sell.js — Cross-sell recommendations & scene entry links
 * 
 * Renders on product category pages only:
 *   - "买了 X 的客户还配了" cross-sell cards
 *   - "适用场景解决方案" scene entry links
 * 
 * Also populates PDP category navigation (#product-category-nav)
 * 
 * Usage: Include this script on product category and detail pages.
 *        Requires <div id="cross-sell-container"></div> and
 *              <div id="scene-entry-container"></div> in HTML (category pages),
 *              <div id="product-category-nav"></div> (PDP pages).
 */
;(function() {
  'use strict';

  function tl(key, fallback) {
    if (typeof window.t === 'function') {
      var result = window.t(key);
      if (result && result !== key) return result;
    }
    return fallback || key;
  }

  // ─── Category data ────────────────────────────────────────────

  var PRODUCT_SLUGS = {
    'stirfry':  { key: 'nav_products_stirfry',  label: '翻炒系列', icon: 'local_fire_department' },
    'cutting':  { key: 'nav_products_cutting',  label: '切配系列', icon: 'content_cut' },
    'frying':   { key: 'nav_products_frying',   label: '煎炸系列', icon: 'outdoor_grill' },
    'stewing':  { key: 'nav_products_stewing',  label: '炖煮系列', icon: 'soup_kitchen' },
    'steaming': { key: 'nav_products_steaming', label: '蒸煮系列', icon: 'cloud' },
    'other':    { key: 'nav_products_other',    label: '辅助设备', icon: 'more_horiz' }
  };

  var CATEGORY_KEY_TO_SLUG = {};
  Object.keys(PRODUCT_SLUGS).forEach(function(slug) {
    CATEGORY_KEY_TO_SLUG[PRODUCT_SLUGS[slug].key] = slug;
  });

  // ─── Cross-sell map ───────────────────────────────────────────

  var CROSS_SELL_MAP = {
    'stirfry':  [
      { slug: 'cutting',  reason: '备料+翻炒一条龙', emoji: '🔪' },
      { slug: 'steaming', reason: '蒸炒搭配出餐更快', emoji: '⬆️' },
      { slug: 'other',    reason: '后厨动线完整配置', emoji: '⚙️' }
    ],
    'cutting':  [
      { slug: 'stirfry',  reason: '切配+烹饪全程自动化', emoji: '🔥' },
      { slug: 'steaming', reason: '前处理+蒸煮一体化', emoji: '⬆️' }
    ],
    'frying':   [
      { slug: 'stirfry',  reason: '炸+炒双线出餐', emoji: '🔥' },
      { slug: 'cutting',  reason: '备料效率翻倍', emoji: '🔪' }
    ],
    'stewing':  [
      { slug: 'stirfry',  reason: '炖+炒组合满足多样菜品', emoji: '🔥' },
      { slug: 'steaming', reason: '炖煮+蒸饭同步进行', emoji: '⬆️' }
    ],
    'steaming': [
      { slug: 'stirfry',  reason: '蒸+炒搭档，菜单更丰富', emoji: '🔥' },
      { slug: 'cutting',  reason: '蒸前备料效率提升', emoji: '🔪' }
    ],
    'other':    [
      { slug: 'stirfry',  reason: '核心烹饪设备搭配', emoji: '🔥' },
      { slug: 'cutting',  reason: '后厨流水线完整配置', emoji: '🔪' }
    ]
  };

  var SCENE_ENTRY_MAP = {
    'stirfry':  [
      { href: '/applications/small-restaurant/', slug: 'small-restaurant', icon: 'storefront' },
      { href: '/applications/canteen/',          slug: 'canteen',          icon: 'school' },
      { href: '/applications/central-kitchen/',  slug: 'central-kitchen',  icon: 'apartment' }
    ],
    'cutting':  [
      { href: '/applications/central-kitchen/',  slug: 'central-kitchen',  icon: 'apartment' },
      { href: '/applications/food-factory/',     slug: 'food-factory',     icon: 'factory' }
    ],
    'frying':   [
      { href: '/applications/small-restaurant/', slug: 'small-restaurant', icon: 'storefront' },
      { href: '/applications/chain-restaurant/', slug: 'chain-restaurant', icon: 'store' }
    ],
    'stewing':  [
      { href: '/applications/canteen/',          slug: 'canteen',          icon: 'school' },
      { href: '/applications/central-kitchen/',  slug: 'central-kitchen',  icon: 'apartment' }
    ],
    'steaming': [
      { href: '/applications/canteen/',          slug: 'canteen',          icon: 'school' },
      { href: '/applications/central-kitchen/',  slug: 'central-kitchen',  icon: 'apartment' }
    ],
    'other':    [
      { href: '/applications/canteen/',          slug: 'canteen',          icon: 'school' },
      { href: '/applications/chain-restaurant/', slug: 'chain-restaurant', icon: 'store' }
    ]
  };

  var APP_LABELS = {
    'small-restaurant': '小型餐饮',
    'central-kitchen':  '中央厨房',
    'canteen':          '智慧食堂',
    'chain-restaurant': '连锁餐饮',
    'cloud-kitchen':    '云厨房/外卖',
    'food-factory':     '食品工厂',
    'menu-lab':         '菜系实验室'
  };

  function getAppLabel(slug) {
    return tl(APP_LABELS[slug], APP_LABELS[slug]);
  }

  // ─── Detect current page ───────────────────────────────────────

  function detectCategorySlug() {
    var path = (window.location.pathname || '/').replace(/\/$/, '');
    var match = path.match(/^\/products\/(stirfry|cutting|frying|stewing|steaming|other)$/);
    return match ? match[1] : null;
  }

  function isPdpPage() {
    var path = (window.location.pathname || '/').replace(/\/$/, '');
    return /^\/products\/(detail\/?(?:\?model=([^&]+))?|([^/]+))$/.test(path);
  }

  // ─── Renderers ─────────────────────────────────────────────────

  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderCrossSell(slug) {
    var items = CROSS_SELL_MAP[slug];
    if (!items || !items.length) return '';

    var catLabel = tl(PRODUCT_SLUGS[slug].label, PRODUCT_SLUGS[slug].label);
    var html = '<div>';
    html += '<h3 class="text-xl font-bold mb-4 text-slate-900 dark:text-white">' + tl('买了{cat}客户还配了', '买了' + catLabel + '的客户还配了').replace('{cat}', esc(catLabel)) + '</h3>';
    html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">';
    items.forEach(function(item) {
      var info = PRODUCT_SLUGS[item.slug];
      var label = tl(info.label, info.label);
      html += '<a href="/products/' + item.slug + '/" class="group flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-lg transition-all">';
      html += '<div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><span class="text-xl">' + item.emoji + '</span></div>';
      html += '<div class="flex-1 min-w-0"><div class="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">' + esc(label) + '</div>';
      html += '<div class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">' + esc(item.reason) + '</div></div>';
      html += '<span class="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">arrow_forward</span>';
      html += '</a>';
    });
    html += '</div></div>';
    return html;
  }

  function renderSceneEntry(slug) {
    var scenes = SCENE_ENTRY_MAP[slug];
    if (!scenes || !scenes.length) return '';

    var html = '<div>';
    html += '<h3 class="text-xl font-bold mb-4 text-slate-900 dark:text-white">' + tl('适用场景解决方案', '适用场景解决方案') + '</h3>';
    html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">';
    scenes.forEach(function(scene) {
      html += '<a href="' + scene.href + '" class="group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-lg transition-all">';
      html += '<span class="material-symbols-outlined text-2xl text-primary">' + scene.icon + '</span>';
      html += '<div class="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">' + esc(getAppLabel(scene.slug)) + '</div>';
      html += '<span class="material-symbols-outlined text-slate-300 group-hover:text-primary ml-auto transition-colors">arrow_forward</span>';
      html += '</a>';
    });
    html += '</div></div>';
    return html;
  }

  // ─── PDP category nav ─────────────────────────────────────────

  function updatePdpCategoryNav() {
    if (!isPdpPage()) return;

    var nav = document.getElementById('product-category-nav');
    if (!nav) return;

    // Try sessionStorage referrer first
    var referrer = sessionStorage.getItem('pdp_referrer') || '';
    var refSlug = referrer.replace(/\/$/, '').split('/').pop();
    if (refSlug && PRODUCT_SLUGS[refSlug]) {
      showPdpNav(nav, refSlug);
      return;
    }

    // Try to detect from product data (async)
    window.addEventListener('product-data-ready', function onReady() {
      window.removeEventListener('product-data-ready', onReady);
      if (window.ProductGrid && window.ProductGrid.getAllProducts) {
        var path = (window.location.pathname || '/').replace(/\/$/, '');
        var pdpMatch = path.match(/^\/products\/(detail\/?(?:\?model=([^&]+))?|([^/]+))$/);
        var model = pdpMatch ? (pdpMatch[2] || pdpMatch[3] || '') : '';
        var products = window.ProductGrid.getAllProducts();
        var found = products.find(function(p) { return p.model === model; });
        if (found && found._category) {
          var slug = CATEGORY_KEY_TO_SLUG[found._category] || '';
          if (slug) showPdpNav(nav, slug);
        }
      }
    });
  }

  function showPdpNav(nav, slug) {
    var info = PRODUCT_SLUGS[slug];
    if (!info) return;
    var label = tl(info.label, info.label);
    var catLink = nav.querySelector('#pdp-category-link');
    if (catLink) {
      catLink.href = '/products/' + slug + '/';
      catLink.textContent = label;
      catLink.setAttribute('data-i18n', info.key);
    }
    nav.classList.remove('hidden');
  }

  // ─── Referrer tracking ─────────────────────────────────────────

  function trackPdpReferrer() {
    var path = (window.location.pathname || '/').replace(/\/$/, '');
    if (/^\/products\/(stirfry|cutting|frying|stewing|steaming|other)$/.test(path)) {
      sessionStorage.setItem('pdp_referrer', path);
    }
  }

  // ─── Init ─────────────────────────────────────────────────────

  function init() {
    trackPdpReferrer();

    // Category pages: render cross-sell + scene entry
    var slug = detectCategorySlug();
    if (slug) {
      var render = function() {
        var crossSellContainer = document.getElementById('cross-sell-container');
        if (crossSellContainer) {
          var crossSellHtml = renderCrossSell(slug);
          if (crossSellHtml) {
            crossSellContainer.innerHTML = '<div id="cross-sell-wrapper">' + crossSellHtml + '</div>';
          }
        }
        var sceneEntryContainer = document.getElementById('scene-entry-container');
        if (sceneEntryContainer) {
          var sceneHtml = renderSceneEntry(slug);
          if (sceneHtml) {
            sceneEntryContainer.innerHTML = sceneHtml;
          }
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
      } else {
        render();
      }

      window.addEventListener('spa:load', function() {
        var newSlug = detectCategorySlug();
        if (newSlug) {
          slug = newSlug;
          render();
        }
      });
    }

    // PDP pages: populate category nav
    updatePdpCategoryNav();

    // Re-init on SPA navigation
    window.addEventListener('spa:load', function() {
      trackPdpReferrer();
      updatePdpCategoryNav();
    });
  }

  // ─── Public API (for compatibility) ────────────────────────────

  window.Breadcrumb = {
    goBack: function() {
      var referrer = sessionStorage.getItem('pdp_referrer');
      if (referrer && window.location.pathname.indexOf('/products/') === 0 &&
          !/stirfry|cutting|frying|stewing|steaming|other|compare/.test(window.location.pathname.replace('/products/', ''))) {
        if (window.SpaRouter && typeof window.SpaRouter.navigate === 'function') {
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
    PRODUCT_SLUGS: PRODUCT_SLUGS
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
