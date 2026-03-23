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

(function (global) {
  'use strict';

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Fallback tr() if CommonUtils is not loaded yet */
  function tr(key, fallback) {
    if (global.CommonUtils && typeof global.CommonUtils.tr === 'function') {
      return global.CommonUtils.tr(key, fallback);
    }
    var v = typeof global.t === 'function' ? global.t(key) : key;
    return v && v !== key ? v : fallback;
  }

  /** Get translated product name using i18n key pattern */
  function getProductTranslation(i18nId, field, fallback) {
    if (!i18nId) return fallback || '';
    var key = i18nId + '_' + field;
    var val = tr(key);
    if (val && val !== key) return val;
    return fallback || '';
  }

  /** Simple debounce */
  function debounce(fn, ms) {
    ms = ms || 250;
    var timer;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  /** HTML-escape a string */
  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── State ────────────────────────────────────────────────────────────────

  var panel = null;          // DOM reference to results panel
  var isOpen = false;
  var currentQuery = '';
  var highlightedIndex = -1;
  var resultItems = [];      // array of product objects in current results

  // ─── Search Logic ─────────────────────────────────────────────────────────

  /**
   * Build an enhanced product array with translated names for the current language.
   * Each product gets an additional `_searchName` field combining all searchable fields.
   */
  function buildSearchableProducts() {
    var utils = global.AppUtils;
    if (!utils || typeof utils.buildProductCatalog !== 'function') return [];

    var products = utils.buildProductCatalog();
    return products.map(function (p) {
      var translatedName = getProductTranslation(p.i18nId, 'name', p.name);
      var translatedCategory = tr(
        utils.getCategoryI18nKey ? utils.getCategoryI18nKey(p.category) : ('filter_' + p.category),
        p.category
      );
      var translatedBadge = getProductTranslation(p.i18nId, 'badge', p.badge);
      var translatedScenarios = getProductTranslation(p.i18nId, 'scenarios', p.scenarios);
      var translatedUsage = getProductTranslation(p.i18nId, 'usage', p.usage);

      return Object.assign({}, p, {
        _displayName: translatedName || (translatedCategory + ' ' + (p.model || '')).trim(),
        _displayCategory: translatedCategory,
        _displayBadge: translatedBadge,
        _searchText: [
          translatedName,
          p.model,
          translatedCategory,
          p.category,
          translatedScenarios,
          translatedUsage,
          p.voltage,
          p.power,
          translatedBadge
        ].filter(Boolean).join(' ').toLowerCase()
      });
    });
  }

  /**
   * Perform the actual search.
   * @param {string} query - The search query
   * @returns {Array} Matching products (max 8)
   */
  function doSearch(query) {
    if (!query || query.length < 1) return [];

    var q = query.toLowerCase().trim();
    // Split query into tokens for multi-term search; normalize slashes first
    var tokens = q.replace(/\//g, ' ').split(/[\s,，、-]+/).filter(Boolean);

    var allProducts = buildSearchableProducts();
    var results = [];
    var seen = {};

    for (var i = 0; i < allProducts.length && results.length < 8; i++) {
      var p = allProducts[i];
      // Skip inactive
      if (p.isActive === false) continue;

      // Deduplicate by model
      if (seen[p.model]) continue;
      seen[p.model] = true;

      var text = p._searchText;

      // Score-based matching
      var score = 0;
      var matched = false;

      for (var t = 0; t < tokens.length; t++) {
        var token = tokens[t];
        var idx = text.indexOf(token);
        if (idx === -1) {
          matched = false;
          break;
        }
        matched = true;
        // Exact model match gets highest score
        if (p.model && p.model.toLowerCase() === token) {
          score += 100;
        }
        // Model starts-with match
        else if (p.model && p.model.toLowerCase().indexOf(token) === 0) {
          score += 50;
        }
        // Name starts-with match
        else if (p._displayName && p._displayName.toLowerCase().indexOf(token) === 0) {
          score += 30;
        }
        // Any match
        else {
          score += 10;
        }
        // Earlier matches get bonus
        score -= Math.floor(idx / 50);
      }

      if (matched) {
        p._score = score;
        results.push(p);
      }
    }

    // Sort by score descending
    results.sort(function (a, b) { return (b._score || 0) - (a._score || 0); });

    return results;
  }

  // ─── UI Rendering ─────────────────────────────────────────────────────────

  function createPanel() {
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'ios-search-results';
    panel.className = 'ios-search-results';
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('aria-label', 'Search results');
    document.body.appendChild(panel);

    // Close on click outside
    document.addEventListener('mousedown', function (e) {
        if (panel && !panel.contains(e.target)) {
        var bar = document.getElementById('ios-search-bar');
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
    panel.style.display = 'block';
    panel.classList.add('is-visible');

    // Position below search bar
    positionPanel();
  }

  function hidePanel() {
    if (!panel || !isOpen) return;
    isOpen = false;
    highlightedIndex = -1;
    panel.style.display = 'none';
    panel.classList.remove('is-visible');
  }

  function positionPanel() {
    var bar = document.getElementById('ios-search-bar');
    if (!bar || !panel) return;

    var rect = bar.getBoundingClientRect();
    var isRTL = document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar' || document.documentElement.lang === 'he';

    panel.style.position = 'fixed';
    panel.style.top = (rect.bottom + 6) + 'px';
    panel.style.zIndex = '9998';

    if (isRTL) {
      panel.style.right = 'auto';
      panel.style.left = (rect.left) + 'px';
    } else {
      panel.style.left = 'auto';
      panel.style.right = (window.innerWidth - rect.right) + 'px';
    }

    panel.style.width = Math.max(rect.width, 320) + 'px';
  }

  function renderResults(results, query) {
    if (!panel) createPanel();

    if (!results || results.length === 0) {
      var noResultsText = tr('search_no_results', 'No matching products found');
      var hintText = tr('search_hint', 'Try searching by model number or product type');
      panel.innerHTML =
        '<div class="ios-search-empty">' +
          '<span class="material-symbols-outlined ios-search-empty-icon">search_off</span>' +
          '<p class="ios-search-empty-title">' + esc(noResultsText) + '</p>' +
          (query.length >= 2 ? '<p class="ios-search-empty-hint">' + esc(hintText) + '</p>' : '') +
        '</div>';
      showPanel();
      return;
    }

    var countText = tr('search_results_count', '{count} products found')
      .replace('{count}', String(results.length));
    var viewAllText = tr('search_view_all', 'View all products');

    var html = '<div class="ios-search-header">' +
      '<span class="ios-search-count">' + esc(countText) + '</span>' +
      '</div>';

    html += '<div class="ios-search-results-list">';

    for (var i = 0; i < results.length; i++) {
      var p = results[i];
      var idx = i;
      var name = esc(p._displayName || (p._displayCategory + ' ' + p.model));
      var model = esc(p.model || '');
      var category = esc(p._displayCategory || p.category || '');
      var badge = p._displayBadge ? '<span class="ios-search-badge">' + esc(p._displayBadge) + '</span>' : '';
      var imgSrc = p.productImage || (p.imageUrl || '');
      var hlClass = idx === highlightedIndex ? ' is-highlighted' : '';

      html += '<a class="ios-search-result-item' + hlClass + '" ' +
        'href="/products/" data-search-idx="' + idx + '" role="option">' +
        '<div class="ios-search-result-img">' +
          (imgSrc ? '<img src="' + esc(imgSrc) + '" alt="" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">' : '<span class="material-symbols-outlined">inventory_2</span>') +
        '</div>' +
        '<div class="ios-search-result-info">' +
          '<div class="ios-search-result-name">' + name + badge + '</div>' +
          '<div class="ios-search-result-meta">' +
            '<span class="ios-search-result-model">' + model + '</span>' +
            '<span class="ios-search-result-sep">·</span>' +
            '<span class="ios-search-result-category">' + category + '</span>' +
          '</div>' +
        '</div>' +
        '</a>';
    }

    html += '</div>';

    html += '<a class="ios-search-view-all" href="/products/">' +
      '<span>' + esc(viewAllText) + '</span>' +
      '<span class="material-symbols-outlined">arrow_forward</span>' +
      '</a>';

    panel.innerHTML = html;

    // Bind click events on result items
    var items = panel.querySelectorAll('.ios-search-result-item');
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener('click', function (e) {
        hidePanel();
        // Let the SPA router handle navigation
        // The href is already set to /products/
        if (e.target.closest('.ios-search-view-all')) {
          hidePanel();
        }
      });
    }

    // View all link
    var viewAllLink = panel.querySelector('.ios-search-view-all');
    if (viewAllLink) {
      viewAllLink.addEventListener('click', function () {
        hidePanel();
      });
    }

    showPanel();
    resultItems = results;
  }

  function highlightItem(index) {
    var items = panel ? panel.querySelectorAll('.ios-search-result-item') : [];
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-highlighted', i === index);
    }
    highlightedIndex = index;

    // Scroll into view
    if (index >= 0 && items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
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
    var input = document.getElementById('ios-search-input');
    if (!input) {
      console.log('[SearchEngine] ios-search-input not found, skipping init');
      return;
    }

    // Input event
    input.addEventListener('input', function () {
      debouncedSearch(input.value.trim());
    });

    // Focus — show results if there's a query
    input.addEventListener('focus', function () {
      if (currentQuery && currentQuery.length >= 1) {
        showPanel();
      }
    });

    // Keyboard navigation
    input.addEventListener('keydown', function (e) {
      var maxIndex = resultItems.length - 1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            debouncedSearch(input.value.trim());
            return;
          }
          if (highlightedIndex < maxIndex) {
            highlightItem(highlightedIndex + 1);
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (highlightedIndex > 0) {
            highlightItem(highlightedIndex - 1);
          }
          break;

        case 'Enter':
          if (isOpen && highlightedIndex >= 0 && resultItems[highlightedIndex]) {
            e.preventDefault();
            hidePanel();
            // Navigate to products page
            if (global.SpaRouter && global.SpaRouter.navigate) {
              global.SpaRouter.navigate('/products/');
            } else {
              window.location.href = '/products/';
            }
          }
          break;

        case 'Escape':
          hidePanel();
          input.blur();
          break;
      }
    });

    console.log('[SearchEngine] Initialized');
  }

  /**
   * Re-initialize (e.g. after SPA navigation re-renders the header).
   */
  function reinit() {
    panel = null;
    isOpen = false;
    currentQuery = '';
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
    currentQuery = '';
  }

  // ─── Inject Styles (once) ────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('ios-search-results-styles')) return;
    var style = document.createElement('style');
    style.id = 'ios-search-results-styles';
    style.textContent = [
      /* Results dropdown panel */
      '.ios-search-results {',
      '  display: none;',
      '  position: fixed;',
      '  background: rgba(255,255,255,0.98);',
      '  backdrop-filter: blur(20px);',
      '  -webkit-backdrop-filter: blur(20px);',
      '  border: 1px solid rgba(120,120,128,0.15);',
      '  border-radius: 16px;',
      '  box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);',
      '  max-height: 420px;',
      '  overflow-y: auto;',
      '  padding: 8px;',
      '  transition: opacity 0.15s ease, transform 0.15s ease;',
      '  opacity: 0;',
      '  transform: translateY(-4px);',
      '}',
      '.ios-search-results.is-visible {',
      '  opacity: 1;',
      '  transform: translateY(0);',
      '}',

      /* Dark mode */
      'html.dark .ios-search-results {',
      '  background: rgba(30,30,40,0.98);',
      '  border-color: rgba(255,255,255,0.10);',
      '  box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15);',
      '}',

      /* Header with count */
      '.ios-search-header {',
      '  padding: 4px 8px 6px;',
      '  border-bottom: 1px solid rgba(120,120,128,0.12);',
      '  margin-bottom: 4px;',
      '}',
      '.ios-search-count {',
      '  font-size: 11px;',
      '  font-weight: 600;',
      '  color: rgba(60,60,67,0.5);',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.05em;',
      '}',
      'html.dark .ios-search-count { color: rgba(235,235,245,0.4); }',

      /* Result list */
      '.ios-search-results-list { max-height: 300px; overflow-y: auto; }',

      /* Individual result item */
      '.ios-search-result-item {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 10px;',
      '  padding: 8px 10px;',
      '  border-radius: 10px;',
      '  text-decoration: none;',
      '  color: inherit;',
      '  transition: background 0.12s ease;',
      '  cursor: pointer;',
      '}',
      '.ios-search-result-item:hover, .ios-search-result-item.is-highlighted {',
      '  background: rgba(120,120,128,0.08);',
      '}',
      'html.dark .ios-search-result-item:hover, html.dark .ios-search-result-item.is-highlighted {',
      '  background: rgba(255,255,255,0.06);',
      '}',

      /* Product image thumbnail */
      '.ios-search-result-img {',
      '  width: 40px;',
      '  height: 40px;',
      '  flex-shrink: 0;',
      '  border-radius: 8px;',
      '  background: rgba(120,120,128,0.08);',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  overflow: hidden;',
      '}',
      '.ios-search-result-img img {',
      '  width: 100%;',
      '  height: 100%;',
      '  object-fit: contain;',
      '  padding: 2px;',
      '}',
      '.ios-search-result-img .material-symbols-outlined {',
      '  font-size: 20px;',
      '  color: rgba(60,60,67,0.3);',
      '}',
      'html.dark .ios-search-result-img { background: rgba(255,255,255,0.06); }',
      'html.dark .ios-search-result-img .material-symbols-outlined { color: rgba(235,235,245,0.25); }',

      /* Info section */
      '.ios-search-result-info { flex: 1; min-width: 0; }',
      '.ios-search-result-name {',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  color: #1c1c1e;',
      '  line-height: 1.3;',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '  white-space: nowrap;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '}',
      'html.dark .ios-search-result-name { color: #f5f5f7; }',
      '.ios-search-result-meta {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 4px;',
      '  margin-top: 2px;',
      '}',
      '.ios-search-result-model, .ios-search-result-category {',
      '  font-size: 11px;',
      '  color: rgba(60,60,67,0.55);',
      '  white-space: nowrap;',
      '}',
      'html.dark .ios-search-result-model, html.dark .ios-search-result-category {',
      '  color: rgba(235,235,245,0.4);',
      '}',
      '.ios-search-result-sep { color: rgba(60,60,67,0.25); }',
      'html.dark .ios-search-result-sep { color: rgba(235,235,245,0.15); }',

      /* Badge */
      '.ios-search-badge {',
      '  display: inline-block;',
      '  padding: 1px 6px;',
      '  border-radius: 4px;',
      '  background: rgba(236,91,19,0.10);',
      '  color: #ec5b13;',
      '  font-size: 10px;',
      '  font-weight: 700;',
      '  flex-shrink: 0;',
      '  white-space: nowrap;',
      '}',

      /* Empty state */
      '.ios-search-empty {',
      '  text-align: center;',
      '  padding: 20px 16px 16px;',
      '}',
      '.ios-search-empty-icon {',
      '  font-size: 28px;',
      '  color: rgba(60,60,67,0.18);',
      '  margin-bottom: 6px;',
      '}',
      'html.dark .ios-search-empty-icon { color: rgba(235,235,245,0.12); }',
      '.ios-search-empty-title {',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  color: rgba(60,60,67,0.7);',
      '  margin: 0;',
      '}',
      '.ios-search-empty-hint {',
      '  font-size: 11px;',
      '  color: rgba(60,60,67,0.4);',
      '  margin-top: 4px;',
      '}',
      'html.dark .ios-search-empty-title { color: rgba(235,235,245,0.5); }',
      'html.dark .ios-search-empty-hint { color: rgba(235,235,245,0.25); }',

      /* View all link */
      '.ios-search-view-all {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  gap: 4px;',
      '  padding: 8px;',
      '  margin-top: 4px;',
      '  border-top: 1px solid rgba(120,120,128,0.10);',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  color: #ec5b13;',
      '  text-decoration: none;',
      '  border-radius: 8px;',
      '  transition: background 0.12s ease;',
      '  cursor: pointer;',
      '}',
      '.ios-search-view-all:hover { background: rgba(236,91,19,0.06); }',
      '.ios-search-view-all .material-symbols-outlined {',
      '  font-size: 14px;',
      '}',
      'html.dark .ios-search-view-all { color: #ec5b13; border-top-color: rgba(255,255,255,0.06); }',
      'html.dark .ios-search-view-all:hover { background: rgba(236,91,19,0.10); }',

      /* Scrollbar */
      '.ios-search-results::-webkit-scrollbar { width: 4px; }',
      '.ios-search-results::-webkit-scrollbar-track { background: transparent; }',
      '.ios-search-results::-webkit-scrollbar-thumb {',
      '  background: rgba(120,120,128,0.2);',
      '  border-radius: 2px;',
      '}',
      '.ios-search-results-list::-webkit-scrollbar { width: 4px; }',
      '.ios-search-results-list::-webkit-scrollbar-track { background: transparent; }',
      '.ios-search-results-list::-webkit-scrollbar-thumb {',
      '  background: rgba(120,120,128,0.2);',
      '  border-radius: 2px;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ─── Auto-init ───────────────────────────────────────────────────────────

  // Inject styles immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      injectStyles();
      // Wait for navigator to render, then init search
      setTimeout(init, 100);
    });
  } else {
    injectStyles();
    // If DOM already loaded (SPA re-init scenario)
    setTimeout(init, 100);
  }

  // Re-init on SPA navigation (header may have been re-rendered)
  document.addEventListener('spa:load', function () {
    setTimeout(reinit, 150);
  });

  // Re-init on language change
  if (global.translationManager) {
    global.translationManager.on('languageChanged', function () {
      // Clear current query and hide panel
      currentQuery = '';
      hidePanel();
    });
  }
  global.addEventListener('languageChanged', function () {
    currentQuery = '';
    hidePanel();
  });

  // ─── Expose ──────────────────────────────────────────────────────────────

  global.ProductSearchEngine = {
    init: init,
    reinit: reinit,
    destroy: destroy,
    search: function (query) { return doSearch(query); }
  };

}(window));
