/**
 * mobile-menu.js — Yukoli Mobile Hamburger Menu + Accordion + Smart Header
 *
 * Features:
 * 1. Full-screen overlay + slide-in panel from left
 * 2. L1 menu items with Accordion expand for L2 sub-items
 * 3. WhatsApp contact item with green accent
 * 4. Smart header: hide on scroll down, show on scroll up
 *
 * L1 data mirrors NAV_ITEMS from navigator.js:
 *   Products / Solutions / Service&Support / About / Contact
 *
 * L2 data pulled from respective dropdown components when available.
 */

(function (global) {
  "use strict";

  /* ───────────────────────── L1 MENU DATA ───────────────────────── */

  var MENU_ITEMS = (typeof NAV_CONFIG !== 'undefined' && NAV_CONFIG.mainNav) ? NAV_CONFIG.mainNav.map(function(item) {
    var children = [];
    var dropdownMap = {
      products: 'products',
      applications: 'applications',
      solutions: 'solutions',
      support: 'support',
      about: 'about',
      contact: 'contact'
    };
    var dropdownKey = dropdownMap[item.id];
    if (dropdownKey && NAV_CONFIG.dropdowns && NAV_CONFIG.dropdowns[dropdownKey]) {
      children = NAV_CONFIG.dropdowns[dropdownKey];
    }
    return {
      key: item.key,
      href: item.path,
      id: item.id,
      icon: item.id === 'products' ? 'kitchen' : item.id === 'applications' ? 'apps' : item.id === 'solutions' ? 'build' : item.id === 'support' ? 'support_agent' : item.id === 'about' ? 'info' : 'mail',
      children: children.map(function(c) { return { key: c.key, icon: c.icon, href: c.href || c.path || '/', badge: c.badge }; })
    };
  }) : [
    { key: "nav_products", href: "/products/", id: "products", icon: "kitchen", children: [] },
    { key: "nav_applications", href: "/applications/", id: "applications", icon: "apps", children: [] },
    { key: "nav_solutions", href: "/solutions/", id: "solutions", icon: "build", children: [] },
    { key: "nav_service", href: "/support/", id: "support", icon: "support_agent", children: [] },
    { key: "nav_about", href: "/about/", id: "about", icon: "info", children: [] },
    { key: "nav_contact", href: "/contact/", id: "contact", icon: "mail", children: [] }
  ];

  /* ───────────────────────── HELPERS ───────────────────────── */

  function esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ───────────────────────── CSS ───────────────────────── */

  function injectStyles() {
    if (document.getElementById("mobile-menu-styles")) return;
    var style = document.createElement("style");
    style.id = "mobile-menu-styles";
    style.textContent = [
      /* ── Overlay ── */
      ".mobile-menu-overlay {",
      "  position: fixed; inset: 0;",
      "  background: rgba(0,0,0,.4);",
      "  z-index: 900;",
      "  opacity: 0; visibility: hidden;",
      "  transition: opacity .3s ease, visibility 0s .3s;",
      "}",
      ".mobile-menu-overlay.is-open {",
      "  opacity: 1; visibility: visible;",
      "  transition: opacity .3s ease, visibility 0s 0s;",
      "}",

      /* ── Panel ── */
      ".mobile-menu-panel {",
      "  position: fixed; top: 0; left: 0; bottom: 0;",
      "  width: 85%; max-width: 360px; min-width: 280px;",
      "  background: rgba(246,246,248,.98);",
      "  backdrop-filter: blur(40px) saturate(200%);",
      "  -webkit-backdrop-filter: blur(40px) saturate(200%);",
      "  z-index: 910;",
      "  transform: translateX(-100%);",
      "  transition: transform .35s cubic-bezier(.32,.72,0,1);",
      "  overflow-y: auto; -webkit-overflow-scrolling: touch;",
      "  box-shadow: 4px 0 24px rgba(0,0,0,.08);",
      "}",
      ".mobile-menu-panel.is-open { transform: translateX(0); }",
      "html.dark .mobile-menu-panel {",
      "  background: rgba(44,44,46,.98);",
      "  box-shadow: 4px 0 24px rgba(0,0,0,.3);",
      "}",

      /* ── Panel Header ── */
      ".mobile-menu-header {",
      "  display: flex; align-items: center; justify-content: space-between;",
      "  padding: 16px 20px;",
      "  border-bottom: .5px solid rgba(60,60,67,.12);",
      "}",
      "html.dark .mobile-menu-header { border-color: rgba(235,235,245,.15); }",
      ".mobile-menu-logo img { width: 32px; height: 32px; object-fit: contain; }",
      ".mobile-menu-close {",
      "  display: flex; align-items: center; justify-content: center;",
      "  width: 36px; height: 36px; border-radius: 50%; border: none;",
      "  background: rgba(60,60,67,.08); cursor: pointer;",
      "  -webkit-tap-highlight-color: transparent;",
      "}",
      "html.dark .mobile-menu-close { background: rgba(235,235,245,.12); }",
      ".mobile-menu-close .material-symbols-outlined {",
      "  font-size: 20px; color: rgba(60,60,67,.8);",
      "}",
      "html.dark .mobile-menu-close .material-symbols-outlined { color: rgba(235,235,245,.8); }",

      /* ── L1 Item ── */
      ".mobile-menu-l1 {",
      "  display: flex; align-items: center; gap: 12px;",
      "  padding: 14px 20px;",
      "  font-size: 17px; font-weight: 600;",
      "  color: #1d1d1f; text-decoration: none;",
      "  -webkit-tap-highlight-color: transparent;",
      "  border-bottom: .5px solid rgba(60,60,67,.08);",
      "}",
      "html.dark .mobile-menu-l1 { color: #f5f5f7; }",
      "html.dark .mobile-menu-l1 { border-color: rgba(235,235,245,.08); }",
      ".mobile-menu-l1:active { background: rgba(236,91,19,.06); }",
      "html.dark .mobile-menu-l1:active { background: rgba(236,91,19,.10); }",
      ".mobile-menu-l1-icon {",
      "  width: 28px; height: 28px; border-radius: 7px;",
      "  background: rgba(236,91,19,.10);",
      "  display: flex; align-items: center; justify-content: center; flex-shrink: 0;",
      "}",
      "html.dark .mobile-menu-l1-icon { background: rgba(236,91,19,.18); }",
      ".mobile-menu-l1-icon .material-symbols-outlined { font-size: 18px; color: #ec5b13; }",
      ".mobile-menu-l1-label { flex: 1; min-width: 0; }",
      ".mobile-menu-l1-arrow {",
      "  font-size: 20px; color: rgba(60,60,67,.3); flex-shrink: 0;",
      "  transition: transform .3s cubic-bezier(.32,.72,0,1);",
      "}",
      "html.dark .mobile-menu-l1-arrow { color: rgba(235,235,245,.25); }",
      ".mobile-menu-l1.is-expanded .mobile-menu-l1-arrow {",
      "  transform: rotate(90deg);",
      "}",

      /* ── L2 Accordion ── */
      ".mobile-menu-l2 {",
      "  max-height: 0; overflow: hidden;",
      "  transition: max-height .35s cubic-bezier(.32,.72,0,1);",
      "  background: rgba(0,0,0,.02);",
      "}",
      "html.dark .mobile-menu-l2 { background: rgba(0,0,0,.15); }",
      ".mobile-menu-l2.is-open { max-height: 600px; }",

      /* ── L2 Item ── */
      ".mobile-menu-l2-item {",
      "  display: flex; align-items: center; gap: 12px;",
      "  padding: 12px 20px 12px 60px;",
      "  font-size: 15px; font-weight: 400;",
      "  color: #1d1d1f; text-decoration: none;",
      "  -webkit-tap-highlight-color: transparent;",
      "}",
      "html.dark .mobile-menu-l2-item { color: #f5f5f7; }",
      ".mobile-menu-l2-item:active { background: rgba(236,91,19,.06); }",
      "html.dark .mobile-menu-l2-item:active { background: rgba(236,91,19,.10); }",
      ".mobile-menu-l2-icon {",
      "  width: 24px; height: 24px; border-radius: 6px;",
      "  background: rgba(236,91,19,.08);",
      "  display: flex; align-items: center; justify-content: center; flex-shrink: 0;",
      "}",
      "html.dark .mobile-menu-l2-icon { background: rgba(236,91,19,.14); }",
      ".mobile-menu-l2-icon .material-symbols-outlined { font-size: 14px; color: #ec5b13; }",
      ".mobile-menu-l2-label { flex: 1; min-width: 0; }",

      /* ── ROI Badge ── */
      ".mobile-menu-badge {",
      "  display: inline-flex; align-items: center; padding: 2px 7px;",
      "  font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;",
      "  background: #ec5b13; color: #fff; border-radius: 20px; flex-shrink: 0; line-height: 1.4;",
      "}",

      /* ── WhatsApp L2 ── */
      ".mobile-menu-l2-item.is-whatsapp .mobile-menu-l2-icon { background: rgba(37,211,102,.12); }",
      "html.dark .mobile-menu-l2-item.is-whatsapp .mobile-menu-l2-icon { background: rgba(37,211,102,.20); }",
      ".mobile-menu-l2-item.is-whatsapp .mobile-menu-l2-icon .material-symbols-outlined { color: #25d366; }",

      /* ── Bottom CTA Bar (Contact + ROI) ── */
      ".mobile-menu-cta-bar {",
      "  position: fixed; bottom: 0; left: 0; right: 0;",
      "  padding: 12px 16px calc(12px + env(safe-area-inset-bottom)) 16px;",
      "  background: rgba(246,246,248,.98);",
      "  backdrop-filter: blur(40px) saturate(200%);",
      "  -webkit-backdrop-filter: blur(40px) saturate(200%);",
      "  border-top: .5px solid rgba(60,60,67,.12);",
      "  display: flex; gap: 12px;",
      "  z-index: 920;",
      "}",
      "html.dark .mobile-menu-cta-bar {",
      "  background: rgba(44,44,46,.98);",
      "  border-color: rgba(235,235,245,.15);",
      "}",
      ".mobile-menu-cta-btn {",
      "  flex: 1;",
      "  display: flex; align-items: center; justify-content: center; gap: 8px;",
      "  padding: 14px; border-radius: 12px; border: none;",
      "  font-size: 15px; font-weight: 600; cursor: pointer;",
      "  -webkit-tap-highlight-color: transparent;",
      "  text-decoration: none;",
      "  transition: all .15s ease;",
      "}",
      ".mobile-menu-cta-btn.primary {",
      "  background: #ec5b13; color: #fff;",
      "}",
      ".mobile-menu-cta-btn.primary:hover, .mobile-menu-cta-btn.primary:active {",
      "  background: #d54f0f;",
      "}",
      ".mobile-menu-cta-btn.secondary {",
      "  background: rgba(236,91,19,.10); color: #ec5b13;",
      "}",
      "html.dark .mobile-menu-cta-btn.secondary {",
      "  background: rgba(236,91,19,.18); color: #ff8c5a;",
      "}",
      ".mobile-menu-cta-btn.secondary:hover, .mobile-menu-cta-btn.secondary:active {",
      "  background: rgba(236,91,19,.20); color: #d54f0f;",
      "}",
      "html.dark .mobile-menu-cta-btn.secondary:hover, html.dark .mobile-menu-cta-btn.secondary:active {",
      "  background: rgba(236,91,19,.25); color: #ff9f70;",
      "}",
      ".mobile-menu-cta-btn .material-symbols-outlined { font-size: 20px; }",
      "/* Add padding to panel content to account for fixed CTA bar */",
      ".mobile-menu-panel { padding-bottom: 100px !important; }",

      /* ── Smart Header ── */
      "#mobile-header.header-hidden { transform: translateY(-100%); }",

      /* ── Mobile Search Overlay ── */
      ".mobile-search-overlay {",
      "  position: fixed; inset: 0;",
      "  background: rgba(246,246,248,.98);",
      "  backdrop-filter: blur(40px) saturate(200%);",
      "  -webkit-backdrop-filter: blur(40px) saturate(200%);",
      "  z-index: 950;",
      "  opacity: 0; visibility: hidden;",
      "  transition: opacity .2s ease, visibility 0s .2s;",
      "  overflow-y: auto; -webkit-overflow-scrolling: touch;",
      "}",
      ".mobile-search-overlay.is-open {",
      "  opacity: 1; visibility: visible;",
      "  transition: opacity .2s ease, visibility 0s 0s;",
      "}",
      "html.dark .mobile-search-overlay {",
      "  background: rgba(28,28,30,.98);",
      "}",

      ".mobile-search-bar {",
      "  display: flex; align-items: center; gap: 10px;",
      "  padding: 12px 16px; position: sticky; top: 0;",
      "  background: rgba(246,246,248,.95);",
      "  backdrop-filter: blur(20px);",
      "  -webkit-backdrop-filter: blur(20px);",
      "  border-bottom: .5px solid rgba(60,60,67,.10);",
      "}",
      "html.dark .mobile-search-bar {",
      "  background: rgba(28,28,30,.95);",
      "  border-color: rgba(235,235,245,.10);",
      "}",

      ".mobile-search-icon {",
      "  font-size: 22px; color: rgba(60,60,67,.5); flex-shrink: 0;",
      "}",
      "html.dark .mobile-search-icon { color: rgba(235,235,245,.5); }",

      ".mobile-search-input {",
      "  flex: 1; background: transparent; border: none; outline: none;",
      "  font-size: 17px; color: #1d1d1f; font-family: inherit; line-height: 1.4;",
      "  -webkit-appearance: none; min-width: 0;",
      "}",
      ".mobile-search-input::placeholder { color: rgba(60,60,67,.4); }",
      "html.dark .mobile-search-input { color: #f5f5f7; }",
      "html.dark .mobile-search-input::placeholder { color: rgba(235,235,245,.35); }",
      ".mobile-search-input::-webkit-search-cancel-button { display: none; }",

      ".mobile-search-clear {",
      "  display: none; align-items: center; justify-content: center;",
      "  width: 28px; height: 28px; border-radius: 50%; border: none;",
      "  background: rgba(120,120,128,.2); cursor: pointer; flex-shrink: 0;",
      "}",
      ".mobile-search-clear.is-visible { display: flex; }",
      ".mobile-search-clear .material-symbols-outlined { font-size: 18px; color: rgba(60,60,67,.6); }",
      "html.dark .mobile-search-clear { background: rgba(255,255,255,.15); }",
      "html.dark .mobile-search-clear .material-symbols-outlined { color: rgba(235,235,245,.6); }",

      ".mobile-search-results { padding: 8px; }",

      ".mobile-search-result-item {",
      "  display: flex; align-items: center; gap: 12px;",
      "  padding: 12px 8px; border-radius: 12px;",
      "  text-decoration: none; color: inherit;",
      "  -webkit-tap-highlight-color: transparent;",
      "}",
      ".mobile-search-result-item:active { background: rgba(236,91,19,.06); }",
      "html.dark .mobile-search-result-item:active { background: rgba(236,91,19,.10); }",

      ".mobile-search-result-img {",
      "  width: 48px; height: 48px; border-radius: 10px;",
      "  background: rgba(120,120,128,.08); flex-shrink: 0;",
      "  display: flex; align-items: center; justify-content: center; overflow: hidden;",
      "}",
      ".mobile-search-result-img img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }",
      ".mobile-search-result-img .material-symbols-outlined { font-size: 24px; color: rgba(60,60,67,.25); }",
      "html.dark .mobile-search-result-img { background: rgba(255,255,255,.06); }",
      "html.dark .mobile-search-result-img .material-symbols-outlined { color: rgba(235,235,245,.2); }",

      ".mobile-search-result-info { flex: 1; min-width: 0; }",
      ".mobile-search-result-name {",
      "  font-size: 15px; font-weight: 600; color: #1d1d1f; line-height: 1.3;",
      "}",
      "html.dark .mobile-search-result-name { color: #f5f5f7; }",
      ".mobile-search-result-meta {",
      "  display: flex; align-items: center; gap: 4px; margin-top: 2px;",
      "}",
      ".mobile-search-result-meta span { font-size: 12px; color: rgba(60,60,67,.5); }",
      "html.dark .mobile-search-result-meta span { color: rgba(235,235,245,.4); }",
      ".mobile-search-result-sep { color: rgba(60,60,67,.25) !important; }",
      "html.dark .mobile-search-result-sep { color: rgba(235,235,245,.15) !important; }",

      ".mobile-search-empty {",
      "  text-align: center; padding: 40px 16px;",
      "}",
      ".mobile-search-empty .material-symbols-outlined {",
      "  font-size: 36px; color: rgba(60,60,67,.15); margin-bottom: 8px;",
      "}",
      ".mobile-search-empty p {",
      "  font-size: 14px; color: rgba(60,60,67,.5); margin: 0;",
      "}",
      "html.dark .mobile-search-empty .material-symbols-outlined { color: rgba(235,235,245,.1); }",
      "html.dark .mobile-search-empty p { color: rgba(235,235,245,.4); }",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ───────────────────────── BUILD DOM ───────────────────────── */

  function buildMenuPanel() {
    // Panel header
    var headerHtml =
      '<div class="mobile-menu-header">' +
      '<a class="mobile-menu-logo" href="' +
      (window.BASE_PATH || "") +
      '/home/">' +
      '<img src="' +
      (window.BASE_PATH || "") +
      '/assets/images/logo_footer.webp" alt="Yukoli" width="32" height="32" />' +
      "</a>" +
      '<button id="mobile-menu-close" type="button" class="mobile-menu-close" aria-label="Close menu">' +
      '<span class="material-symbols-outlined">close</span>' +
      "</button>" +
      "</div>";

    // L1 + L2 accordion
    var menuHtml = MENU_ITEMS.map(function (item) {
      var childrenHtml = "";
      if (item.children && item.children.length > 0) {
        var itemsHtml = item.children
          .map(function (child) {
            var waCls = child.isWhatsApp ? " is-whatsapp" : "";
            var badgeHtml = child.badge ? '<span class="mobile-menu-badge" data-i18n="nav_roi_badge">HOT</span>' : "";
            var targetAttr = child.isWhatsApp ? ' target="_blank" rel="noopener noreferrer"' : "";
            return (
              '<a href="' +
              esc(child.href) +
              '" class="mobile-menu-l2-item' +
              waCls +
              '"' +
              targetAttr +
              ">" +
              '<span class="mobile-menu-l2-icon">' +
              '<span class="material-symbols-outlined">' +
              esc(child.icon) +
              "</span>" +
              "</span>" +
              '<span class="mobile-menu-l2-label" data-i18n="' +
              esc(child.key) +
              '">' +
              esc(child.key) +
              "</span>" +
              badgeHtml +
              "</a>"
            );
          })
          .join("\n");

        childrenHtml = '<div class="mobile-menu-l2" data-menu-l2="' + esc(item.id) + '">' + itemsHtml + "</div>";
      }

      return (
        '<div class="mobile-menu-l1-wrap">' +
        '<button class="mobile-menu-l1" data-menu-toggle="' +
        esc(item.id) +
        '" type="button">' +
        '<span class="mobile-menu-l1-icon">' +
        '<span class="material-symbols-outlined">' +
        esc(item.icon) +
        "</span>" +
        "</span>" +
        '<span class="mobile-menu-l1-label" data-i18n="' +
        esc(item.key) +
        '">' +
        esc(item.key) +
        "</span>" +
        '<span class="material-symbols-outlined mobile-menu-l1-arrow">chevron_right</span>' +
        "</button>" +
        childrenHtml +
        "</div>"
      );
    }).join("\n");

    // Bottom CTA bar (Contact + ROI) - Fixed at bottom for conversion
    var ctaBarHtml =
      '<div class="mobile-menu-cta-bar">' +
      '<a class="mobile-menu-cta-btn secondary" href="/contact/" data-nav="/contact/">' +
      '<span class="material-symbols-outlined">mail</span>' +
      '<span data-i18n="btn_contact_us">Contact Us</span>' +
      "</a>" +
      '<a class="mobile-menu-cta-btn primary" href="/roi/" data-nav="/roi/">' +
      '<span class="material-symbols-outlined">calculate</span>' +
      '<span data-i18n="btn_roi_calc">ROI Calculator</span>' +
      "</a>" +
      "</div>";

    return headerHtml + menuHtml + ctaBarHtml;
  }

  /* ───────────────────────── OPEN / CLOSE ───────────────────────── */

  var overlay = null;
  var panel = null;

  function openMenu() {
    if (panel) return; // already open

    injectStyles();

    // Create overlay
    overlay = document.createElement("div");
    overlay.className = "mobile-menu-overlay";
    overlay.id = "mobile-menu-overlay";

    // Create panel
    panel = document.createElement("div");
    panel.className = "mobile-menu-panel";
    panel.id = "mobile-menu-panel";
    panel.innerHTML = buildMenuPanel();

    // Translate immediately
    if (global.translationManager) {
      panel.querySelectorAll("[data-i18n]").forEach(function (el) {
        var key = el.getAttribute("data-i18n");
        var val = global.translationManager.translate(key);
        if (val && val !== key) el.textContent = val;
      });
    }

    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    // prevent body scroll
    document.body.style.overflow = "hidden";

    // Animate open
    requestAnimationFrame(function () {
      overlay.classList.add("is-open");
      panel.classList.add("is-open");
      if (navigator.vibrate) navigator.vibrate(10);
    });

    bindPanelEvents();
  }

  function closeMenu() {
    if (!panel) return;

    overlay.classList.remove("is-open");
    panel.classList.remove("is-open");

    setTimeout(function () {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      overlay = null;
      panel = null;
      document.body.style.overflow = "";
    }, 350);
  }

  /* ───────────────────────── PANEL EVENTS ───────────────────────── */

  function bindPanelEvents() {
    // Close button
    var closeBtn = document.getElementById("mobile-menu-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        closeMenu();
      });
    }

    // Overlay click to close
    overlay.addEventListener("click", closeMenu);

    // Logo click to close + navigate
    var logoLink = panel.querySelector(".mobile-menu-logo");
    if (logoLink) {
      logoLink.addEventListener("click", function () {
        closeMenu();
      });
    }

    // L1 accordion toggle
    var toggles = panel.querySelectorAll("[data-menu-toggle]");
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener("click", function (_e) {
        var id = this.getAttribute("data-menu-toggle");
        var l2 = panel.querySelector('[data-menu-l2="' + id + '"]');
        if (!l2) return;

        var isExpanded = this.classList.contains("is-expanded");

        // Close all other accordions
        var allToggles = panel.querySelectorAll("[data-menu-toggle].is-expanded");
        for (var j = 0; j < allToggles.length; j++) {
          if (allToggles[j] !== this) {
            allToggles[j].classList.remove("is-expanded");
            var otherId = allToggles[j].getAttribute("data-menu-toggle");
            var otherL2 = panel.querySelector('[data-menu-l2="' + otherId + '"]');
            if (otherL2) otherL2.classList.remove("is-open");
          }
        }

        // Toggle current
        if (isExpanded) {
          this.classList.remove("is-expanded");
          l2.classList.remove("is-open");
        } else {
          this.classList.add("is-expanded");
          l2.classList.add("is-open");
        }

        if (navigator.vibrate) navigator.vibrate(8);
      });
    }

    // L2 item click — close menu + navigate
    var l2Items = panel.querySelectorAll(".mobile-menu-l2-item");
    for (var k = 0; k < l2Items.length; k++) {
      l2Items[k].addEventListener("click", function (e) {
        var href = this.getAttribute("href");
        // WhatsApp: let default behavior (opens in new tab)
        if (this.classList.contains("is-whatsapp")) {
          closeMenu();
          return;
        }
        closeMenu();
        if (href && global.SpaRouter) {
          e.preventDefault();
          global.SpaRouter.navigate(href);
        }
      });
    }

    // L1 click without children (shouldn't happen with current data, but just in case)
    var l1Items = panel.querySelectorAll(".mobile-menu-l1");
    for (var m = 0; m < l1Items.length; m++) {
      l1Items[m].addEventListener("click", function (_e) {
        var id = this.getAttribute("data-menu-toggle");
        var l2 = panel.querySelector('[data-menu-l2="' + id + '"]');
        // If has L2, accordion handles it; otherwise navigate
        if (!l2 || l2.children.length === 0) {
          closeMenu();
        }
      });
    }

    // CTA bar buttons click handling
    var ctaBtns = panel.querySelectorAll(".mobile-menu-cta-btn[data-nav]");
    for (var n = 0; n < ctaBtns.length; n++) {
      ctaBtns[n].addEventListener("click", function (e) {
        var href = this.getAttribute("href") || this.getAttribute("data-nav");
        closeMenu();
        if (href && global.SpaRouter) {
          e.preventDefault();
          global.SpaRouter.navigate(href);
        }
      });
    }
  }

  /* ───────────────────────── SMART HEADER (scroll hide/show) ───────────────────────── */

  var lastScrollY = 0;
  var headerEl = null;
  var scrollThreshold = 50;
  var ticking = false;

  function initSmartHeader() {
    headerEl = document.getElementById("mobile-header");
    if (!headerEl) return;

    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var currentY = window.pageYOffset || document.documentElement.scrollTop;

      if (currentY > scrollThreshold && currentY > lastScrollY) {
        // Scrolling down & past threshold → hide
        headerEl.classList.add("header-hidden");
      } else {
        // Scrolling up → show
        headerEl.classList.remove("header-hidden");
      }

      lastScrollY = currentY;
      ticking = false;
    });
  }

  /* ───────────────────────── HAMBURGER BUTTON BINDING ───────────────────────── */

  var _toggleBound = false;
  var _searchToggleBound = false;
  var onMenuClick = null;
  var onSearchClick = null;

  function initToggle() {
    var toggleBtn = document.getElementById("mobile-menu-toggle");
    if (toggleBtn && !_toggleBound) {
      _toggleBound = true;
      onMenuClick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        openMenu();
      };
      toggleBtn.addEventListener("click", onMenuClick);
    } else if (!toggleBtn) {
      // Button not in DOM yet — allow future retry
      _toggleBound = false;
    }

    // Mobile search toggle — open inline search overlay
    var searchBtn = document.getElementById("mobile-search-toggle");
    if (searchBtn && !_searchToggleBound) {
      _searchToggleBound = true;
      onSearchClick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        // Create mobile search overlay if not exists
        var existingOverlay = document.getElementById("mobile-search-overlay");
        if (existingOverlay) {
          closeMobileSearch();
          return;
        }
        openMobileSearch();
      };
      searchBtn.addEventListener("click", onSearchClick);
    } else if (!searchBtn) {
      // Button not in DOM yet — allow future retry
      _searchToggleBound = false;
    }
  }

  var mobileSearchOverlay = null;
  var mobileSearchInput = null;

  function openMobileSearch() {
    // Create overlay
    mobileSearchOverlay = document.createElement("div");
    mobileSearchOverlay.id = "mobile-search-overlay";
    mobileSearchOverlay.className = "mobile-search-overlay";
    mobileSearchOverlay.innerHTML =
      '<div class="mobile-search-bar">' +
      '<span class="material-symbols-outlined mobile-search-icon">search</span>' +
      '<input type="search" id="mobile-search-input" class="mobile-search-input" placeholder="Search..." data-i18n-placeholder="search_placeholder" autocomplete="off" spellcheck="false" />' +
      '<button id="mobile-search-clear" type="button" class="mobile-search-clear" aria-label="Clear">' +
      '<span class="material-symbols-outlined">cancel</span>' +
      "</button>" +
      "</div>" +
      '<div id="mobile-search-results" class="mobile-search-results"></div>';

    document.body.appendChild(mobileSearchOverlay);
    document.body.style.overflow = "hidden";

    // Translate placeholder
    if (global.translationManager) {
      var inputEl = mobileSearchOverlay.querySelector("[data-i18n-placeholder]");
      if (inputEl) {
        var key = inputEl.getAttribute("data-i18n-placeholder");
        var val = global.translationManager.translate(key);
        if (val && val !== key) inputEl.placeholder = val;
      }
    }

    // Animate in
    requestAnimationFrame(function () {
      mobileSearchOverlay.classList.add("is-open");
      mobileSearchInput = document.getElementById("mobile-search-input");
      if (mobileSearchInput) {
        mobileSearchInput.focus();
        // Bind search events
        mobileSearchInput.addEventListener("input", onMobileSearchInput);
        mobileSearchInput.addEventListener("keydown", onMobileSearchKeydown);
      }
      var clearBtn = document.getElementById("mobile-search-clear");
      if (clearBtn) {
        clearBtn.addEventListener("click", function () {
          if (mobileSearchInput) {
            mobileSearchInput.value = "";
            onMobileSearchInput();
            mobileSearchInput.focus();
          }
        });
      }
      // Close on overlay click (outside search bar)
      mobileSearchOverlay.addEventListener("click", function (e) {
        if (e.target === mobileSearchOverlay) {
          closeMobileSearch();
        }
      });
    });
  }

  function closeMobileSearch() {
    if (!mobileSearchOverlay) return;
    mobileSearchOverlay.classList.remove("is-open");
    setTimeout(function () {
      if (mobileSearchOverlay && mobileSearchOverlay.parentNode) {
        mobileSearchOverlay.parentNode.removeChild(mobileSearchOverlay);
      }
      mobileSearchOverlay = null;
      mobileSearchInput = null;
      document.body.style.overflow = "";
    }, 300);
  }

  var mobileSearchDebounceTimer = null;

  function onMobileSearchInput() {
    if (!mobileSearchInput) return;
    clearTimeout(mobileSearchDebounceTimer);
    var query = mobileSearchInput.value.trim();

    // Show/hide clear button
    var clearBtn = document.getElementById("mobile-search-clear");
    if (clearBtn) {
      if (query.length > 0) clearBtn.classList.add("is-visible");
      else clearBtn.classList.remove("is-visible");
    }

    if (query.length < 1) {
      var resultsEl = document.getElementById("mobile-search-results");
      if (resultsEl) resultsEl.innerHTML = "";
      return;
    }

    mobileSearchDebounceTimer = setTimeout(function () {
      var results = [];
      if (global.ProductSearchEngine && typeof global.ProductSearchEngine.search === "function") {
        results = global.ProductSearchEngine.search(query);
      }
      renderMobileSearchResults(results, query);
    }, 200);
  }

  function renderMobileSearchResults(results) {
    var resultsEl = document.getElementById("mobile-search-results");
    if (!resultsEl) return;

    if (!results || results.length === 0) {
      var trFn = (global.CommonUtils && global.CommonUtils.tr) || global.t;
      var noResults = trFn ? trFn("search_no_results", "No matching products found") : "No matching products found";
      resultsEl.innerHTML =
        '<div class="mobile-search-empty">' +
        '<span class="material-symbols-outlined">search_off</span>' +
        "<p>" +
        esc(noResults) +
        "</p>" +
        "</div>";
      return;
    }

    var html = "";
    for (var i = 0; i < results.length; i++) {
      var p = results[i];
      var name = (p._displayName || p._displayCategory + " " + p.model).replace(/</g, "&lt;").replace(/>/g, "&gt;");
      var model = (p.model || "").replace(/</g, "&lt;");
      var category = (p._displayCategory || p.category || "").replace(/</g, "&lt;");
      var imgSrc = p.productImage || p.imageUrl || "";
      html +=
        '<a class="mobile-search-result-item" href="/products/">' +
        '<div class="mobile-search-result-img">' +
        (imgSrc
          ? '<img src="' + imgSrc + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
          : '<span class="material-symbols-outlined">inventory_2</span>') +
        "</div>" +
        '<div class="mobile-search-result-info">' +
        '<div class="mobile-search-result-name">' +
        name +
        "</div>" +
        '<div class="mobile-search-result-meta">' +
        "<span>" +
        model +
        "</span>" +
        '<span class="mobile-search-result-sep">·</span>' +
        "<span>" +
        category +
        "</span>" +
        "</div>" +
        "</div>" +
        "</a>";
    }

    resultsEl.innerHTML = html;

    // Bind click to navigate
    var items = resultsEl.querySelectorAll(".mobile-search-result-item");
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener("click", function () {
        closeMobileSearch();
      });
    }
  }

  function onMobileSearchKeydown(e) {
    if (e.key === "Escape") {
      closeMobileSearch();
    }
  }

  /* ───────────────────────── SPA CLEANUP ───────────────────────── */

  document.addEventListener("spa:load", closeMenu);

  /* ───────────────────────── BOOT ───────────────────────── */

  function boot() {
    injectStyles();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        initToggle();
        initSmartHeader();
      });
    } else {
      initToggle();
      initSmartHeader();
    }

    // Re-init after bfcache restoration
    window.addEventListener("pageshow", function (event) {
      if (event.persisted) {
        closeMenu();
        initToggle();
        initSmartHeader();
      }
    });
  }

  boot();

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.MobileMenu = {
    open: openMenu,
    close: closeMenu,
    initToggle: initToggle,
    openMobileSearch: openMobileSearch,
    closeMobileSearch: closeMobileSearch,
  };
})(window);
