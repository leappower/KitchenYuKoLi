/**
 * mobile-bottom-bar.js — Mobile Quick Navigation Bar
 *
 * Shows a fixed bottom bar with 4 quick-access buttons on mobile (<768px).
 * Only renders once; skips on repeat calls (e.g., after SPA navigation).
 *
 * Injected via navigator.js on mount and on every spa:load event.
 */
(function (window) {
  'use strict';

  var STYLE_ID = 'mobile-bottom-bar-styles';
  var BAR_ID = 'mobile-bottom-bar';
  var SPACER_ID = 'mobile-bottom-bar-spacer';

  var WHATSAPP_URL =
    'https://api.whatsapp.com/send/?phone=8613163756465' +
    '&text=Hi%2C%20I%27m%20interested%20in%20YuKoLi%20commercial%20kitchen%20equipment.';

  /* ─── 1. Inject <style> (idempotent) ──────────────────────── */
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var css = [
      '#' + BAR_ID + ' {',
      '  position: fixed;',
      '  bottom: 0; left: 0; right: 0;',
      '  z-index: var(--z-header, 1000);',
      '  height: 56px;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-around;',
      '  background: rgba(255,255,255,0.92);',
      '  backdrop-filter: blur(12px);',
      '  -webkit-backdrop-filter: blur(12px);',
      '  border-top: 1px solid rgba(226,232,240,0.8);',
      '  padding: 0 8px;',
      '  padding-bottom: env(safe-area-inset-bottom, 0);',
      '}',
      '',
      '#' + BAR_ID + ' a {',
      '  display: flex;',
      '  flex-direction: column;',
      '  align-items: center;',
      '  justify-content: center;',
      '  gap: 2px;',
      '  text-decoration: none;',
      '  color: #475569;',
      '  font-size: 10px;',
      '  font-weight: 600;',
      '  padding: 4px 12px;',
      '}',
      '',
      '#' + BAR_ID + ' a .bb-icon {',
      '  font-size: 20px;',
      '  line-height: 1;',
      '}',
      '',
      '#' + BAR_ID + ' .bb-whatsapp {',
      '  color: #16a34a;',
      '  font-weight: 700;',
      '  background: #f0fdf4;',
      '  border-radius: 12px;',
      '  padding: 4px 14px;',
      '}',
      '',
      '#' + SPACER_ID + ' {',
      '  height: 56px;',
      '  flex-shrink: 0;',
      '}',
      '',
      '/* Dark mode */',
      'html.dark #' + BAR_ID + ' {',
      '  background: rgba(30,41,59,0.92);',
      '  border-top-color: rgba(71,85,105,0.4);',
      '}',
      'html.dark #' + BAR_ID + ' a {',
      '  color: #cbd5e1;',
      '}',
      'html.dark #' + BAR_ID + ' .bb-whatsapp {',
      '  background: rgba(22,163,74,0.15);',
      '  color: #4ade80;',
      '}',
    ].join('\n');

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ─── 2. Build bar HTML ──────────────────────────────────── */
  function buildBarHTML() {
    var bp = (window.BASE_PATH || '');

    var items = [
      { href: bp + '/products/',         icon: '🏠', label: '产品' },
      { href: bp + '/applications/',     icon: '📊', label: '场景' },
      { href: bp + '/profit-calculator/', icon: '💰', label: '回报' },
    ];

    var links = items.map(function (item) {
      return '<a href="' + item.href + '">' +
        '<span class="bb-icon">' + item.icon + '</span>' +
        '<span>' + item.label + '</span>' +
      '</a>';
    }).join('\n');

    // WhatsApp button (external link, highlighted)
    links += '\n' +
      '<a class="bb-whatsapp" href="' + WHATSAPP_URL + '" target="_blank" rel="noopener">' +
        '<span class="bb-icon">💬</span>' +
        '<span>WhatsApp</span>' +
      '</a>';

    return links;
  }

  /* ─── 3. Insert bar + content spacer (idempotent) ─────────── */
  function render() {
    // Already rendered
    if (document.getElementById(BAR_ID)) return;

    // Only on mobile
    if (window.innerWidth >= 768) return;

    injectStyles();

    // Create bar
    var bar = document.createElement('nav');
    bar.id = BAR_ID;
    bar.setAttribute('aria-label', 'Quick navigation');
    bar.innerHTML = buildBarHTML();
    document.body.appendChild(bar);

    // Create spacer so content doesn't hide behind the bar
    if (!document.getElementById(SPACER_ID)) {
      var spacer = document.createElement('div');
      spacer.id = SPACER_ID;
      var main = document.getElementById('spa-content');
      if (main && main.parentNode) {
        main.parentNode.insertBefore(spacer, main.nextSibling);
      } else {
        document.body.appendChild(spacer);
      }
    }
  }

  /* ─── Public API ─────────────────────────────────────────── */
  window.MobileBottomBar = { render: render };

})(window);
