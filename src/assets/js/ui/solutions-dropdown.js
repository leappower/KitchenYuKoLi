/**
 * solutions-dropdown.js — Solutions Dropdown
 *
 * Content:
 *   场景应用 × 5 items
 *   ─── separator ───
 *   成功案例
 *   ROI 计算器  ← Badge highlight
 */

(function (global) {
  'use strict';

  /* ───────────────────────── DATA ───────────────────────── */

  var SCENES = [
    { key: 'nav_applications_fastfood',      icon: 'ramen_dining',          href: '/applications/' },
    { key: 'nav_applications_hotpot',        icon: 'local_fire_department', href: '/applications/' },
    { key: 'nav_applications_cloud_kitchen', icon: 'delivery_dining',       href: '/applications/' },
    { key: 'nav_applications_canteen',       icon: 'restaurant',            href: '/applications/' },
    { key: 'nav_applications_thai',          icon: 'public',                href: '/applications/' },
  ];

  var EXTRAS = [
    { key: 'nav_cases', icon: 'monitoring',    href: '/cases/',  badge: false },
    { key: 'nav_roi',   icon: 'calculate',     href: '/roi/',    badge: true  },
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
    return ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }

  /* ───────────────────────── CSS ───────────────────────── */

  function injectStyles() {
    if (document.getElementById('sol-dropdown-styles-v3')) return;
    var style = document.createElement('style');
    style.id = 'sol-dropdown-styles-v3';
    style.textContent = [
      /* ===== Trigger ===== */
      '.sol-dropdown-trigger {',
      '  display: inline-flex; align-items: center; gap: 4px;',
      '  cursor: pointer; user-select: none;',
      '  -webkit-tap-highlight-color: transparent;',
      '}',

      '.sol-dropdown-arrow {',
      '  font-size: 16px; opacity: .5;',
      '  transition: transform .2s ease;',
      '}',

      '.sol-dropdown-wrap.is-open .sol-dropdown-arrow,',
      '.sol-dropdown-wrap:not(.touch-device):hover .sol-dropdown-arrow {',
      '  transform: rotate(180deg);',
      '}',

      /* ===== Wrap ===== */
      '.sol-dropdown-wrap { position: relative; display: inline-block; }',

      /* ===== Panel — lightweight animation ===== */
      '.sol-dropdown-panel {',
      '  position: absolute; left: 50%; top: calc(100% + 6px);',
      '  transform: translateX(-50%) scale(.97); transform-origin: top center;',
      '  opacity: 0; visibility: hidden; pointer-events: none;',
      '  transition: opacity .15s ease, transform .15s ease, visibility 0s .15s;',
      '  z-index: 1200;',
      '}',

      '.sol-dropdown-wrap.is-open .sol-dropdown-panel,',
      '.sol-dropdown-wrap:not(.touch-device):hover .sol-dropdown-panel {',
      '  opacity: 1; visibility: visible; pointer-events: auto;',
      '  transform: translateX(-50%) scale(1);',
      '  transition: opacity .15s ease, transform .15s ease, visibility 0s 0s;',
      '}',

      /* ===== Card ===== */
      '.sol-dropdown-card {',
      '  background: rgba(246,246,248,1);',
      '  border-radius: 13px; padding: 4px; min-width: 300px; max-width: 400px;',
      '  border: .5px solid rgba(0,0,0,.08);',
      '  box-shadow: 0 0 0 .5px rgba(0,0,0,.04), 0 8px 40px rgba(0,0,0,.12), 0 2px 12px rgba(0,0,0,.08);',
      '}',

      'html.dark .sol-dropdown-card {',
      '  background: rgba(44,44,46,1); border-color: rgba(255,255,255,.12);',
      '  box-shadow: 0 0 0 .5px rgba(255,255,255,.06), 0 8px 40px rgba(0,0,0,.4), 0 2px 12px rgba(0,0,0,.3);',
      '}',

      /* ===== Item ===== */
      '.sol-dropdown-item {',
      '  display: flex; align-items: center; gap: 10px; padding: 9px 12px;',
      '  font-size: 13px; font-weight: 500; letter-spacing: -.01em; line-height: 1.38;',
      '  color: #1d1d1f; text-decoration: none; border-radius: 10px; position: relative;',
      '  transition: background .1s ease;',
      '}',

      'html.dark .sol-dropdown-item { color: #f5f5f7; }',
      '.sol-dropdown-item:hover { background: rgba(236,91,19,.06); }',
      '.sol-dropdown-item:active { background: rgba(236,91,19,.12); }',
      'html.dark .sol-dropdown-item:hover { background: rgba(236,91,19,.10); }',
      'html.dark .sol-dropdown-item:active { background: rgba(236,91,19,.18); }',

      /* ===== Icon ===== */
      '.sol-dropdown-icon {',
      '  width: 28px; height: 28px; border-radius: 7px;',
      '  background: rgba(236,91,19,.10);',
      '  display: flex; align-items: center; justify-content: center; flex-shrink: 0;',
      '}',
      'html.dark .sol-dropdown-icon { background: rgba(236,91,19,.18); }',
      '.sol-dropdown-icon .material-symbols-outlined { font-size: 16px; color: #ec5b13; }',

      /* ===== Label ===== */
      '.sol-dropdown-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',

      /* ===== ROI Badge ===== */
      '.sol-roi-badge {',
      '  display: inline-flex; align-items: center; padding: 2px 7px;',
      '  font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;',
      '  background: #ec5b13; color: #fff; border-radius: 20px;',
      '  flex-shrink: 0; line-height: 1.4;',
      '}',

      /* ===== Chevron ===== */
      '.sol-dropdown-chevron {',
      '  margin-left: auto; font-size: 14px; color: rgba(60,60,67,.3); flex-shrink: 0;',
      '}',
      'html.dark .sol-dropdown-chevron { color: rgba(235,235,245,.25); }',

      /* ===== Separator ===== */
      '.sol-dropdown-separator {',
      '  height: .5px; background: rgba(60,60,67,.12); margin: 4px 12px 4px 50px;',
      '}',
      'html.dark .sol-dropdown-separator { background: rgba(235,235,245,.15); }',

      /* hide panel on mobile */
      '@media (max-width: 720px) { .sol-dropdown-panel { display: none !important; } }',

      /* ===== Popup — iOS bottom sheet ===== */
      '.sol-popup-overlay {',
      '  position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 998;',
      '  animation: sdp-fade-in .2s ease;',
      '}',

      '@keyframes sdp-fade-in { from { opacity: 0; } to { opacity: 1; } }',

      '.sol-popup-panel {',
      '  position: fixed; left: 8px; right: 8px; bottom: 0;',
      '  background: rgba(246,246,248,.97);',
      '  border-radius: 14px 14px 0 0; transform: translateY(100%);',
      '  transition: transform .3s ease;',
      '  z-index: 999; padding: 8px 4px calc(16px + env(safe-area-inset-bottom)) 4px;',
      '  box-shadow: 0 -2px 20px rgba(0,0,0,.1);',
      '}',

      '.sol-popup-panel.is-open { transform: translateY(0); }',

      'html.dark .sol-popup-panel {',
      '  background: rgba(44,44,46,.97); box-shadow: 0 -2px 20px rgba(0,0,0,.4);',
      '}',

      '.sol-popup-handle {',
      '  width: 36px; height: 5px; border-radius: 3px;',
      '  background: rgba(60,60,67,.25); margin: 0 auto 8px;',
      '}',
      'html.dark .sol-popup-handle { background: rgba(235,235,245,.2); }',

      '.sol-popup-item {',
      '  display: flex; align-items: center; gap: 12px; padding: 12px 16px;',
      '  font-size: 17px; font-weight: 400; color: #1d1d1f; text-decoration: none;',
      '  border-radius: 10px; margin: 0 4px;',
      '  transition: background .1s ease;',
      '}',

      'html.dark .sol-popup-item { color: #f5f5f7; }',
      '.sol-popup-item:hover { background: rgba(236,91,19,.06); }',
      'html.dark .sol-popup-item:hover { background: rgba(236,91,19,.10); }',
      '.sol-popup-item:active { background: rgba(236,91,19,.12); }',
      'html.dark .sol-popup-item:active { background: rgba(236,91,19,.18); }',

      '.sol-popup-label { flex: 1; min-width: 0; }',
      '.sol-popup-chevron { font-size: 16px; color: rgba(60,60,67,.3); flex-shrink: 0; }',
      'html.dark .sol-popup-chevron { color: rgba(235,235,245,.25); }',

      '.sol-popup-separator {',
      '  height: .5px; background: rgba(60,60,67,.12); margin: 4px 16px 4px 60px;',
      '}',
      'html.dark .sol-popup-separator { background: rgba(235,235,245,.15); }',
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ───────────────────────── BUILDERS ───────────────────────── */

  function buildDropdownItem(item) {
    var badgeHtml = item.badge
      ? '<span class="sol-roi-badge" data-i18n="nav_roi_badge">HOT</span>'
      : '<span class="material-symbols-outlined sol-dropdown-chevron">chevron_right</span>';
    return '<a href="' + esc(item.href) + '" class="sol-dropdown-item">' +
      '<span class="sol-dropdown-icon">' +
        '<span class="material-symbols-outlined">' + esc(item.icon) + '</span>' +
      '</span>' +
      '<span class="sol-dropdown-label" data-i18n="' + esc(item.key) + '">' + esc(item.key) + '</span>' +
      badgeHtml +
    '</a>';
  }

  function buildPopupItem(item) {
    var badgeHtml = item.badge
      ? '<span class="sol-roi-badge" data-i18n="nav_roi_badge">HOT</span>'
      : '<span class="material-symbols-outlined sol-popup-chevron">chevron_right</span>';
    return '<a href="' + esc(item.href) + '" class="sol-popup-item">' +
      '<span class="sol-dropdown-icon">' +
        '<span class="material-symbols-outlined">' + esc(item.icon) + '</span>' +
      '</span>' +
      '<span class="sol-popup-label" data-i18n="' + esc(item.key) + '">' + esc(item.key) + '</span>' +
      badgeHtml +
    '</a>';
  }

  /* ── Unified dropdown: floating card for both PC and Tablet ── */
  function renderDropdown(cfg) {
    // Scenes section
    var sceneItems = SCENES.map(function (s, idx) {
      var row = buildDropdownItem(s);
      if (idx < SCENES.length - 1) {
        row += '<div class="sol-dropdown-separator"></div>';
      }
      return row;
    }).join('\n');

    // Extras (Cases + ROI) with section divider
    var extraItems = EXTRAS.map(function (s, idx) {
      var row = buildDropdownItem(s);
      if (idx < EXTRAS.length - 1) {
        row += '<div class="sol-dropdown-separator"></div>';
      }
      return row;
    }).join('\n');

    var html =
      '<div class="sol-dropdown-wrap' + (isTouch() ? ' touch-device' : '') + '">' +
        '<a href="' + esc(cfg.href) + '"' +
           ' class="' + esc(cfg.activeClass || '') + ' sol-dropdown-trigger"' +
           ' data-sol-trigger-label="' + esc(cfg.labelKey) + '">' +
          '<span data-i18n="' + esc(cfg.labelKey) + '">' + esc(cfg.labelKey) + '</span>' +
          '<span class="material-symbols-outlined sol-dropdown-arrow">expand_more</span>' +
        '</a>' +
        '<div class="sol-dropdown-panel">' +
          '<div class="sol-dropdown-card">' +
            sceneItems +
            '<div class="sol-dropdown-separator" style="margin: 4px 0;"></div>' +
            extraItems +
          '</div>' +
        '</div>' +
      '</div>';

    return html;
  }

  /* ───────────────────────── INTERACTION ───────────────────────── */

  function initDropdownClick() {
    document.addEventListener('click', function () {
      document.querySelectorAll('.sol-dropdown-wrap.is-open')
        .forEach(function (d) { d.classList.remove('is-open'); });
    });

    document.querySelectorAll('.sol-dropdown-trigger').forEach(function (t) {
      t.addEventListener('click', function (e) {
        if (window.innerWidth <= 720) return;
        e.preventDefault();
        e.stopPropagation();
        t.closest('.sol-dropdown-wrap').classList.toggle('is-open');
      });
    });
  }

  /* ───────────────────────── MOBILE POPUP ───────────────────────── */

  function openPopup(href) {
    closePopup();

    var overlay = document.createElement('div');
    overlay.className = 'sol-popup-overlay';

    var panel = document.createElement('div');
    panel.className = 'sol-popup-panel';

    var handle = '<div class="sol-popup-handle"></div>';

    var sceneItems = SCENES.map(function (s, idx) {
      var row = buildPopupItem(s);
      if (idx < SCENES.length - 1) row += '<div class="sol-popup-separator"></div>';
      return row;
    }).join('\n');

    var extraItems = EXTRAS.map(function (s, idx) {
      var row = buildPopupItem(s);
      if (idx < EXTRAS.length - 1) row += '<div class="sol-popup-separator"></div>';
      return row;
    }).join('\n');

    var divider = '<div class="sol-popup-separator" style="margin: 4px 0;"></div>';

    panel.innerHTML = handle + sceneItems + divider + extraItems;

    // translate immediately
    if (global.translationManager) {
      panel.querySelectorAll('[data-i18n]').forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        var val = global.translationManager.translate(key);
        if (val && val !== key) el.textContent = val;
      });
    }

    overlay.onclick = closePopup;
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    panel.querySelectorAll('.sol-popup-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        var itemHref = item.getAttribute('href');
        closePopup();
        if (itemHref && global.SpaRouter) {
          e.preventDefault();
          global.SpaRouter.navigate(itemHref);
        }
      });
    });

    requestAnimationFrame(function () {
      panel.classList.add('is-open');
      navigator.vibrate && navigator.vibrate(12);
    });
  }

  function closePopup() {
    document.querySelectorAll('.sol-popup-overlay,.sol-popup-panel')
      .forEach(function (el) { el.parentNode && el.parentNode.removeChild(el); });
  }

  function bindAllPopupTriggers() {
    document.querySelectorAll('[data-sol-popup]').forEach(function (el) {
      if (el._solPopupBound) return;
      el._solPopupBound = true;
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openPopup(el.getAttribute('data-sol-popup-href') || el.getAttribute('href') || '/solutions/');
      });
    });
  }

  document.addEventListener('spa:load', closePopup);

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.SolutionsDropdown = {
    SCENES: SCENES,
    EXTRAS: EXTRAS,
    renderPC: renderDropdown,
    renderTablet: renderDropdown,
    initDropdownClick: initDropdownClick,
    openPopup: openPopup,
    closePopup: closePopup,
    bindAllPopupTriggers: bindAllPopupTriggers,
    injectAllStyles: injectStyles,
  };

})(window);
