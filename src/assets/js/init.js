// init.js - Initialization and user tracking code
// IIFE wrapper for src2 (no build tools)
// This code runs immediately and doesn't wait for DOM ready
// Outputs: window.userActivity

(function (global) {
  'use strict';

  // ============================================
  // Service Worker Registration
  // ============================================
  var serviceWorkerRegistration = null;

  // Guard flag: only reload after the user explicitly clicked "Update Now".
  var pendingSwReload = false;

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('./sw.js')
      .then(function (registration) {
        serviceWorkerRegistration = registration;

        registration.addEventListener('updatefound', function () {
          var newWorker = registration.installing;
          newWorker.addEventListener('statechange', function () {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showServiceWorkerUpdateNotification();
            }
          });
        });

        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (pendingSwReload) global.location.reload();
        });

        if (registration.waiting) showServiceWorkerUpdateNotification();
      })
      .catch(function (error) {
        console.error('[SW] Registration failed:', error);
      });
  }

  function showServiceWorkerUpdateNotification() {
    if (document.getElementById('sw-update-notification')) return;

    var notification = document.createElement('div');
    notification.id = 'sw-update-notification';
    notification.style.cssText = [
      'position:fixed',
      'top:20px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:white',
      'padding:16px 24px',
      'border-radius:8px',
      'box-shadow:0 4px 12px rgba(0,0,0,0.15)',
      'display:flex',
      'align-items:center',
      'gap:16px',
      'z-index: var(--z-notification)',
      'animation:slide-down 0.3s ease-out'
    ].join(';');

    notification.innerHTML = [
      '<span style="color:#333;font-size:14px;">A new version is available. Click to update.</span>',
      '<button id="sw-update-button" style="background:#3498db;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;font-weight:500;">Update Now</button>',
      '<button id="sw-dismiss-button" style="background:transparent;color:#666;border:none;padding:4px 8px;cursor:pointer;font-size:18px;">×</button>'
    ].join('');

    document.body.appendChild(notification);

    document.getElementById('sw-update-button').addEventListener('click', function () {
      if (serviceWorkerRegistration && serviceWorkerRegistration.waiting) {
        pendingSwReload = true;
        serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      notification.remove();
    });

    document.getElementById('sw-dismiss-button').addEventListener('click', function () {
      notification.remove();
    });
  }

  // Register Service Worker immediately
  // In development (localhost / common dev ports) skip registration and
  // unregister any previously installed service workers to avoid stale cache.
  (function() {
    var devHosts = ['localhost', '127.0.0.1'];
    var devPorts = ['8080', '3000', '3001', '5000', '5001', '5002'];

    var isDevHost = devHosts.indexOf(location.hostname) !== -1;
    var isDevPort = devPorts.indexOf(location.port) !== -1;

    if (isDevHost || isDevPort) {
      // Unregister any existing service workers to ensure dev changes take effect
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (r) { r.unregister().catch(function(){/*ignore*/}); });
          // Also attempt to clear Cache Storage to avoid serving stale assets
          if ('caches' in window) {
            caches.keys().then(function (keys) {
              return Promise.all(keys.map(function (k) { return caches.delete(k); }));
            }).then(function (_results) {
            }).catch(function () {
            });
          }
          // Try to delete common IndexedDB databases used by the app (best-effort)
          try {
            if (window.indexedDB && window.indexedDB.databases) {
              window.indexedDB.databases().then(function(dbs){
                dbs.forEach(function(db){
                  try { window.indexedDB.deleteDatabase(db.name); } catch(e){}
                });
              }).catch(function(){ /* ignore */ return; });
            }
          } catch (e) { /* ignore */ }
        }).catch(function() {/*ignore*/});
      }
      // Skip registering in development
      return;
    }

    // Not dev — proceed to register
    registerServiceWorker();
  })();

  // ============================================
  // User Activity Tracking for Smart Popup System
  // ============================================
  var userActivity = {
    timeOnPage: 0,
    timeOnProductSection: 0,
    inProductSection: false,
    lastActivityTime: Date.now(),
    nonLinkClickCount: 0,
    hasScrolled: false,
    scrollDepth: 0,
    popupShownCount: 0,
    maxPopupsPerSession: 4,
    popupTriggers: {
      timeOnPage: false,
      inProductSection: false,
      nonLinkClick: false,
      manual: false
    }
  };

  setInterval(function () {
    userActivity.timeOnPage++;
    if (userActivity.inProductSection) userActivity.timeOnProductSection++;
  }, 1000);

  document.addEventListener('mousemove', function () {
    userActivity.lastActivityTime = Date.now();
  });

  document.addEventListener('scroll', function () {
    userActivity.lastActivityTime = Date.now();
    userActivity.hasScrolled = true;
    var winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    userActivity.scrollDepth = (winScroll / height) * 100;
  });

  document.addEventListener('click', function (e) {
    userActivity.lastActivityTime = Date.now();
    var isLink = e.target.closest('a, button, [role="button"]');
    var isInput = e.target.closest('input, textarea, select');
    var isInteractive = e.target.closest('.product-card, .certificate-card, nav, header, .floating-sidebar');
    if (!isLink && !isInput && !isInteractive && userActivity.inProductSection) {
      userActivity.nonLinkClickCount++;
    }
  });

  function setupProductSectionTracking() {
    var productSection = document.getElementById('produkten');
    if (!productSection) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        userActivity.inProductSection = entry.isIntersecting;
      });
    }, { threshold: 0.3 });
    observer.observe(productSection);
  }

  global.userActivity = userActivity;

  // ============================================
  // IoT Pulse — breathing light on sensor nodes (§3.1)
  // ============================================
  /**
   * Finds elements that look like IoT sensor/node indicators (small dots, icons
   * with keywords in class or aria-label) and adds .iot-pulse so the CSS
   * iot-breathe animation plays automatically.
   *
   * Selectors are intentionally conservative to avoid tagging unrelated elements.
   */
  function initIoTPulse() {
    var selectors = [
      '[data-iot-node]',
      '[data-sensor]',
      '.iot-node',
      '.sensor-dot',
      '.node-indicator',
      '[aria-label*="sensor"]',
      '[aria-label*="node"]'
    ];
    var _count = 0;
    selectors.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (el) {
          if (!el.classList.contains('iot-pulse')) {
            el.classList.add('iot-pulse');
            _count++;
          }
        });
      } catch (e) { /* ignore */ }
    });
  }

  // ============================================
  // GEO Dynamic Hero Content (§2.2)
  // ============================================
  /**
   * Uses navigator.language as a lightweight proxy for geographic region.
   * Southeast-Asian locales → show "8-Month Payback" + WhatsApp hint badge.
   * All other locales      → show "ESG Compliance" + "Energy Star" badge.
   *
   * Looks for a hero section with [data-geo-hero] attribute or the first
   * <section> element, and injects a small badge div if none exists.
   */
  var SEA_LOCALES = ['id', 'ms', 'th', 'vi', 'tl', 'my', 'km', 'lo'];

  function getRegionType() {
    var lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    var primary = lang.split('-')[0];
    if (SEA_LOCALES.indexOf(primary) !== -1) return 'sea';
    // zh-SG, zh-MY → SEA
    if (primary === 'zh' && (lang.indexOf('sg') !== -1 || lang.indexOf('my') !== -1)) return 'sea';
    return 'global';
  }

  function injectGeoBadge(hero, region) {
    if (!hero || hero.querySelector('.geo-badge')) return; // already injected

    var badge = document.createElement('div');
    badge.className = 'geo-badge';
    badge.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'gap:0.5rem',
      'padding:0.35rem 0.875rem',
      'border-radius:9999px',
      'font-size:0.8rem',
      'font-weight:700',
      'letter-spacing:0.01em',
      'margin-top:0.75rem',
      'width:fit-content'
    ].join(';');

    if (region === 'sea') {
      badge.style.background = 'rgba(236,91,19,0.12)';
      badge.style.color = '#ec5b13';
      badge.style.border = '1px solid rgba(236,91,19,0.3)';
      badge.innerHTML = [
        '<span style="font-size:1rem;">💬</span>',
        '<span>8-Month Payback · WhatsApp Direct Support</span>'
      ].join('');
    } else {
      badge.style.background = 'rgba(34,197,94,0.1)';
      badge.style.color = '#16a34a';
      badge.style.border = '1px solid rgba(34,197,94,0.25)';
      badge.innerHTML = [
        '<span style="font-size:1rem;">🌿</span>',
        '<span>ESG Compliant · Energy Star Certified</span>'
      ].join('');
    }

    // Try to insert after the first <h1> or at the beginning of hero
    var h1 = hero.querySelector('h1, h2');
    if (h1 && h1.parentElement) {
      h1.parentElement.insertBefore(badge, h1.nextSibling);
    } else {
      hero.insertBefore(badge, hero.firstChild);
    }

  }

  function initGeoHero() {
    var hero = document.querySelector('[data-geo-hero]') ||
               document.querySelector('section:first-of-type') ||
               document.querySelector('header + section') ||
               document.querySelector('.hero') ||
               document.querySelector('#hero');
    if (!hero) return;
    var region = getRegionType();
    injectGeoBadge(hero, region);
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupProductSectionTracking();
    initIoTPulse();
    initGeoHero();
  });

}(window));
