/**
 * navigation.js — Back-to-top, nav highlight, mobile menu, dark mode (IIFE build for src/ static HTML)
 * Synced from: src/assets/navigation.js
 * Global: window.Navigation
 *
 * Dependencies (must load before this file):
 *   <script src="../../assets/js/common.js"></script>
 *   <script src="../../assets/js/media-queries.js"></script>
 *
 * Usage: <script src="../../assets/js/navigation.js"></script>
 * Then call:
 *   window.Navigation.setupBackToTopButton();
 *   window.Navigation.setupNavHighlight();
 *   window.Navigation.setupMobileMenuAutoClose();
 *   window.Navigation.initDarkMode();
 */
(function (global) {
  'use strict';

  // ─── Read dependencies from window ──────────────────────────────────────────
  /** 读取移动端断点状态。优先 MediaQueries.isMobile()，降级 innerWidth < 768。 */
  function getMqMobile() {
    return global.MediaQueries ? global.MediaQueries.isMobile() : global.innerWidth < 768;
  }

  function debounce(func, wait) {
    if (global.CommonUtils) return global.CommonUtils.debounce(func, wait);
    // Inline fallback
    if (wait === undefined) wait = 300;
    var timeout;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(timeout);
      timeout = setTimeout(function () { func.apply(ctx, args); }, wait);
    };
  }

  // ============================================
  // 回到顶部按钮系统
  // ============================================
  function setupBackToTopButton() {
    var backToTopBtn = document.getElementById('back-to-top');
    if (!backToTopBtn) return;

    backToTopBtn.classList.add('hide');

    var checkScrollPosition = function () {
      var windowHeight = global.innerHeight;
      var documentHeight = document.documentElement.scrollHeight;
      var scrollableHeight = documentHeight - windowHeight;
      var isMobile = getMqMobile();
      var threshold = isMobile ? 0.3 : 0.5;
      var scrollThreshold = scrollableHeight * threshold;

      if (global.pageYOffset > scrollThreshold) {
        backToTopBtn.classList.remove('hide');
      } else {
        backToTopBtn.classList.add('hide');
      }
    };

    global.addEventListener('scroll', checkScrollPosition, { passive: true });
    global.addEventListener('resize', debounce(checkScrollPosition, 150), { passive: true });
    backToTopBtn.addEventListener('click', function (e) {
      e.preventDefault();
      global.scrollTo({ top: 0, behavior: 'smooth' });
    });

    checkScrollPosition();
  }

  // ============================================
  // 导航栏滚动高亮系统
  // ============================================
  function setupNavHighlight() {
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('header nav a[href^="#"]');
    var sectionPositions = [];

    function calculateSectionPositions() {
      sectionPositions = [];
      sections.forEach(function (section) {
        var rect = section.getBoundingClientRect();
        var scrollY = global.scrollY || global.pageYOffset;
        var offset = 100;
        if (section.id) {
          sectionPositions.push({
            id: section.id,
            top: rect.top + scrollY - offset,
            bottom: rect.top + scrollY + rect.height - offset
          });
        }
      });
      sectionPositions.sort(function (a, b) { return a.top - b.top; });
    }

    function updateActiveNavLink() {
      if (sectionPositions.length === 0) return;
      var currentScroll = global.scrollY || global.pageYOffset;
      var currentSection = null;
      for (var i = 0; i < sectionPositions.length; i++) {
        var section = sectionPositions[i];
        if (currentScroll >= section.top && (i === sectionPositions.length - 1 || currentScroll < sectionPositions[i + 1].top)) {
          currentSection = section.id;
          break;
        }
      }
      if (!currentSection && currentScroll > sectionPositions[sectionPositions.length - 1].top) {
        currentSection = sectionPositions[sectionPositions.length - 1].id;
      }
      navLinks.forEach(function (link) {
        var href = link.getAttribute('href');
        var linkSection = href.startsWith('#') ? href.substring(1) : href;
        if (currentSection === linkSection) link.classList.add('active');
        else link.classList.remove('active');
      });
    }

    calculateSectionPositions();
    var scrollTimeout;
    global.addEventListener('scroll', function () {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateActiveNavLink, 100);
    });
    global.addEventListener('resize', function () {
      calculateSectionPositions();
      updateActiveNavLink();
    });
    setTimeout(function () {
      calculateSectionPositions();
      updateActiveNavLink();
    }, 100);

    navLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var targetId = this.getAttribute('href');
        if (!targetId.startsWith('#')) return;
        var targetElement = document.querySelector(targetId);
        if (targetElement) {
          navLinks.forEach(function (l) { l.classList.remove('active'); });
          link.classList.add('active');
          global.scrollTo({ top: targetElement.offsetTop - 80, behavior: 'smooth' });
          history.pushState(null, null, targetId);
        }
      });
    });

    var mobileNavLinks = document.querySelectorAll('#mobile-menu nav a[href^="#"]');
    mobileNavLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        var href = this.getAttribute('href');
        setTimeout(function () {
          navLinks.forEach(function (navLink) {
            if (navLink.getAttribute('href') === href) navLink.classList.add('active');
            else navLink.classList.remove('active');
          });
        }, 300);
      });
    });

    // ─── Handle browser back button (popstate event) ──────────────────────────
    global.addEventListener('popstate', function () {
      var currentHash = global.location.hash;
      if (currentHash) {
        var targetElement = document.querySelector(currentHash);
        if (targetElement) {
          navLinks.forEach(function (l) { l.classList.remove('active'); });
          var matchingLink = document.querySelector('header nav a[href="' + currentHash + '"]');
          if (matchingLink) matchingLink.classList.add('active');
          global.scrollTo({ top: targetElement.offsetTop - 80, behavior: 'smooth' });
        }
      } else {
        navLinks.forEach(function (l) { l.classList.remove('active'); });
      }
      calculateSectionPositions();
      updateActiveNavLink();
    });
  }

  // ============================================
  // MOBILE MENU
  // ============================================
  var lastMobileMenuToggleAt = 0;

  function isMobileMenuOpen(menu) {
    return menu.classList.contains('translate-x-0');
  }

  function setMobileMenuOpen(shouldOpen) {
    var overlay = document.getElementById('mobile-menu-overlay');
    var menu = document.getElementById('mobile-menu');
    if (!overlay || !menu) return;
    if (shouldOpen) {
      overlay.classList.remove('hidden');
      menu.classList.remove('translate-x-full');
      menu.classList.add('translate-x-0');
      document.body.style.overflow = 'hidden';
    } else {
      overlay.classList.add('hidden');
      menu.classList.add('translate-x-full');
      menu.classList.remove('translate-x-0');
      document.body.style.overflow = '';
    }
  }

  function toggleMobileMenu(forceOpen) {
    var menu = document.getElementById('mobile-menu');
    if (!menu) return;
    lastMobileMenuToggleAt = Date.now();
    var shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !isMobileMenuOpen(menu);
    setMobileMenuOpen(shouldOpen);
  }

  function setupMobileMenuAutoClose() {
    document.addEventListener('click', function (event) {
      var menu = document.getElementById('mobile-menu');
      if (!menu || !isMobileMenuOpen(menu)) return;
      if (Date.now() - lastMobileMenuToggleAt < 200) return;
      var clickedToggle = event.target.closest('[data-mobile-menu-toggle="true"]');
      if (menu.contains(event.target) || clickedToggle) return;
      setMobileMenuOpen(false);
    });

    global.addEventListener('resize', function () {
      if (!getMqMobile()) setMobileMenuOpen(false);
    });
  }

  function ensureMobileMenuClosed() {
    var menu = document.getElementById('mobile-menu');
    var overlay = document.getElementById('mobile-menu-overlay');
    if (menu) {
      menu.classList.add('translate-x-full');
      menu.classList.remove('translate-x-0', 'open');
    }
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ============================================
  // DARK MODE
  // ============================================
  function initDarkMode() {
    var isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.documentElement.classList.add('dark');
  }

  // Expose to global
  global.Navigation = {
    setupBackToTopButton:     setupBackToTopButton,
    setupNavHighlight:        setupNavHighlight,
    setMobileMenuOpen:        setMobileMenuOpen,
    toggleMobileMenu:         toggleMobileMenu,
    setupMobileMenuAutoClose: setupMobileMenuAutoClose,
    ensureMobileMenuClosed:   ensureMobileMenuClosed,
    initDarkMode:             initDarkMode
  };

  // Also expose individual functions at window level for inline onclick usage
  global.setMobileMenuOpen        = setMobileMenuOpen;
  global.toggleMobileMenu         = toggleMobileMenu;
  global.ensureMobileMenuClosed   = ensureMobileMenuClosed;
  global.initDarkMode             = initDarkMode;

}(window));
