/**
 * about-dropdown.js — About Dropdown (L2)
 *
 * L2:  公司简介 / 工厂实力 / 资质认证
 * CSS prefix:  abt-dropdown-* / abt-popup-*
 */

(function (global) {
  'use strict';

  /* ───────────────────────── DATA ───────────────────────── */

  var ITEMS = [
    { key: 'nav_about_profile',  icon: 'apartment',           href: '/about/' },
    { key: 'nav_about_factory',  icon: 'factory',             href: '/about/' },
    { key: 'nav_about_cert',     icon: 'verified',            href: '/about/' },
  ];

  /* ───────────────────────── HELPERS ───────────────────────── */

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isTouch() {
    return ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }

  /* ───────────────────────── CSS ───────────────────────── */

  function injectStyles() {
    if (document.getElementById('abt-dropdown-styles')) return;
    var style = document.createElement('style');
    style.id = 'abt-dropdown-styles';
    style.textContent = [
      '.abt-dropdown-trigger { display:inline-flex; align-items:center; gap:4px; cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent; }',
      '.abt-dropdown-arrow { font-size:16px; opacity:.5; transition:transform .28s cubic-bezier(.4,0,.2,1); }',
      '.abt-dropdown-wrap.is-open .abt-dropdown-arrow,',
      '.abt-dropdown-wrap:not(.touch-device):hover .abt-dropdown-arrow { transform:rotate(180deg); }',
      '.abt-dropdown-wrap { position:relative; display:inline-block; }',
      '.abt-dropdown-panel {',
      '  position:absolute; left:50%; top:calc(100% + 6px);',
      '  transform:translateX(-50%) scale(.96); transform-origin:top center;',
      '  opacity:0; visibility:hidden; pointer-events:none;',
      '  transition:opacity .2s ease, transform .25s cubic-bezier(.32,.72,0,1), visibility 0s .2s;',
      '  z-index:1200;',
      '}',
      '.abt-dropdown-wrap.is-open .abt-dropdown-panel,',
      '.abt-dropdown-wrap:not(.touch-device):hover .abt-dropdown-panel {',
      '  opacity:1; visibility:visible; pointer-events:auto;',
      '  transform:translateX(-50%) scale(1);',
      '  transition:opacity .2s ease, transform .35s cubic-bezier(.32,.72,0,1), visibility 0s 0s;',
      '}',
      '.abt-dropdown-card {',
      '  background:rgba(246,246,248,1);',
      '  border-radius:13px; padding:4px; min-width:240px; max-width:340px;',
      '  border:.5px solid rgba(0,0,0,.08);',
      '  box-shadow:0 0 0 .5px rgba(0,0,0,.04), 0 8px 40px rgba(0,0,0,.12), 0 2px 12px rgba(0,0,0,.08);',
      '}',
      'html.dark .abt-dropdown-card {',
      '  background:rgba(44,44,46,1); border-color:rgba(255,255,255,.12);',
      '  box-shadow:0 0 0 .5px rgba(255,255,255,.06), 0 8px 40px rgba(0,0,0,.4), 0 2px 12px rgba(0,0,0,.3);',
      '}',
      '.abt-dropdown-item {',
      '  display:flex; align-items:center; gap:10px; padding:9px 12px;',
      '  font-size:13px; font-weight:500; letter-spacing:-.01em; line-height:1.38;',
      '  color:#1d1d1f; text-decoration:none; border-radius:10px;',
      '  transition:background .1s ease, transform .15s cubic-bezier(.32,.72,0,1);',
      '}',
      'html.dark .abt-dropdown-item { color:#f5f5f7; }',
      '.abt-dropdown-item:hover { background:rgba(236,91,19,.06); }',
      '.abt-dropdown-item:active { background:rgba(236,91,19,.12); transform:scale(.98); }',
      'html.dark .abt-dropdown-item:hover { background:rgba(236,91,19,.10); }',
      'html.dark .abt-dropdown-item:active { background:rgba(236,91,19,.18); }',
      '.abt-dropdown-icon { width:28px; height:28px; border-radius:7px; background:rgba(236,91,19,.10); display:flex; align-items:center; justify-content:center; flex-shrink:0; }',
      'html.dark .abt-dropdown-icon { background:rgba(236,91,19,.18); }',
      '.abt-dropdown-icon .material-symbols-outlined { font-size:16px; color:#ec5b13; }',
      '.abt-dropdown-label { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
      '.abt-dropdown-chevron { margin-left:auto; font-size:14px; color:rgba(60,60,67,.3); flex-shrink:0; }',
      'html.dark .abt-dropdown-chevron { color:rgba(235,235,245,.25); }',
      '.abt-dropdown-separator { height:.5px; background:rgba(60,60,67,.12); margin:0 12px 0 50px; }',
      'html.dark .abt-dropdown-separator { background:rgba(235,235,245,.15); }',
      '@media (max-width:720px) { .abt-dropdown-panel { display:none !important; } }',
      /* popup */
      '.abt-popup-overlay { position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:998; animation:abt-fade-in .2s ease; }',
      '@keyframes abt-fade-in { from { opacity:0; } to { opacity:1; } }',
      '.abt-popup-panel {',
      '  position:fixed; left:8px; right:8px; bottom:0;',
      '  background:rgba(246,246,248,.97);',
      '  border-radius:14px 14px 0 0; transform:translateY(100%);',
      '  transition:transform .35s cubic-bezier(.32,.72,0,1);',
      '  z-index:999; padding:8px 4px calc(16px + env(safe-area-inset-bottom)) 4px;',
      '  box-shadow:0 -2px 20px rgba(0,0,0,.1);',
      '}',
      '.abt-popup-panel.is-open { transform:translateY(0); }',
      'html.dark .abt-popup-panel { background:rgba(44,44,46,.97); box-shadow:0 -2px 20px rgba(0,0,0,.4); }',
      '.abt-popup-handle { width:36px; height:5px; border-radius:3px; background:rgba(60,60,67,.25); margin:0 auto 8px; }',
      'html.dark .abt-popup-handle { background:rgba(235,235,245,.2); }',
      '.abt-popup-item { display:flex; align-items:center; gap:12px; padding:12px 16px; font-size:17px; font-weight:400; color:#1d1d1f; text-decoration:none; border-radius:10px; margin:0 4px; transition:background .1s ease, transform .15s cubic-bezier(.32,.72,0,1); }',
      'html.dark .abt-popup-item { color:#f5f5f7; }',
      '.abt-popup-item:hover { background:rgba(236,91,19,.06); }',
      'html.dark .abt-popup-item:hover { background:rgba(236,91,19,.10); }',
      '.abt-popup-item:active { background:rgba(236,91,19,.12); transform:scale(.98); }',
      'html.dark .abt-popup-item:active { background:rgba(236,91,19,.18); }',
      '.abt-popup-label { flex:1; min-width:0; }',
      '.abt-popup-chevron { font-size:16px; color:rgba(60,60,67,.3); flex-shrink:0; }',
      'html.dark .abt-popup-chevron { color:rgba(235,235,245,.25); }',
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ───────────────────────── BUILDERS ───────────────────────── */

  function buildDropdownItem(item, showSep) {
    var row = '<a href="' + esc(item.href) + '" class="abt-dropdown-item">' +
      '<span class="abt-dropdown-icon"><span class="material-symbols-outlined">' + esc(item.icon) + '</span></span>' +
      '<span class="abt-dropdown-label" data-i18n="' + esc(item.key) + '">' + esc(item.key) + '</span>' +
      '<span class="material-symbols-outlined abt-dropdown-chevron">chevron_right</span>' +
    '</a>';
    if (showSep) row += '<div class="abt-dropdown-separator"></div>';
    return row;
  }

  function renderDropdown(cfg) {
    var items = ITEMS.map(function (item, idx) {
      return buildDropdownItem(item, idx < ITEMS.length - 1);
    }).join('\n');

    return '<div class="abt-dropdown-wrap' + (isTouch() ? ' touch-device' : '') + '">' +
      '<a href="' + esc(cfg.href) + '"' +
         ' class="' + esc(cfg.activeClass || '') + ' abt-dropdown-trigger"' +
         ' data-abt-trigger-label="' + esc(cfg.labelKey) + '">' +
        '<span data-i18n="' + esc(cfg.labelKey) + '">' + esc(cfg.labelKey) + '</span>' +
        '<span class="material-symbols-outlined abt-dropdown-arrow">expand_more</span>' +
      '</a>' +
      '<div class="abt-dropdown-panel"><div class="abt-dropdown-card">' + items + '</div></div>' +
    '</div>';
  }

  /* ───────────────────────── INTERACTION ───────────────────────── */

  function initDropdownClick() {
    document.addEventListener('click', function () {
      document.querySelectorAll('.abt-dropdown-wrap.is-open')
        .forEach(function (d) { d.classList.remove('is-open'); });
    });
    document.querySelectorAll('.abt-dropdown-trigger').forEach(function (t) {
      t.addEventListener('click', function (e) {
        if (window.innerWidth <= 720) return;
        e.preventDefault();
        e.stopPropagation();
        t.closest('.abt-dropdown-wrap').classList.toggle('is-open');
      });
    });
  }

  /* ───────────────────────── MOBILE POPUP ───────────────────────── */

  function openPopup(href) {
    closePopup();
    var overlay = document.createElement('div');
    overlay.className = 'abt-popup-overlay';
    var panel = document.createElement('div');
    panel.className = 'abt-popup-panel';

    var items = ITEMS.map(function (item) {
      return '<a href="' + esc(item.href) + '" class="abt-popup-item">' +
        '<span class="abt-dropdown-icon"><span class="material-symbols-outlined">' + esc(item.icon) + '</span></span>' +
        '<span class="abt-popup-label" data-i18n="' + esc(item.key) + '">' + esc(item.key) + '</span>' +
        '<span class="material-symbols-outlined abt-popup-chevron">chevron_right</span>' +
      '</a>';
    }).join('\n');

    panel.innerHTML = '<div class="abt-popup-handle"></div>' + items;

    if (global.translationManager) {
      panel.querySelectorAll('[data-i18n]').forEach(function (el) {
        var val = global.translationManager.translate(el.getAttribute('data-i18n'));
        if (val && val !== el.getAttribute('data-i18n')) el.textContent = val;
      });
    }

    overlay.onclick = closePopup;
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    panel.querySelectorAll('.abt-popup-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        var itemHref = item.getAttribute('href');
        closePopup();
        if (itemHref && global.SpaRouter) { e.preventDefault(); global.SpaRouter.navigate(itemHref); }
      });
    });

    requestAnimationFrame(function () {
      panel.classList.add('is-open');
      navigator.vibrate && navigator.vibrate(12);
    });
  }

  function closePopup() {
    document.querySelectorAll('.abt-popup-overlay,.abt-popup-panel')
      .forEach(function (el) { el.parentNode && el.parentNode.removeChild(el); });
  }

  function bindAllPopupTriggers() {
    document.querySelectorAll('[data-abt-popup]').forEach(function (el) {
      if (el._abtPopupBound) return;
      el._abtPopupBound = true;
      el.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        openPopup(el.getAttribute('data-abt-popup-href') || el.getAttribute('href') || '/about/');
      });
    });
  }

  document.addEventListener('spa:load', closePopup);

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.AboutDropdown = {
    ITEMS: ITEMS,
    renderPC: renderDropdown,
    renderTablet: renderDropdown,
    initDropdownClick: initDropdownClick,
    openPopup: openPopup,
    closePopup: closePopup,
    bindAllPopupTriggers: bindAllPopupTriggers,
    injectAllStyles: injectStyles,
  };

})(window);
