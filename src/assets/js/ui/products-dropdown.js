/**
 * products-dropdown.js — Responsive Products Dropdown
 * Desktop / Tablet: floating card style
 * Mobile: iOS bottom sheet popup
 */

(function (global) {
  "use strict";

  /* ───────────────────────── DATA ───────────────────────── */

  var SUBSERIES = [
    { key: "nav_products_cutting", icon: "content_cut", emoji: "" },
    { key: "nav_products_stirfry", icon: "local_fire_department", emoji: "🔥" },
    { key: "nav_products_frying", icon: "outdoor_grill", emoji: "" },
    { key: "nav_products_stewing", icon: "soup_kitchen", emoji: "" },
    { key: "nav_products_steaming", icon: "cloud", emoji: "" },
    { key: "nav_products_other", icon: "more_horiz", emoji: "" },
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
    // Unique overrides: viewall-item, emoji sizes
    if (document.getElementById("prod-dropdown-styles-v4")) return;

    // Remove all old version style elements
    [
      "prod-ios-dropdown-styles",
      "prod-dropdown-styles-2026",
      "prod-dropdown-pc-styles",
      "prod-dropdown-tablet-styles",
      "prod-dropdown-styles-v2",
      "prod-dropdown-styles-v3",
    ].forEach(function (id) {
      var old = document.getElementById(id);
      if (old) old.remove();
    });

    var style = document.createElement("style");
    style.id = "prod-dropdown-styles-v4";
    style.setAttribute("data-ver", "2026-03-22-v4");
    style.textContent = [
      /* Card size override */
      ".prod-dropdown-card { min-width: 320px; max-width: 420px; }",

      /* Emoji Badge */
      ".prod-dropdown-emoji {",
      "  margin-left: auto; font-size: 13px; line-height: 1; opacity: .85; flex-shrink: 0;",
      "}",

      /* View All link */
      ".prod-viewall-item {",
      "  display: flex; align-items: center; gap: 8px;",
      "  padding: 9px 12px; font-size: 13px; font-weight: 600; color: #ec5b13;",
      "  text-decoration: none; border-radius: 10px; transition: background .1s ease;",
      "}",
      ".prod-viewall-item:hover { background: rgba(236,91,19,.06); }",
      ".prod-viewall-item .material-symbols-outlined { font-size: 16px; }",
      "html.dark .prod-viewall-item { color: #f97316; }",
      "html.dark .prod-viewall-item:hover { background: rgba(236,91,19,.10); }",

      /* Popup emoji */
      ".prod-popup-emoji {",
      "  margin-left: auto; font-size: 15px; opacity: .85; flex-shrink: 0;",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ───────────────────────── BUILDERS ───────────────────────── */

  function buildItem(sub, href) {
    var chevron = '<span class="material-symbols-outlined prod-dropdown-chevron">chevron_right</span>';
    var emojiHtml = sub.emoji ? '<span class="prod-dropdown-emoji">' + sub.emoji + "</span>" : "";
    return (
      '<a href="' +
      esc(href) +
      '" class="prod-dropdown-item">' +
      '<span class="prod-dropdown-icon">' +
      '<span class="material-symbols-outlined">' +
      esc(sub.icon) +
      "</span>" +
      "</span>" +
      '<span class="prod-dropdown-label" data-i18n="' +
      esc(sub.key) +
      '">' +
      esc(sub.key) +
      "</span>" +
      emojiHtml +
      chevron +
      "</a>"
    );
  }

  function buildSeparator() {
    return '<div class="prod-dropdown-separator"></div>';
  }

  /* ── Unified dropdown: floating card for both PC and Tablet ── */
  function renderDropdown(cfg) {
    var items = SUBSERIES.map(function (s, idx) {
      var html = buildItem(s, cfg.href);
      if (idx < SUBSERIES.length - 1) {
        html += buildSeparator();
      }
      return html;
    }).join("\n");

    // "View All Products" link at bottom
    var viewAll =
      '<a href="' +
      esc(cfg.href) +
      '" class="prod-viewall-item">' +
      '<span class="prod-dropdown-icon">' +
      '<span class="material-symbols-outlined">grid_view</span>' +
      "</span>" +
      '<span class="prod-dropdown-label" data-i18n="nav_mega_view_all">View All Products</span>' +
      '<span class="material-symbols-outlined prod-dropdown-chevron">chevron_right</span>' +
      "</a>";

    var html =
      '<div class="prod-dropdown-wrap' +
      (isTouch() ? " touch-device" : "") +
      '">' +
      '<a href="' +
      esc(cfg.href) +
      '"' +
      ' class="' +
      esc(cfg.activeClass || "") +
      ' prod-dropdown-trigger"' +
      ' data-prod-trigger-label="' +
      esc(cfg.labelKey) +
      '">' +
      '<span data-i18n="' +
      esc(cfg.labelKey) +
      '">' +
      esc(cfg.labelKey) +
      "</span>" +
      '<span class="material-symbols-outlined prod-dropdown-arrow">expand_more</span>' +
      "</a>" +
      '<div class="prod-dropdown-panel">' +
      '<div class="prod-dropdown-card">' +
      items +
      '<div class="prod-dropdown-separator" style="margin: 4px 0;"></div>' +
      viewAll +
      "</div>" +
      "</div>" +
      "</div>";

    return html;
  }

  /* ───────────────────────── INTERACTION ───────────────────────── */

  function initDropdownClick() {
    document.addEventListener("click", function () {
      document.querySelectorAll(".prod-dropdown-wrap.is-open").forEach(function (d) {
        d.classList.remove("is-open");
      });
    });

    document.querySelectorAll(".prod-dropdown-trigger").forEach(function (t) {
      t.addEventListener("click", function (e) {
        if (window.innerWidth <= 720) return;
        e.preventDefault();
        e.stopPropagation();
        t.closest(".prod-dropdown-wrap").classList.toggle("is-open");
      });
    });
  }

  /* ───────────────────────── MOBILE POPUP ───────────────────────── */

  function openPopup(href) {
    closePopup();

    var overlay = document.createElement("div");
    overlay.className = "prod-popup-overlay";

    var panel = document.createElement("div");
    panel.className = "prod-popup-panel";

    var handle = '<div class="prod-popup-handle"></div>';

    var items = SUBSERIES.map(function (s) {
      var chevron = '<span class="material-symbols-outlined prod-popup-chevron">chevron_right</span>';
      var emojiHtml = s.emoji ? '<span class="prod-popup-emoji">' + s.emoji + "</span>" : "";
      return (
        '<a href="' +
        esc(href) +
        '" class="prod-popup-item">' +
        '<span class="prod-dropdown-icon">' +
        '<span class="material-symbols-outlined">' +
        esc(s.icon) +
        "</span>" +
        "</span>" +
        '<span class="prod-popup-label" data-i18n="' +
        esc(s.key) +
        '">' +
        esc(s.key) +
        "</span>" +
        emojiHtml +
        chevron +
        "</a>"
      );
    }).join("\n");

    panel.innerHTML = handle + items;

    overlay.onclick = closePopup;
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Translate popup items immediately after DOM insertion
    if (global.translationManager) {
      panel.querySelectorAll("[data-i18n]").forEach(function (el) {
        var key = el.getAttribute("data-i18n");
        var translated = global.translationManager.translate(key);
        if (translated && translated !== key) {
          el.textContent = translated;
        }
      });
    }

    var popupItems = panel.querySelectorAll(".prod-popup-item");
    for (var k = 0; k < popupItems.length; k++) {
      popupItems[k].addEventListener("click", function (e) {
        var target = e.currentTarget;
        var itemHref = target.getAttribute("href");
        closePopup();
        if (itemHref && global.SpaRouter) {
          e.preventDefault();
          global.SpaRouter.navigate(itemHref);
        }
      });
    }

    requestAnimationFrame(function () {
      panel.classList.add("is-open");
      navigator.vibrate && navigator.vibrate(12);
    });
  }

  function closePopup() {
    document.querySelectorAll(".prod-popup-overlay,.prod-popup-panel").forEach(function (el) {
      el.parentNode && el.parentNode.removeChild(el);
    });
  }

  /**
   * Bind click handlers to all elements with data-prod-popup attribute.
   * Used by footer.js bottom nav (mobile/tablet) to open product category popup.
   */
  function bindAllPopupTriggers() {
    var triggers = document.querySelectorAll("[data-prod-popup]");
    for (var i = 0; i < triggers.length; i++) {
      var el = triggers[i];
      if (el._prodPopupBound) continue;
      el._prodPopupBound = true;

      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var href = el.getAttribute("data-prod-popup-href") || el.getAttribute("href") || "/products/";
        openPopup(href);
      });
    }
  }

  /* ───────────────────────── SPA CLEANUP ───────────────────────── */

  document.addEventListener("spa:load", function () {
    closePopup();
  });

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.ProductsDropdown = {
    SUBSERIES: SUBSERIES,
    renderPC: renderDropdown,
    renderTablet: renderDropdown,
    initDropdownClick: initDropdownClick,
    openPopup: openPopup,
    closePopup: closePopup,
    bindAllPopupTriggers: bindAllPopupTriggers,
    injectAllStyles: injectStyles,
  };
})(window);
