/**
 * products-dropdown.js — Responsive Products Dropdown
 * Desktop / Tablet: floating card style
 * Mobile: iOS bottom sheet popup
 */

(function (global) {
  'use strict';

  /* ───────────────────────── DATA ───────────────────────── */

  var SUBSERIES = [
    { key: 'nav_products_cutting',  icon: 'content_cut',           emoji: '' },
    { key: 'nav_products_stirfry',  icon: 'local_fire_department', emoji: '🔥' },
    { key: 'nav_products_frying',   icon: 'outdoor_grill',         emoji: '' },
    { key: 'nav_products_stewing',  icon: 'soup_kitchen',          emoji: '' },
    { key: 'nav_products_steaming', icon: 'cloud',                 emoji: '' },
    { key: 'nav_products_other',    icon: 'more_horiz',            emoji: '' }
  ];

  /* ───────────────────────── HELPERS ───────────────────────── */

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isTouch() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  }

  /* ───────────────────────── CSS ───────────────────────── */

  function injectStyles() {
    // 幂等检查：v4 样式已存在则跳过
    if (document.getElementById('prod-dropdown-styles-v4')) return;

    // 移除所有旧版 style 元素，防止样式冲突
    ['prod-ios-dropdown-styles', 'prod-dropdown-styles-2026', 'prod-dropdown-pc-styles', 'prod-dropdown-tablet-styles', 'prod-dropdown-styles-v2', 'prod-dropdown-styles-v3'].forEach(function(id) {
      var old = document.getElementById(id);
      if (old) { old.remove(); }
    });

    var style = document.createElement('style');
    style.id = 'prod-dropdown-styles-v4';
    style.setAttribute('data-ver', '2026-03-22-v4');
    style.textContent = [
      /* ===== Trigger ===== */
      '.prod-dropdown-trigger {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 4px;',
      '  cursor: pointer;',
      '  user-select: none;',
      '  -webkit-tap-highlight-color: transparent;',
      '}',

      '.prod-dropdown-arrow {',
      '  font-size: 16px;',
      '  opacity: .5;',
      '  transition: transform .2s ease;',
      '}',

      '.prod-dropdown-wrap.is-open .prod-dropdown-arrow,',
      '.prod-dropdown-wrap:not(.touch-device):hover .prod-dropdown-arrow {',
      '  transform: rotate(180deg);',
      '}',

      /* ===== Wrap ===== */
      '.prod-dropdown-wrap {',
      '  position: relative;',
      '  display: inline-block;',
      '}',

      /* ===== Panel — lightweight animation ===== */
      '.prod-dropdown-panel {',
      '  position: absolute;',
      '  left: 50%;',
      '  top: calc(100% + 6px);',
      '  transform: translateX(-50%) scale(.97);',
      '  transform-origin: top center;',
      '  opacity: 0;',
      '  visibility: hidden;',
      '  pointer-events: none;',
      '  transition: opacity .15s ease, transform .15s ease, visibility 0s .15s;',
      '  z-index: 1200;',
      '}',

      '.prod-dropdown-wrap.is-open .prod-dropdown-panel,',
      '.prod-dropdown-wrap:not(.touch-device):hover .prod-dropdown-panel {',
      '  opacity: 1;',
      '  visibility: visible;',
      '  pointer-events: auto;',
      '  transform: translateX(-50%) scale(1);',
      '  transition: opacity .15s ease, transform .15s ease, visibility 0s 0s;',
      '}',

      /* ===== Card ===== */
      '.prod-dropdown-card {',
      '  background: rgba(246,246,248,1);',
      '  border-radius: 13px;',
      '  padding: 4px;',
      '  min-width: 320px;',
      '  max-width: 420px;',
      '  border: .5px solid rgba(0,0,0,.08);',
      '  box-shadow: 0 0 0 .5px rgba(0,0,0,.04), 0 8px 40px rgba(0,0,0,.12), 0 2px 12px rgba(0,0,0,.08);',
      '}',

      'html.dark .prod-dropdown-card {',
      '  background: rgba(44,44,46,1);',
      '  border-color: rgba(255,255,255,.12);',
      '  box-shadow: 0 0 0 .5px rgba(255,255,255,.06), 0 8px 40px rgba(0,0,0,.4), 0 2px 12px rgba(0,0,0,.3);',
      '}',

      /* ===== Item ===== */
      '.prod-dropdown-item {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 10px;',
      '  padding: 9px 12px;',
      '  font-size: 13px;',
      '  font-weight: 500;',
      '  letter-spacing: -.01em;',
      '  line-height: 1.38;',
      '  color: #1d1d1f;',
      '  text-decoration: none;',
      '  border-radius: 10px;',
      '  position: relative;',
      '  transition: background .1s ease;',
      '}',

      'html.dark .prod-dropdown-item {',
      '  color: #f5f5f7;',
      '}',

      '.prod-dropdown-item:hover {',
      '  background: rgba(236,91,19,.06);',
      '}',

      '.prod-dropdown-item:active {',
      '  background: rgba(236,91,19,.12);',
      '}',

      'html.dark .prod-dropdown-item:hover {',
      '  background: rgba(236,91,19,.10);',
      '}',

      'html.dark .prod-dropdown-item:active {',
      '  background: rgba(236,91,19,.18);',
      '}',

      /* ===== Icon ===== */
      '.prod-dropdown-icon {',
      '  width: 28px;',
      '  height: 28px;',
      '  border-radius: 7px;',
      '  background: rgba(236,91,19,.10);',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  flex-shrink: 0;',
      '}',

      'html.dark .prod-dropdown-icon {',
      '  background: rgba(236,91,19,.18);',
      '}',

      '.prod-dropdown-icon .material-symbols-outlined {',
      '  font-size: 16px;',
      '  color: #ec5b13;',
      '}',

      /* ===== Label ===== */
      '.prod-dropdown-label {',
      '  flex: 1;',
      '  min-width: 0;',
      '  white-space: nowrap;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '}',

      /* ===== Emoji Badge ===== */
      '.prod-dropdown-emoji {',
      '  margin-left: auto;',
      '  font-size: 13px;',
      '  line-height: 1;',
      '  opacity: .85;',
      '  flex-shrink: 0;',
      '}',

      /* ===== Chevron ===== */
      '.prod-dropdown-chevron {',
      '  margin-left: auto;',
      '  font-size: 14px;',
      '  color: rgba(60,60,67,.3);',
      '  flex-shrink: 0;',
      '}',

      'html.dark .prod-dropdown-chevron {',
      '  color: rgba(235,235,245,.25);',
      '}',

      /* ===== Separator ===== */
      '.prod-dropdown-separator {',
      '  height: .5px;',
      '  background: rgba(60,60,67,.12);',
      '  margin: 0 12px 0 50px;',
      '}',

      'html.dark .prod-dropdown-separator {',
      '  background: rgba(235,235,245,.15);',
      '}',

      /* ===== View All link ===== */
      '.prod-viewall-item {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  padding: 9px 12px;',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  color: #ec5b13;',
      '  text-decoration: none;',
      '  border-radius: 10px;',
      '  transition: background .1s ease;',
      '}',

      '.prod-viewall-item:hover {',
      '  background: rgba(236,91,19,.06);',
      '}',

      '.prod-viewall-item .material-symbols-outlined {',
      '  font-size: 16px;',
      '}',

      'html.dark .prod-viewall-item {',
      '  color: #f97316;',
      '}',

      'html.dark .prod-viewall-item:hover {',
      '  background: rgba(236,91,19,.10);',
      '}',

      /* ===== Mobile — hide panel, use popup instead ===== */
      '@media (max-width: 720px) {',
      '  .prod-dropdown-panel { display: none !important; }',
      '}',

      /* ===== Popup — iOS bottom sheet ===== */
      '.prod-popup-overlay {',
      '  position: fixed;',
      '  inset: 0;',
      '  background: rgba(0,0,0,.35);',
      '  z-index: 998;',
      '  animation: pdp-fade-in .2s ease;',
      '}',

      '@keyframes pdp-fade-in { from { opacity: 0; } to { opacity: 1; } }',

      '.prod-popup-panel {',
      '  position: fixed;',
      '  left: 8px;',
      '  right: 8px;',
      '  bottom: 0;',
      '  background: rgba(246,246,248,.97);',
      '  border-radius: 14px 14px 0 0;',
      '  transform: translateY(100%);',
      '  transition: transform .3s ease;',
      '  z-index: 999;',
      '  padding: 8px 4px calc(16px + env(safe-area-inset-bottom)) 4px;',
      '  box-shadow: 0 -2px 20px rgba(0,0,0,.1);',
      '}',

      '.prod-popup-panel.is-open {',
      '  transform: translateY(0);',
      '}',

      'html.dark .prod-popup-panel {',
      '  background: rgba(44,44,46,.97);',
      '  box-shadow: 0 -2px 20px rgba(0,0,0,.4);',
      '}',

      /* iOS drag indicator */
      '.prod-popup-handle {',
      '  width: 36px;',
      '  height: 5px;',
      '  border-radius: 3px;',
      '  background: rgba(60,60,67,.25);',
      '  margin: 0 auto 8px;',
      '}',

      'html.dark .prod-popup-handle {',
      '  background: rgba(235,235,245,.2);',
      '}',

      /* Popup items */
      '.prod-popup-item {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 12px;',
      '  padding: 12px 16px;',
      '  font-size: 17px;',
      '  font-weight: 400;',
      '  color: #1d1d1f;',
      '  text-decoration: none;',
      '  border-radius: 10px;',
      '  margin: 0 4px;',
      '  transition: background .1s ease;',
      '}',

      'html.dark .prod-popup-item {',
      '  color: #f5f5f7;',
      '}',

      '.prod-popup-item:hover {',
      '  background: rgba(236,91,19,.06);',
      '}',

      'html.dark .prod-popup-item:hover {',
      '  background: rgba(236,91,19,.10);',
      '}',

      '.prod-popup-item:active {',
      '  background: rgba(236,91,19,.12);',
      '}',

      'html.dark .prod-popup-item:active {',
      '  background: rgba(236,91,19,.18);',
      '}',

      '.prod-popup-label {',
      '  flex: 1;',
      '  min-width: 0;',
      '}',

      '.prod-popup-chevron {',
      '  font-size: 16px;',
      '  color: rgba(60,60,67,.3);',
      '  flex-shrink: 0;',
      '}',

      'html.dark .prod-popup-chevron {',
      '  color: rgba(235,235,245,.25);',
      '}',

      '.prod-popup-emoji {',
      '  margin-left: auto;',
      '  font-size: 15px;',
      '  opacity: .85;',
      '  flex-shrink: 0;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ───────────────────────── BUILDERS ───────────────────────── */

  function buildItem(sub, href) {
    var chevron = '<span class="material-symbols-outlined prod-dropdown-chevron">chevron_right</span>';
    var emojiHtml = sub.emoji
      ? '<span class="prod-dropdown-emoji">' + sub.emoji + '</span>'
      : '';
    return '<a href="' + esc(href) + '" class="prod-dropdown-item">' +
      '<span class="prod-dropdown-icon">' +
        '<span class="material-symbols-outlined">' + esc(sub.icon) + '</span>' +
      '</span>' +
      '<span class="prod-dropdown-label" data-i18n="' + esc(sub.key) + '">' + esc(sub.key) + '</span>' +
      emojiHtml +
      chevron +
    '</a>';
  }

  function buildSeparator() {
    return '<div class="prod-dropdown-separator"></div>';
  }

  /* ── Unified dropdown: floating card for both PC and Tablet ── */
  function renderDropdown(cfg) {
    var items = SUBSERIES.map(function (s, idx) {
      var html = buildItem(s, cfg.href);
      if (idx < SUBSERIES.length - 1) {
        html += buildSeparator();
      }
      return html;
    }).join('\n');

    // "View All Products" link at bottom
    var viewAll = '<a href="' + esc(cfg.href) + '" class="prod-viewall-item">' +
      '<span class="prod-dropdown-icon">' +
        '<span class="material-symbols-outlined">grid_view</span>' +
      '</span>' +
      '<span class="prod-dropdown-label" data-i18n="nav_mega_view_all">View All Products</span>' +
      '<span class="material-symbols-outlined prod-dropdown-chevron">chevron_right</span>' +
    '</a>';

    var html = '<div class="prod-dropdown-wrap' + (isTouch() ? ' touch-device' : '') + '">' +
      '<a href="' + esc(cfg.href) + '"' +
         ' class="' + esc(cfg.activeClass || '') + ' prod-dropdown-trigger"' +
         ' data-prod-trigger-label="' + esc(cfg.labelKey) + '">' +
        '<span data-i18n="' + esc(cfg.labelKey) + '">' + esc(cfg.labelKey) + '</span>' +
        '<span class="material-symbols-outlined prod-dropdown-arrow">expand_more</span>' +
      '</a>' +
      '<div class="prod-dropdown-panel">' +
        '<div class="prod-dropdown-card">' +
          items +
          '<div class="prod-dropdown-separator" style="margin: 4px 0;"></div>' +
          viewAll +
        '</div>' +
      '</div>' +
    '</div>';

    return html;
  }

  /* ───────────────────────── INTERACTION ───────────────────────── */

  function initDropdownClick() {
    document.addEventListener('click', function () {
      document.querySelectorAll('.prod-dropdown-wrap.is-open')
        .forEach(function (d) { d.classList.remove('is-open'); });
    });

    document.querySelectorAll('.prod-dropdown-trigger').forEach(function (t) {
      t.addEventListener('click', function (e) {
        if (window.innerWidth <= 720) return;
        e.preventDefault();
        e.stopPropagation();
        t.closest('.prod-dropdown-wrap').classList.toggle('is-open');
      });
    });
  }

  /* ───────────────────────── MOBILE POPUP ───────────────────────── */

  function openPopup(href) {
    closePopup();

    var overlay = document.createElement('div');
    overlay.className = 'prod-popup-overlay';

    var panel = document.createElement('div');
    panel.className = 'prod-popup-panel';

    var handle = '<div class="prod-popup-handle"></div>';

    var items = SUBSERIES.map(function (s) {
      var chevron = '<span class="material-symbols-outlined prod-popup-chevron">chevron_right</span>';
      var emojiHtml = s.emoji
        ? '<span class="prod-popup-emoji">' + s.emoji + '</span>'
        : '';
      return '<a href="' + esc(href) + '" class="prod-popup-item">' +
        '<span class="prod-dropdown-icon">' +
          '<span class="material-symbols-outlined">' + esc(s.icon) + '</span>' +
        '</span>' +
        '<span class="prod-popup-label" data-i18n="' + esc(s.key) + '">' + esc(s.key) + '</span>' +
        emojiHtml +
        chevron +
      '</a>';
    }).join('\n');

    panel.innerHTML = handle + items;

    overlay.onclick = closePopup;
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Translate popup items immediately after DOM insertion
    if (global.translationManager) {
      panel.querySelectorAll('[data-i18n]').forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        var translated = global.translationManager.translate(key);
        if (translated && translated !== key) {
          el.textContent = translated;
        }
      });
    }

    var popupItems = panel.querySelectorAll('.prod-popup-item');
    for (var k = 0; k < popupItems.length; k++) {
      popupItems[k].addEventListener('click', function (e) {
        var target = e.currentTarget;
        var itemHref = target.getAttribute('href');
        closePopup();
        if (itemHref && global.SpaRouter) {
          e.preventDefault();
          global.SpaRouter.navigate(itemHref);
        }
      });
    }

    requestAnimationFrame(function () {
      panel.classList.add('is-open');
      navigator.vibrate && navigator.vibrate(12);
    });
  }

  function closePopup() {
    document.querySelectorAll('.prod-popup-overlay,.prod-popup-panel')
      .forEach(function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      });
  }

  /**
   * Bind click handlers to all elements with data-prod-popup attribute.
   * Used by footer.js bottom nav (mobile/tablet) to open product category popup.
   */
  function bindAllPopupTriggers() {
    var triggers = document.querySelectorAll('[data-prod-popup]');
    for (var i = 0; i < triggers.length; i++) {
      var el = triggers[i];
      if (el._prodPopupBound) continue;
      el._prodPopupBound = true;

      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var href = el.getAttribute('data-prod-popup-href') || el.getAttribute('href') || '/products/';
        openPopup(href);
      });
    }
  }

  /* ───────────────────────── SPA CLEANUP ───────────────────────── */

  document.addEventListener('spa:load', function () {
    closePopup();
  });

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.ProductsDropdown = {
    SUBSERIES: SUBSERIES,
    renderPC: renderDropdown,
    renderTablet: renderDropdown,
    initDropdownClick: initDropdownClick,
    openPopup: openPopup,
    closePopup: closePopup,
    bindAllPopupTriggers: bindAllPopupTriggers,
    injectAllStyles: injectStyles,
  };

})(window);
