/**
 * solutions-dropdown.js — Solutions Dropdown
 *
 * Structure:
 *   ── Solutions (解决方案) ──
 *   │  Automation Solutions (6 items)
 *   │  Case Studies · ROI Calculator
 */

(function (global) {
  "use strict";

  /* ───────────────────────── DATA ───────────────────────── */

  /** Automation Solutions (自动化方案) */
  var AUTOMATION = (typeof NAV_CONFIG !== 'undefined' && NAV_CONFIG.dropdowns && NAV_CONFIG.dropdowns.solutions) || [
    { key: "nav_solutions_fastfood", icon: "ramen_dining", href: "/solutions/fast-food/" },
    { key: "nav_solutions_hotpot", icon: "local_fire_department", href: "/solutions/hotpot/" },
    { key: "nav_solutions_cloud_kitchen", icon: "delivery_dining", href: "/solutions/cloud-kitchen/" },
    { key: "nav_solutions_canteen", icon: "restaurant", href: "/solutions/canteen/" },
    { key: "nav_solutions_thai", icon: "public", href: "/solutions/southeast-asian/" },
    { key: "nav_roi", icon: "calculate", href: "/roi/", badge: true },
  ];

  /** Solutions items (Case Studies) */
  var SOLUTIONS = [
    { key: "nav_solutions_automation", icon: "grid_view", href: "/solutions/" },
  ];

  /* ───────────────────────── HELPERS ───────────────────────── */

  function esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function isTouch() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  /* ───────────────────────── CSS ───────────────────────── */

  function injectStyles() {
    // Shared base styles
    if (window.DropdownBaseStyles) window.DropdownBaseStyles.inject();
    // Unique overrides: card size, ROI badge, separator margin, popup separator
    if (document.getElementById("sol-dropdown-styles-v7")) return;
    var style = document.createElement("style");
    style.id = "sol-dropdown-styles-v7";
    style.textContent = [
      /* Card size override */
      ".sol-dropdown-card { min-width: 220px; max-width: 320px; }",

      /* Item padding override */
      ".sol-dropdown-item { padding: 10px 12px; }",

      /* Separator margin override */
      ".sol-dropdown-separator { margin: 4px 12px 4px 50px; }",

      /* ROI Badge */
      ".sol-roi-badge {",
      "  display: inline-flex; align-items: center; padding: 2px 7px;",
      "  font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;",
      "  background: #ec5b13; color: #fff; border-radius: 20px;",
      "  flex-shrink: 0; line-height: 1.4;",
      "}",

      /* Popup separator */
      ".sol-popup-separator {",
      "  height: .5px; background: rgba(60,60,67,.12); margin: 4px 16px 4px 60px;",
      "}",
      "html.dark .sol-popup-separator { background: rgba(235,235,245,.15); }",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ───────────────────────── BUILDERS ───────────────────────── */

  function buildDropdownItem(item) {
    var badgeHtml = item.badge
      ? '<span class="sol-roi-badge" data-i18n="nav_roi_badge">HOT</span>'
      : '<span class="material-symbols-outlined sol-dropdown-chevron">chevron_right</span>';
    return (
      '<a href="' +
      esc(item.href) +
      '" class="sol-dropdown-item">' +
      '<span class="sol-dropdown-icon">' +
      '<span class="material-symbols-outlined">' +
      esc(item.icon) +
      "</span>" +
      "</span>" +
      '<span class="sol-dropdown-label" data-i18n="' +
      esc(item.key) +
      '">' +
      esc(item.key) +
      "</span>" +
      badgeHtml +
      "</a>"
    );
  }

  function buildDropdownList(items) {
    return items
      .map(function (item, idx) {
        var row = buildDropdownItem(item);
        if (idx < items.length - 1) {
          row += '<div class="sol-dropdown-separator"></div>';
        }
        return row;
      })
      .join("\n");
  }

  function buildAutomationItem(item) {
    var suffix = item.badge
      ? '<span class="sol-roi-badge" data-i18n="nav_roi_badge">HOT</span>'
      : '<span class="material-symbols-outlined sol-dropdown-chevron">chevron_right</span>';
    return (
      '<a href="' +
      esc(item.href) +
      '" class="sol-dropdown-item">' +
      '<span class="sol-dropdown-icon">' +
      '<span class="material-symbols-outlined">' +
      esc(item.icon) +
      "</span>" +
      "</span>" +
      '<span class="sol-dropdown-label" data-i18n="' +
      esc(item.key) +
      '">' +
      esc(item.key) +
      "</span>" +
      suffix +
      "</a>"
    );
  }

  function buildAutomationList(items) {
    return items
      .map(function (item, idx) {
        var row = buildAutomationItem(item);
        if (idx < items.length - 1) {
          row += '<div class="sol-dropdown-separator"></div>';
        }
        return row;
      })
      .join("\n");
  }

  function buildPopupItem(item) {
    var badgeHtml = item.badge
      ? '<span class="sol-roi-badge" data-i18n="nav_roi_badge">HOT</span>'
      : '<span class="material-symbols-outlined sol-popup-chevron">chevron_right</span>';
    return (
      '<a href="' +
      esc(item.href) +
      '" class="sol-popup-item">' +
      '<span class="sol-dropdown-icon">' +
      '<span class="material-symbols-outlined">' +
      esc(item.icon) +
      "</span>" +
      "</span>" +
      '<span class="sol-popup-label" data-i18n="' +
      esc(item.key) +
      '">' +
      esc(item.key) +
      "</span>" +
      badgeHtml +
      "</a>"
    );
  }

  function buildPopupList(items) {
    return items
      .map(function (item, idx) {
        var row = buildPopupItem(item);
        if (idx < items.length - 1) row += '<div class="sol-popup-separator"></div>';
        return row;
      })
      .join("\n");
  }

  function buildPopupAutomationItem(item) {
    var suffix = item.badge
      ? '<span class="sol-roi-badge" data-i18n="nav_roi_badge">HOT</span>'
      : '<span class="material-symbols-outlined sol-popup-chevron">chevron_right</span>';
    return (
      '<a href="' +
      esc(item.href) +
      '" class="sol-popup-item">' +
      '<span class="sol-dropdown-icon">' +
      '<span class="material-symbols-outlined">' +
      esc(item.icon) +
      "</span>" +
      "</span>" +
      '<span class="sol-popup-label" data-i18n="' +
      esc(item.key) +
      '">' +
      esc(item.key) +
      "</span>" +
      suffix +
      "</a>"
    );
  }

  function buildPopupAutomationList(items) {
    return items
      .map(function (item, idx) {
        var row = buildPopupAutomationItem(item);
        if (idx < items.length - 1) row += '<div class="sol-popup-separator"></div>';
        return row;
      })
      .join("\n");
  }

  /* ── Unified dropdown: floating card for both PC and Tablet ── */
  function renderDropdown(cfg) {
    var html =
      '<div class="sol-dropdown-wrap' +
      (isTouch() ? " touch-device" : "") +
      '">' +
      '<a href="#"' +
      ' class="' +
      esc(cfg.activeClass || "") +
      ' sol-dropdown-trigger"' +
      ' data-sol-trigger-label="' +
      esc(cfg.labelKey || cfg.label) +
      '">' +
      '<span data-i18n="' +
      esc(cfg.labelKey || cfg.label) +
      '">' +
      esc(cfg.label || cfg.labelKey) +
      "</span>" +
      '<span class="material-symbols-outlined sol-dropdown-arrow">expand_more</span>' +
      "</a>" +
      '<div class="sol-dropdown-panel">' +
      '<div class="sol-dropdown-card">' +
      buildDropdownList(SOLUTIONS) +
      '<div class="sol-dropdown-separator" style="margin: 8px 12px;"></div>' +
      buildAutomationList(AUTOMATION) +
      "</div>" +
      "</div>" +
      "</div>";

    return html;
  }

  /* ───────────────────────── INTERACTION ───────────────────────── */

  function initDropdownClick() {
    document.addEventListener("click", function () {
      document.querySelectorAll(".sol-dropdown-wrap.is-open").forEach(function (d) {
        d.classList.remove("is-open");
      });
    });

    document.querySelectorAll(".sol-dropdown-trigger").forEach(function (t) {
      t.addEventListener("click", function (e) {
        if (window.innerWidth <= 720) return;
        e.stopPropagation();
        t.closest(".sol-dropdown-wrap").classList.toggle("is-open");
      });
    });
  }

  /* ───────────────────────── MOBILE POPUP ───────────────────────── */

  function openPopup(_href) {
    closePopup();

    var overlay = document.createElement("div");
    overlay.className = "sol-popup-overlay";

    var panel = document.createElement("div");
    panel.className = "sol-popup-panel";

    var handle = '<div class="sol-popup-handle"></div>';

    var content =
      handle +
      buildPopupList(SOLUTIONS) +
      '<div class="sol-popup-separator" style="margin: 8px 16px;"></div>' +
      buildPopupAutomationList(AUTOMATION);

    panel.innerHTML = content;

    // translate immediately
    if (global.translationManager) {
      panel.querySelectorAll("[data-i18n]").forEach(function (el) {
        var key = el.getAttribute("data-i18n");
        var val = global.translationManager.translate(key);
        if (val && val !== key) el.textContent = val;
      });
    }

    overlay.onclick = closePopup;
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    panel.querySelectorAll(".sol-popup-item").forEach(function (item) {
      item.addEventListener("click", function (e) {
        var itemHref = item.getAttribute("href");
        closePopup();
        if (itemHref && global.SpaRouter) {
          e.preventDefault();
          global.SpaRouter.navigate(itemHref);
        }
      });
    });

    requestAnimationFrame(function () {
      panel.classList.add("is-open");
      navigator.vibrate && navigator.vibrate(12);
    });
  }

  function closePopup() {
    document.querySelectorAll(".sol-popup-overlay,.sol-popup-panel").forEach(function (el) {
      el.parentNode && el.parentNode.removeChild(el);
    });
  }

  function bindAllPopupTriggers() {
    document.querySelectorAll("[data-sol-popup]").forEach(function (el) {
      if (el._solPopupBound) return;
      el._solPopupBound = true;
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        openPopup(el.getAttribute("data-sol-popup-href") || el.getAttribute("href") || "/solutions/");
      });
    });
  }

  document.addEventListener("spa:load", closePopup);

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.SolutionsDropdown = {
    AUTOMATION: AUTOMATION,
    SOLUTIONS: SOLUTIONS,
    renderPC: renderDropdown,
    renderTablet: renderDropdown,
    initDropdownClick: initDropdownClick,
    openPopup: openPopup,
    closePopup: closePopup,
    bindAllPopupTriggers: bindAllPopupTriggers,
    injectAllStyles: injectStyles,
  };
})(window);
