/**
 * contact-dropdown.js — Contact Dropdown (L2)
 *
 * L2:  留言表单 / 全球网点 / WhatsApp 客服
 * CSS prefix:  cnt-dropdown-* / cnt-popup-*
 */

(function (global) {
  'use strict';

  /* ───────────────────────── DATA ───────────────────────── */

  var ITEMS = [
    { key: 'nav_contact_form',      icon: 'mail',               href: '/contact/' },
    { key: 'nav_contact_locations', icon: 'location_on',        href: '/contact/' },
    { key: 'nav_contact_whatsapp',  icon: 'chat',               href: '/contact/', isWhatsApp: true },
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
    if (document.getElementById('cnt-dropdown-styles')) return;
    var style = document.createElement('style');
    style.id = 'cnt-dropdown-styles';
    style.textContent = [
      '.cnt-dropdown-trigger { display:inline-flex; align-items:center; gap:4px; cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent; }',
      '.cnt-dropdown-arrow { font-size:16px; opacity:.5; transition:transform .28s cubic-bezier(.4,0,.2,1); }',
      '.cnt-dropdown-wrap.is-open .cnt-dropdown-arrow,',
      '.cnt-dropdown-wrap:not(.touch-device):hover .cnt-dropdown-arrow { transform:rotate(180deg); }',
      '.cnt-dropdown-wrap { position:relative; display:inline-block; }',
      '.cnt-dropdown-panel {',
      '  position:absolute; left:50%; top:calc(100% + 6px);',
      '  transform:translateX(-50%) scale(.96); transform-origin:top center;',
      '  opacity:0; visibility:hidden; pointer-events:none;',
      '  transition:opacity .2s ease, transform .25s cubic-bezier(.32,.72,0,1), visibility 0s .2s;',
      '  z-index:1200;',
      '}',
      '.cnt-dropdown-wrap.is-open .cnt-dropdown-panel,',
      '.cnt-dropdown-wrap:not(.touch-device):hover .cnt-dropdown-panel {',
      '  opacity:1; visibility:visible; pointer-events:auto;',
      '  transform:translateX(-50%) scale(1);',
      '  transition:opacity .2s ease, transform .35s cubic-bezier(.32,.72,0,1), visibility 0s 0s;',
      '}',
      '.cnt-dropdown-card {',
      '  background:rgba(246,246,248,1);',
      '  border-radius:13px; padding:4px; min-width:240px; max-width:340px;',
      '  border:.5px solid rgba(0,0,0,.08);',
      '  box-shadow:0 0 0 .5px rgba(0,0,0,.04), 0 8px 40px rgba(0,0,0,.12), 0 2px 12px rgba(0,0,0,.08);',
      '}',
      'html.dark .cnt-dropdown-card {',
      '  background:rgba(44,44,46,1); border-color:rgba(255,255,255,.12);',
      '  box-shadow:0 0 0 .5px rgba(255,255,255,.06), 0 8px 40px rgba(0,0,0,.4), 0 2px 12px rgba(0,0,0,.3);',
      '}',
      '.cnt-dropdown-item {',
      '  display:flex; align-items:center; gap:10px; padding:9px 12px;',
      '  font-size:13px; font-weight:500; letter-spacing:-.01em; line-height:1.38;',
      '  color:#1d1d1f; text-decoration:none; border-radius:10px;',
      '  transition:background .1s ease, transform .15s cubic-bezier(.32,.72,0,1);',
      '}',
      'html.dark .cnt-dropdown-item { color:#f5f5f7; }',
      '.cnt-dropdown-item:hover { background:rgba(236,91,19,.06); }',
      '.cnt-dropdown-item:active { background:rgba(236,91,19,.12); transform:scale(.98); }',
      'html.dark .cnt-dropdown-item:hover { background:rgba(236,91,19,.10); }',
      'html.dark .cnt-dropdown-item:active { background:rgba(236,91,19,.18); }',
      /* WhatsApp item gets green accent */
      '.cnt-dropdown-item.is-whatsapp .cnt-dropdown-icon { background:rgba(37,211,102,.12); }',
      'html.dark .cnt-dropdown-item.is-whatsapp .cnt-dropdown-icon { background:rgba(37,211,102,.20); }',
      '.cnt-dropdown-item.is-whatsapp .cnt-dropdown-icon .material-symbols-outlined { color:#25d366; }',
      '.cnt-dropdown-icon { width:28px; height:28px; border-radius:7px; background:rgba(236,91,19,.10); display:flex; align-items:center; justify-content:center; flex-shrink:0; }',
      'html.dark .cnt-dropdown-icon { background:rgba(236,91,19,.18); }',
      '.cnt-dropdown-icon .material-symbols-outlined { font-size:16px; color:#ec5b13; }',
      '.cnt-dropdown-label { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
      '.cnt-dropdown-chevron { margin-left:auto; font-size:14px; color:rgba(60,60,67,.3); flex-shrink:0; }',
      'html.dark .cnt-dropdown-chevron { color:rgba(235,235,245,.25); }',
      '.cnt-dropdown-separator { height:.5px; background:rgba(60,60,67,.12); margin:0 12px 0 50px; }',
      'html.dark .cnt-dropdown-separator { background:rgba(235,235,245,.15); }',
      '@media (max-width:720px) { .cnt-dropdown-panel { display:none !important; } }',
      /* popup */
      '.cnt-popup-overlay { position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:998; animation:cnt-fade-in .2s ease; }',
      '@keyframes cnt-fade-in { from { opacity:0; } to { opacity:1; } }',
      '.cnt-popup-panel {',
      '  position:fixed; left:8px; right:8px; bottom:0;',
      '  background:rgba(246,246,248,.97);',
      '  border-radius:14px 14px 0 0; transform:translateY(100%);',
      '  transition:transform .35s cubic-bezier(.32,.72,0,1);',
      '  z-index:999; padding:8px 4px calc(16px + env(safe-area-inset-bottom)) 4px;',
      '  box-shadow:0 -2px 20px rgba(0,0,0,.1);',
      '}',
      '.cnt-popup-panel.is-open { transform:translateY(0); }',
      'html.dark .cnt-popup-panel { background:rgba(44,44,46,.97); box-shadow:0 -2px 20px rgba(0,0,0,.4); }',
      '.cnt-popup-handle { width:36px; height:5px; border-radius:3px; background:rgba(60,60,67,.25); margin:0 auto 8px; }',
      'html.dark .cnt-popup-handle { background:rgba(235,235,245,.2); }',
      '.cnt-popup-item { display:flex; align-items:center; gap:12px; padding:12px 16px; font-size:17px; font-weight:400; color:#1d1d1f; text-decoration:none; border-radius:10px; margin:0 4px; transition:background .1s ease, transform .15s cubic-bezier(.32,.72,0,1); }',
      'html.dark .cnt-popup-item { color:#f5f5f7; }',
      '.cnt-popup-item:hover { background:rgba(236,91,19,.06); }',
      'html.dark .cnt-popup-item:hover { background:rgba(236,91,19,.10); }',
      '.cnt-popup-item:active { background:rgba(236,91,19,.12); transform:scale(.98); }',
      'html.dark .cnt-popup-item:active { background:rgba(236,91,19,.18); }',
      '.cnt-popup-item.is-whatsapp .cnt-dropdown-icon { background:rgba(37,211,102,.12); }',
      'html.dark .cnt-popup-item.is-whatsapp .cnt-dropdown-icon { background:rgba(37,211,102,.20); }',
      '.cnt-popup-item.is-whatsapp .cnt-dropdown-icon .material-symbols-outlined { color:#25d366; }',
      '.cnt-popup-label { flex:1; min-width:0; }',
      '.cnt-popup-chevron { font-size:16px; color:rgba(60,60,67,.3); flex-shrink:0; }',
      'html.dark .cnt-popup-chevron { color:rgba(235,235,245,.25); }',
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ───────────────────────── BUILDERS ───────────────────────── */

  function buildDropdownItem(item, showSep) {
    var waCls = item.isWhatsApp ? ' is-whatsapp' : '';
    var row = '<a href="' + esc(item.href) + '" class="cnt-dropdown-item' + waCls + '">' +
      '<span class="cnt-dropdown-icon"><span class="material-symbols-outlined">' + esc(item.icon) + '</span></span>' +
      '<span class="cnt-dropdown-label" data-i18n="' + esc(item.key) + '">' + esc(item.key) + '</span>' +
      '<span class="material-symbols-outlined cnt-dropdown-chevron">chevron_right</span>' +
    '</a>';
    if (showSep) row += '<div class="cnt-dropdown-separator"></div>';
    return row;
  }

  function renderDropdown(cfg) {
    var items = ITEMS.map(function (item, idx) {
      return buildDropdownItem(item, idx < ITEMS.length - 1);
    }).join('\n');

    return '<div class="cnt-dropdown-wrap' + (isTouch() ? ' touch-device' : '') + '">' +
      '<a href="' + esc(cfg.href) + '"' +
         ' class="' + esc(cfg.activeClass || '') + ' cnt-dropdown-trigger"' +
         ' data-cnt-trigger-label="' + esc(cfg.labelKey) + '">' +
        '<span data-i18n="' + esc(cfg.labelKey) + '">' + esc(cfg.labelKey) + '</span>' +
        '<span class="material-symbols-outlined cnt-dropdown-arrow">expand_more</span>' +
      '</a>' +
      '<div class="cnt-dropdown-panel"><div class="cnt-dropdown-card">' + items + '</div></div>' +
    '</div>';
  }

  /* ───────────────────────── INTERACTION ───────────────────────── */

  function initDropdownClick() {
    document.addEventListener('click', function () {
      document.querySelectorAll('.cnt-dropdown-wrap.is-open')
        .forEach(function (d) { d.classList.remove('is-open'); });
    });
    document.querySelectorAll('.cnt-dropdown-trigger').forEach(function (t) {
      t.addEventListener('click', function (e) {
        if (window.innerWidth <= 720) return;
        e.preventDefault();
        e.stopPropagation();
        t.closest('.cnt-dropdown-wrap').classList.toggle('is-open');
      });
    });
  }

  /* ───────────────────────── MOBILE POPUP ───────────────────────── */

  function openPopup(_href) {
    closePopup();
    var overlay = document.createElement('div');
    overlay.className = 'cnt-popup-overlay';
    var panel = document.createElement('div');
    panel.className = 'cnt-popup-panel';

    var items = ITEMS.map(function (item) {
      var waCls = item.isWhatsApp ? ' is-whatsapp' : '';
      return '<a href="' + esc(item.href) + '" class="cnt-popup-item' + waCls + '">' +
        '<span class="cnt-dropdown-icon"><span class="material-symbols-outlined">' + esc(item.icon) + '</span></span>' +
        '<span class="cnt-popup-label" data-i18n="' + esc(item.key) + '">' + esc(item.key) + '</span>' +
        '<span class="material-symbols-outlined cnt-popup-chevron">chevron_right</span>' +
      '</a>';
    }).join('\n');

    panel.innerHTML = '<div class="cnt-popup-handle"></div>' + items;

    if (global.translationManager) {
      panel.querySelectorAll('[data-i18n]').forEach(function (el) {
        var val = global.translationManager.translate(el.getAttribute('data-i18n'));
        if (val && val !== el.getAttribute('data-i18n')) el.textContent = val;
      });
    }

    overlay.onclick = closePopup;
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    panel.querySelectorAll('.cnt-popup-item').forEach(function (item) {
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
    document.querySelectorAll('.cnt-popup-overlay,.cnt-popup-panel')
      .forEach(function (el) { el.parentNode && el.parentNode.removeChild(el); });
  }

  function bindAllPopupTriggers() {
    document.querySelectorAll('[data-cnt-popup]').forEach(function (el) {
      if (el._cntPopupBound) return;
      el._cntPopupBound = true;
      el.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        openPopup(el.getAttribute('data-cnt-popup-href') || el.getAttribute('href') || '/contact/');
      });
    });
  }

  document.addEventListener('spa:load', closePopup);

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.ContactDropdown = {
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
