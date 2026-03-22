/**
 * router.js — Yukoli Site-wide Navigation Utilities
 *
 * Provides: back button control, WhatsApp links, form submission,
 * bfcache recovery, and link wiring utilities.
 *
 * NOTE: Primary navigation (header/footer) is handled by navigator.js
 * and footer.js. This module provides supplementary utilities only.
 *
 * SSG: All page paths use directory URLs (/home/, /products/, etc.)
 *
 * @module router
 */
(function (global) {
  'use strict';
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 1: CONSTANTS & CONFIGURATION
     ═══════════════════════════════════════════════════════════════════ */
  var WHATSAPP_NUMBER = (global.Contacts && global.Contacts.whatsapp) || '16478158194';
  var PAGES = Object.freeze({
    home:           '/home/',
    catalog:        '/products/',
    caseStudies:    '/cases/',
    caseDownload:   '/cases/download/',
    quote:          '/quote/',
    thankYou:       '/thank-you/',
    landing:        '/landing/',
    products:       '/products/',
    support:        '/support/',
    esg:            '/esg/',
    roiCalculator:  '/roi/',
  });
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 2: DEPRECATED (removed getDeviceType, resolveDeviceUrl)
     ═══════════════════════════════════════════════════════════════════ */
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 3: NAVIGATION FUNCTIONS
     ═══════════════════════════════════════════════════════════════════ */
  function navigate(url) {
    global.location.href = url;
  }
  function whatsappHref(msg) {
    var base = 'https://wa.me/' + WHATSAPP_NUMBER;
    return msg ? base + '?text=' + encodeURIComponent(msg) : base;
  }
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 4: BACK BUTTON CONTROLLER (State-Based, Reliable)
     ═══════════════════════════════════════════════════════════════════ */
  /**
   * BackButtonController: Manages back button state with reliable debouncing
   * Uses isNavigating flag instead of time-based debounce (more predictable)
   */
  function BackButtonController(debounceMs) {
    this.isNavigating = false;
    this.debounceMs = debounceMs || 150;
  }
  BackButtonController.prototype.back = function () {
    if (this.isNavigating) return;
    this.isNavigating = true;
    var self = this;
    setTimeout(function () { self.isNavigating = false; }, this.debounceMs);
    if (global.history && global.history.length > 1) {
      global.history.back();
    } else {
      navigate(PAGES.home);
    }
  };
  const backController = new BackButtonController();
  function safeBack() {
    backController.back();
  }
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 5: UTILITY FUNCTIONS
     ═══════════════════════════════════════════════════════════════════ */
  /**
   * Attach click handler to elements matching selector (using forEach)
   */
  function on(selector, handler) {
    var els = document.querySelectorAll(selector);
    for (var i = 0; i < els.length; i++) {
      els[i].addEventListener('click', handler);
    }
  }
  /**
   * Smooth scroll to element by ID
   */
  function scrollTo(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 6: LINK WIRING (OPTIMIZED: Single Pass)
     ═══════════════════════════════════════════════════════════════════ */
  /**
   * Wire navigation links - Single pass, high-performance
   *
   * Two-tier lookup strategy:
   * 1. data-i18n attribute (language-agnostic, highest priority)
   * 2. Text content fallback (language-dependent, for legacy links)
   *
   * This allows gradual migration to data-i18n-based navigation
   * while maintaining backward compatibility.
   */
  function wireNavLinks() {
    // Priority 1: i18n key to page mapping (language-agnostic)
    var i18nLinkMap = {
      footer_hardware_title: PAGES.catalog,
      nav_hardware: PAGES.catalog,
      nav_solutions: PAGES.home,
      nav_case_studies: PAGES.caseStudies,
      footer_support_title: PAGES.support,
      nav_support: PAGES.support,
      nav_contact: PAGES.quote,
      footer_case_studies: PAGES.caseStudies,
      quote_equipment: PAGES.catalog,
    };

    // Priority 2: Text-based mapping (fallback, language-dependent)
    var textLinkMap = {
      'Hardware': PAGES.catalog,
      'Solutions': PAGES.products,
      'IoT OS': PAGES.support,
      'IoT': PAGES.support,
      'ROI Calculator': PAGES.roiCalculator,
      'Case Studies': PAGES.caseStudies,
      'About': PAGES.home,
      'Support': PAGES.support,
      'Dashboard': PAGES.home,
      'Inventory': PAGES.catalog,
      'Analytics': PAGES.catalog,
      'Products': PAGES.catalog,
      'Home': PAGES.home,
      'Equipment': PAGES.catalog,
      'Insights': PAGES.caseStudies,
      'Config': PAGES.quote,
      'ESG Report': PAGES.esg,
      'Global Benchmarks': PAGES.esg,
    };

    var allLinks = document.querySelectorAll('a[href="#"], nav a');

    for (var i = 0; i < allLinks.length; i++) {
      var el = allLinks[i];
      var href = null;

      // Priority 1: Match by data-i18n attribute
      var key = el.getAttribute('data-i18n');
      if (key && i18nLinkMap[key]) {
        href = i18nLinkMap[key];
      }

      // Priority 2: Match by text content (fallback)
      if (!href) {
        var text = el.textContent.trim();
        if (textLinkMap[text]) {
          href = textLinkMap[text];
        }
      }

      // Apply resolved href
      if (href) {
        el.href = href;
      }
    }
  }
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 7: WHATSAPP LINKS
     ═══════════════════════════════════════════════════════════════════ */
  function wireWhatsAppLinks() {
    var wa = document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]');
    var href = whatsappHref('Hello Yukoli, I need support.');
    for (var i = 0; i < wa.length; i++) {
      var link = wa[i];
      var current = link.getAttribute('href') || '';
      if (current === '#' || current.indexOf('yournumber') !== -1 || current.indexOf('yourlink') !== -1) {
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    }
  }
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 8: QUOTE BUTTONS
     ═══════════════════════════════════════════════════════════════════ */
  function wireQuoteButtons() {
    if (typeof global.showSmartPopupManual === 'function') return;
    var quoteI18nKeys = ['nav_get_quote', 'landing_request_quote', 'quote_get_a_quote'];
    var quoteFallbackTexts = ['Get a Quote', 'Request a Quote'];
    var btns = document.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        var key = btn.getAttribute('data-i18n');
        var text = btn.textContent.trim();
        if (quoteI18nKeys.indexOf(key) !== -1 || quoteFallbackTexts.indexOf(text) !== -1) {
          btn.addEventListener('click', function () { navigate(PAGES.quote); });
        }
      })(btns[i]);
    }
  }
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 9: LOGO / HOME LINKS
     ═══════════════════════════════════════════════════════════════════ */
  function wireHomeLogo() {
    var logos = document.querySelectorAll('a[href="/"], a[href="./"], a[href="#home"], a[href="#"]');
    for (var i = 0; i < logos.length; i++) {
      var el = logos[i];
      var hasIcon = el.querySelector('[data-icon="restaurant"], .material-symbols-outlined');
      var hasBrand = el.textContent.toLowerCase().indexOf('yukoli') !== -1;
      var isRoot = el.getAttribute('href') === '/' || el.getAttribute('href') === './';
      if (isRoot || hasIcon || hasBrand) {
        el.href = PAGES.home;
      }
    }
  }
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 10: FORM SUBMISSION
     ═══════════════════════════════════════════════════════════════════ */
  function wireFormSubmit() {
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
      (function (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var inputs = form.querySelectorAll(
            'input[type="text"], input[type="email"], input[type="number"], input[type="url"]'
          );
          var valid = true;
          for (var j = 0; j < inputs.length; j++) {
            if (inputs[j].required && !inputs[j].value.trim()) {
              inputs[j].focus();
              valid = false;
              break;
            }
          }
          if (!valid) return;
          var submitBtn = form.querySelector('[type="submit"]');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending\u2026';
          }
          setTimeout(function () {
            navigate(PAGES.thankYou);
          }, 800);
        });
      })(forms[i]);
    }
  }
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 11: BOTTOM NAV ACTIVE STATE
     ═══════════════════════════════════════════════════════════════════ */
  function wireBottomNav() {
    var path = global.location.pathname;
    var bottomLinks = document.querySelectorAll('.fixed.bottom-0 a');
    for (var i = 0; i < bottomLinks.length; i++) {
      var link = bottomLinks[i];
      var label = link.textContent.trim().toLowerCase();
      var isActive = false;
      if (label === 'home' && (path === '/' || path.indexOf('home') !== -1 || path.indexOf('index') !== -1)) {
        isActive = true;
      } else if ((label === 'hardware' || label === 'equipment' || label === 'inventory') && path.indexOf('catalog') !== -1) {
        isActive = true;
      } else if (label === 'quotes' && path.indexOf('quote') !== -1) {
        isActive = true;
      }
      if (isActive) {
        link.classList.add('text-primary');
        link.classList.remove('text-slate-400', 'text-slate-500');
      }
    }
  }
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 12: PAGE-SPECIFIC INITIALIZATION
     ═══════════════════════════════════════════════════════════════════ */

  /**
   * Page-specific button action handlers
   *
   * Centralized event delegation for page-specific button actions.
   * Uses the existing `on()` helper for consistent event handling.
   *
   * Supported actions:
   * - ROI Calculator navigation (home page)
   * - View Summary scroll (catalog page)
   */
  function setupPageSpecificActions() {
    var path = global.location.pathname;

    // Home page: ROI Calculator buttons
    if (path === '/' || path.indexOf('/home/') !== -1 || path.indexOf('/index') !== -1) {
      on('button', function (e) {
        var key = e.currentTarget.getAttribute('data-i18n') || '';
        var text = e.currentTarget.textContent.trim();

        // Navigate to ROI Calculator on specific button clicks
        if (key === 'home_roi_cta' || key === 'home_launch_roi' ||
            text.indexOf('ROI Calculator') !== -1 ||
            text.indexOf('Profit Calculator') !== -1) {
          navigate(PAGES.roiCalculator);
        }
      });
    }

    // Catalog page: View Summary button
    if (path.indexOf('/products/') !== -1 || path.indexOf('/catalog') !== -1) {
      on('button', function (e) {
        var key = e.currentTarget.getAttribute('data-i18n') || '';
        var text = e.currentTarget.textContent.trim();

        // Scroll to download form on View Summary button
        if (key === 'catalog_view_summary' || text === 'View Summary') {
          scrollTo('download-form');
        }
      });
    }
  }

  // Legacy aliases for backward compatibility
  function initHome() {
    setupPageSpecificActions();
    wireBottomNav();
  }

  function initCatalog() {
    setupPageSpecificActions();
  }
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 13: BFCACHE RECOVERY (Event-Driven, Reliable)
     ═══════════════════════════════════════════════════════════════════ */
  /**
   * Setup bfcache recovery using pageshow event
   * IMPORTANT: No delayed checks, no unreliable state inspection
   * Event-driven recovery is the correct modern approach
   */
  function setupBfcacheRecovery() {
    global.addEventListener('pageshow', function (event) {
      if (!event.persisted) return;
      if (typeof init === 'function') {
        init();
      }
      if (typeof global.recoverTranslationsFromBfcache === 'function') {
        global.recoverTranslationsFromBfcache();
      } else if (typeof global.applyTranslations === 'function') {
        global.applyTranslations();
      }
    });
  }
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 14: MAIN INITIALIZATION
     ═══════════════════════════════════════════════════════════════════ */
  /**
   * Main init function: Sets up all page wiring and initialization
   */
  function init() {
    // Common wiring for all pages
    wireNavLinks();
    wireWhatsAppLinks();
    wireQuoteButtons();
    wireHomeLogo();
    wireFormSubmit();
    // Page-specific initialization
    var path = global.location.pathname;
    if (path === '/' || path.indexOf('/home/') !== -1 || path.indexOf('/index') !== -1) {
      initHome();
    }
    if (path.indexOf('/products/') !== -1 || path.indexOf('/catalog') !== -1) {
      initCatalog();
    }
    // Other pages can be extended as needed
  }
  /* ═══════════════════════════════════════════════════════════════════
     SECTION 15: AUTO-START & EXPORTS
     ═══════════════════════════════════════════════════════════════════ */
  // Auto-initialize when DOM is ready
  if (global.CommonUtils && typeof global.CommonUtils.ready === 'function') {
    global.CommonUtils.ready(init);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // Setup bfcache recovery handlers
  setupBfcacheRecovery();
  // Export public API for debugging and external use
  global.YukoliRouter = {
    navigate: navigate,
    whatsappHref: whatsappHref,
    safeBack: safeBack,
    PAGES: PAGES,
  };
}(window));
