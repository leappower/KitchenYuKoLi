/**
 * footer.js — Yukoli Mobile Bottom Navigation
 *
 * Renders the fixed bottom navigation bar for mobile devices only.
 * (Tablet no longer has bottom nav — uses header menu instead.)
 *
 * Usage in HTML:
 *   <footer data-component="footer"
 *        data-variant="mobile"
 *        data-active="home">
 *   </footer>
 *
 * Configuration attributes:
 *   data-variant    {string}  Navigation set: "mobile" (4 items)
 *                             (default: "mobile")
 *   data-active     {string}  Active nav item id: "home" | "products" |
 *                             "solutions" | "whatsapp"
 *                             (default: "")
 *
 * Mobile Tab Bar (4 items):
 *   Home, Products, Solutions, WhatsApp (launches WhatsApp directly)
 */

(function (global) {
  'use strict';

  /* ─────────────────────────────────────────────
   * 0. CONSTANTS
   * ───────────────────────────────────────────── */

  // Mobile Tab Bar — 4 items only
  // Home / Products / Solutions / WhatsApp
  var NAV_MOBILE = [
    { id: 'home',          icon: 'home',          key: 'nav_home',           href: '/home/',             fill: true },
    { id: 'products',      icon: 'kitchen',       key: 'nav_products',       href: '/products/',         fill: false },
    { id: 'solutions',     icon: 'build',         key: 'nav_solutions',      href: '/solutions/',        fill: false },
    { id: 'whatsapp',      icon: 'chat',          key: 'nav_whatsapp',       href: '',                  fill: false, isWhatsApp: true },
  ];

  /* ─────────────────────────────────────────────
   * 1. HELPERS
   * ───────────────────────────────────────────── */

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ─────────────────────────────────────────────
   * 2. TEMPLATE BUILDERS
   * ───────────────────────────────────────────── */

  function buildNavItems(items, activeId) {
    return items.map(function (item) {
      var isActive = item.id === activeId;
      var colorCls = isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500';
      var iconVariation = (isActive && item.fill)
        ? ' style="font-variation-settings: \'FILL\' 1;"'
        : '';
      var label = item.key
        ? '<p class="text-[10px] font-bold uppercase tracking-wider" data-i18n="' + esc(item.key) + '">' + esc(item.key) + '</p>'
        : '';

      // WhatsApp item: green icon color, custom click handler
      if (item.isWhatsApp) {
        colorCls = 'text-[#25d366]';
        return (
          '<a class="whatsapp-tab-item relative flex flex-1 flex-col items-center justify-center gap-1 ' + colorCls + '"' +
             ' href="https://wa.me/XXXXXXXXXXX" target="_blank" rel="noopener noreferrer"' +
             ' aria-label="WhatsApp">' +
            '<span class="material-symbols-outlined relative" style="font-size:26px">' + esc(item.icon) + '</span>' +
            label +
          '</a>'
        );
      }

      return (
        '<a class="relative flex flex-1 flex-col items-center justify-center gap-1 ' + colorCls + '"' +
           ' href="' + esc(item.href) + '">' +
          '<span class="material-symbols-outlined relative' + iconVariation + '">' + esc(item.icon) + '</span>' +
          label +
        '</a>'
      );
    }).join('\n');
  }

  function buildNavBar(variant, activeId) {
    return (
      '<div class="fixed bottom-0 left-0 right-0 z-[var(--z-footer)]">' +
        '<div class="flex gap-2 border-t border-slate-200 dark:border-slate-800 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 pb-6 pt-2">' +
          buildNavItems(NAV_MOBILE, activeId) +
        '</div>' +
      '</div>'
    );
  }


  /* ─────────────────────────────────────────────
   * 3. MOUNT
   * ───────────────────────────────────────────── */

  function mount() {
    var placeholders = document.querySelectorAll('footer[data-component="footer"]');
    for (var i = 0; i < placeholders.length; i++) {
      var el = placeholders[i];
      var cfg = {
        variant: el.getAttribute('data-variant') || 'mobile',
        active:  el.getAttribute('data-active') || ''
      };

      // Hide footer on PC/Tablet (≥768px) — only mobile gets bottom nav
      if (window.innerWidth >= 768) {
        el.innerHTML = '';
        el.style.display = 'none';
        continue;
      }

      // Ensure footer is visible (in case it was hidden on desktop then resized to mobile)
      el.style.display = '';

      var html = buildNavBar(cfg.variant, cfg.active);
      el.innerHTML = html;
    }

    // Apply i18n, then reveal the bottom nav with a fade-in to hide key→text swap.
    var bottomNav = document.querySelector('.fixed.bottom-0');
    if (bottomNav) {
      bottomNav.style.opacity = '0';
      bottomNav.style.transition = 'opacity 0.15s ease-out';
    }
    if (global.translationManager && typeof global.translationManager.applyTranslations === 'function') {
      global.translationManager.applyTranslations();
    }
    global.requestAnimationFrame(function () {
      if (bottomNav) bottomNav.style.opacity = '1';
    });
  }

  /* ─────────────────────────────────────────────
   * 5. UPDATE ACTIVE STATE (SPA re-mount)
   * ───────────────────────────────────────────── */

  /**
   * Update the active navigation item without full re-render.
   * Used by SPA shell after page navigation to highlight the correct nav item.
   * @param {string} activeId - The active nav item id (e.g. "home", "catalog", "case-studies", "support")
   */
  function updateActive(activeId) {
    activeId = activeId || '';

    var navLinks = document.querySelectorAll('.fixed.bottom-0 a[href]');

    // 容错处理:如果没有导航链接,直接返回(PC 端没有底部导航)
    if (navLinks.length === 0) {
      console.log('[footer] No bottom nav links found, skipping active state update');
      return;
    }

    for (var i = 0; i < navLinks.length; i++) {
      var link = navLinks[i];
      var linkHref = link.getAttribute('href') || '';
      var matchedItem = null;
      for (var j = 0; j < NAV_MOBILE.length; j++) {
        if (linkHref.indexOf(NAV_MOBILE[j].href) !== -1 ||
            (NAV_MOBILE[j].href.endsWith('/') && linkHref.startsWith(NAV_MOBILE[j].href))) {
          matchedItem = NAV_MOBILE[j];
          break;
        }
      }
      if (!matchedItem) continue;

      var isActive = matchedItem.id === activeId;
      var iconSpan = link.querySelector('.material-symbols-outlined');
      if (isActive) {
        link.className = 'flex flex-1 flex-col items-center justify-center gap-1 text-primary';
        if (iconSpan && matchedItem.fill) {
          iconSpan.setAttribute('style', 'font-variation-settings: \'FILL\' 1;');
        }
      } else if (!matchedItem.isWhatsApp) {
        link.className = 'flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500';
        if (iconSpan) {
          iconSpan.removeAttribute('style');
        }
      }
    }
  }

  /* ─────────────────────────────────────────────
   * 6. BOOT
   * ───────────────────────────────────────────── */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // Re-mount after bfcache restoration (back/forward navigation)
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      // Check if footer needs re-mounting
      var placeholders = document.querySelectorAll('footer[data-component="footer"]');
      var needsRemount = false;
      for (var i = 0; i < placeholders.length; i++) {
        var ph = placeholders[i];
        // If footer placeholder exists but bottom nav not present inside it
        if (!ph.querySelector || !ph.querySelector('.fixed.bottom-0')) {
          needsRemount = true;
          break;
        }
      }
      // Also check if bottom nav is missing from DOM entirely
      var bottomNav = document.querySelector('.fixed.bottom-0');
      if (!bottomNav) {
        needsRemount = true;
      }
      if (needsRemount) {
        console.log('[footer] Re-mounting after bfcache restoration');
        mount();
      }
    }
  });

  // Expose for programmatic re-mount (e.g. testing)
  global.Footer = { mount: mount, updateActive: updateActive };

  // Re-evaluate footer visibility on resize (e.g. rotate device, resize window)
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      mount();
    }, 200);
  });

}(window));
