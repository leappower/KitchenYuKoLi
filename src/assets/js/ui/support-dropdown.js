/**
 * support-dropdown.js — iOS Style Responsive Support Dropdown
 * Desktop / Tablet / Mobile adaptive
 */

(function (global) {
  "use strict";

  /* ───────────────────────── DATA ───────────────────────── */

  var SUBSERIES = (typeof NAV_CONFIG !== 'undefined' && NAV_CONFIG.dropdowns && NAV_CONFIG.dropdowns.support) || [
    { key: "nav_support_services", icon: "grid_view", href: "/support/", emoji: "" },
    { key: "nav_support_installation", icon: "construction", href: "/support/#installation", emoji: "" },
    { key: "nav_support_warranty", icon: "verified", href: "/support/#warranty", emoji: "" },
    { key: "nav_support_spare_parts", icon: "build_circle", href: "/support/#spare-parts", emoji: "" },
    { key: "nav_support_training", icon: "school", href: "/support/#training", emoji: "" },
    { key: "nav_support_faq", icon: "contact_support", href: "/support/#faq", emoji: "" },
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
    // Unique overrides: card size, emoji
    if (document.getElementById("sup-dropdown-styles-v1")) return;
    var style = document.createElement("style");
    style.id = "sup-dropdown-styles-v1";
    style.setAttribute("data-ver", "2026-03-22-v1");
    style.textContent = [
      /* Card size override */
      ".sup-dropdown-card { min-width: 320px; max-width: 420px; }",

      /* Emoji Badge */
      ".sup-dropdown-emoji {",
      "  margin-left: auto; font-size: 13px; line-height: 1; opacity: .85; flex-shrink: 0;",
      "}",

      /* Popup emoji */
      ".sup-popup-emoji {",
      "  margin-left: auto; font-size: 15px; opacity: .85; flex-shrink: 0;",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ───────────────────────── BUILDERS ───────────────────────── */

  function buildItem(sub, href) {
    var itemHref = sub.href || href;
    var chevron = '<span class="material-symbols-outlined sup-dropdown-chevron">chevron_right</span>';
    var emojiHtml = sub.emoji ? '<span class="sup-dropdown-emoji">' + sub.emoji + "</span>" : "";
    return (
      '<a href="' +
      esc(itemHref) +
      '" class="sup-dropdown-item">' +
      '<span class="sup-dropdown-icon">' +
      '<span class="material-symbols-outlined">' +
      esc(sub.icon) +
      "</span>" +
      "</span>" +
      '<span class="sup-dropdown-label" data-i18n="' +
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
    return '<div class="sup-dropdown-separator"></div>';
  }

  function renderDropdown(cfg) {
    var parentHref = "/support/";

    var items = SUBSERIES.map(function (s, idx) {
      var html = buildItem(s, parentHref);
      if (idx < SUBSERIES.length - 1) {
        html += buildSeparator();
      }
      return html;
    }).join("\n");

    var html =
      '<div class="sup-dropdown-wrap' +
      (isTouch() ? " touch-device" : "") +
      '">' +
      '<a href="#"' +
      ' class="' +
      esc(cfg.activeClass || "") +
      ' sup-dropdown-trigger"' +
      ' data-sup-trigger-label="' +
      esc(cfg.labelKey || cfg.label) +
      '">' +
      '<span data-i18n="' +
      esc(cfg.labelKey || cfg.label) +
      '">' +
      esc(cfg.label || cfg.labelKey) +
      "</span>" +
      '<span class="material-symbols-outlined sup-dropdown-arrow">expand_more</span>' +
      "</a>" +
      '<div class="sup-dropdown-panel">' +
      '<div class="sup-dropdown-card">' +
      items +
      "</div>" +
      "</div>" +
      "</div>";

    return html;
  }

  /* ───────────────────────── INTERACTION ───────────────────────── */

  function initDropdownClick() {
    document.addEventListener("click", function () {
      document.querySelectorAll(".sup-dropdown-wrap.is-open").forEach(function (d) {
        d.classList.remove("is-open");
      });
    });

    document.querySelectorAll(".sup-dropdown-trigger").forEach(function (t) {
      t.addEventListener("click", function (e) {
        if (window.innerWidth <= 720) return;
        e.stopPropagation();
        t.closest(".sup-dropdown-wrap").classList.toggle("is-open");
      });
    });
  }

  /* ───────────────────────── MOBILE POPUP ───────────────────────── */

  function openPopup(href) {
    closePopup();

    var overlay = document.createElement("div");
    overlay.className = "sup-popup-overlay";

    var panel = document.createElement("div");
    panel.className = "sup-popup-panel";

    var handle = '<div class="sup-popup-handle"></div>';

    var items = SUBSERIES.map(function (s) {
      var itemHref = s.href || "/support/";
      var chevron = '<span class="material-symbols-outlined sup-popup-chevron">chevron_right</span>';
      var emojiHtml = s.emoji ? '<span class="sup-popup-emoji">' + s.emoji + "</span>" : "";
      return (
        '<a href="' +
        esc(itemHref) +
        '" class="sup-popup-item">' +
        '<span class="sup-dropdown-icon">' +
        '<span class="material-symbols-outlined">' +
        esc(s.icon) +
        "</span>" +
        "</span>" +
        '<span class="sup-popup-label" data-i18n="' +
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

    // Bind close on popup item click
    var popupItems = panel.querySelectorAll(".sup-popup-item");
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
    document.querySelectorAll(".sup-popup-overlay,.sup-popup-panel").forEach(function (el) {
      el.parentNode && el.parentNode.removeChild(el);
    });
  }

  /**
   * Bind click handlers to all elements with data-sup-popup attribute.
   */
  function bindAllPopupTriggers() {
    var triggers = document.querySelectorAll("[data-sup-popup]");
    for (var i = 0; i < triggers.length; i++) {
      var el = triggers[i];
      if (el._supPopupBound) continue;
      el._supPopupBound = true;

      el.addEventListener("click", function (e) {
        e.stopPropagation();
        var href = el.getAttribute("data-sup-popup-href") || el.getAttribute("href") || "/support/";
        openPopup(href);
      });
    }
  }

  /* ───────────────────────── SPA CLEANUP ───────────────────────── */

  document.addEventListener("spa:load", function () {
    closePopup();
  });

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.SupportDropdown = {
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
