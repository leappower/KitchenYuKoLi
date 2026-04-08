/**
 * applications-dropdown.js — iOS Style Responsive Applications Dropdown
 * Desktop / Tablet / Mobile adaptive
 */

(function (global) {
  "use strict";

  /* ───────────────────────── DATA ───────────────────────── */

  /** Application scenarios (5 items) */
  var SUBSERIES = [
    { key: "nav_applications_fastfood", icon: "ramen_dining", href: "/applications/fast-food/", emoji: "" },
    { key: "nav_applications_hotpot", icon: "local_fire_department", href: "/applications/hotpot/", emoji: "" },
    { key: "nav_applications_cloud_kitchen", icon: "delivery_dining", href: "/applications/cloud-kitchen/", emoji: "" },
    { key: "nav_applications_canteen", icon: "restaurant", href: "/applications/canteen/", emoji: "" },
    { key: "nav_applications_thai", icon: "public", href: "/applications/southeast-asian/", emoji: "" },
  ];

  /** Bottom links (Case Studies + ROI) */
  var EXTRAS = [
    { key: "nav_cases", icon: "monitoring", href: "/applications/cases/", badge: false },
    { key: "nav_roi", icon: "calculate", href: "/roi/", badge: true },
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
    // Unique overrides: card size, ROI badge, emoji
    if (document.getElementById("app-dropdown-styles-v1")) return;
    var style = document.createElement("style");
    style.id = "app-dropdown-styles-v1";
    style.setAttribute("data-ver", "2026-03-22-v1");
    style.textContent = [
      /* Card size override */
      ".app-dropdown-card { min-width: 320px; max-width: 420px; }",

      /* Emoji Badge */
      ".app-dropdown-emoji {",
      "  margin-left: auto; font-size: 13px; line-height: 1; opacity: .85; flex-shrink: 0;",
      "}",

      /* ROI Badge */
      ".app-roi-badge {",
      "  display: inline-flex; align-items: center; padding: 2px 7px;",
      "  font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;",
      "  background: #ec5b13; color: #fff; border-radius: 20px;",
      "  flex-shrink: 0; line-height: 1.4;",
      "}",

      /* Popup emoji */
      ".app-popup-emoji {",
      "  margin-left: auto; font-size: 15px; opacity: .85; flex-shrink: 0;",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ───────────────────────── BUILDERS ───────────────────────── */

  function buildItem(sub, href) {
    var itemHref = sub.href || href;
    var chevron = '<span class="material-symbols-outlined app-dropdown-chevron">chevron_right</span>';
    var emojiHtml = sub.emoji ? '<span class="app-dropdown-emoji">' + sub.emoji + "</span>" : "";
    return (
      '<a href="' +
      esc(itemHref) +
      '" class="app-dropdown-item">' +
      '<span class="app-dropdown-icon">' +
      '<span class="material-symbols-outlined">' +
      esc(sub.icon) +
      "</span>" +
      "</span>" +
      '<span class="app-dropdown-label" data-i18n="' +
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
    return '<div class="app-dropdown-separator"></div>';
  }

  function buildDropdownItem(item) {
    var badgeHtml = item.badge
      ? '<span class="app-roi-badge" data-i18n="nav_roi_badge">HOT</span>'
      : '<span class="material-symbols-outlined app-dropdown-chevron">chevron_right</span>';
    return (
      '<a href="' +
      esc(item.href) +
      '" class="app-dropdown-item">' +
      '<span class="app-dropdown-icon">' +
      '<span class="material-symbols-outlined">' +
      esc(item.icon) +
      "</span>" +
      "</span>" +
      '<span class="app-dropdown-label" data-i18n="' +
      esc(item.key) +
      '">' +
      esc(item.key) +
      "</span>" +
      badgeHtml +
      "</a>"
    );
  }

  function renderDropdown(cfg) {
    var items = SUBSERIES.map(function (s, idx) {
      var html = buildItem(s, cfg.href);
      if (idx < SUBSERIES.length - 1) {
        html += buildSeparator();
      }
      return html;
    }).join("\n");

    var extrasHtml = EXTRAS.map(function (s, idx) {
      var row = buildDropdownItem(s);
      if (idx < EXTRAS.length - 1) row += '<div class="app-dropdown-separator"></div>';
      return row;
    }).join("\n");

    var html =
      '<div class="app-dropdown-wrap' +
      (isTouch() ? " touch-device" : "") +
      '">' +
      '<a href="' +
      esc(cfg.href) +
      '"' +
      ' class="' +
      esc(cfg.activeClass || "") +
      ' app-dropdown-trigger"' +
      ' data-app-trigger-label="' +
      esc(cfg.label || cfg.labelKey) +
      '">' +
      '<span data-i18n="' +
      esc(cfg.label || cfg.labelKey) +
      '">' +
      esc(cfg.label || cfg.labelKey) +
      "</span>" +
      '<span class="material-symbols-outlined app-dropdown-arrow">expand_more</span>' +
      "</a>" +
      '<div class="app-dropdown-panel">' +
      '<div class="app-dropdown-card">' +
      items +
      '<div class="app-dropdown-separator" style="margin: 4px 0;"></div>' +
      extrasHtml +
      "</div>" +
      "</div>" +
      "</div>";

    return html;
  }

  /* ───────────────────────── INTERACTION ───────────────────────── */

  function initDropdownClick() {
    document.addEventListener("click", function () {
      document.querySelectorAll(".app-dropdown-wrap.is-open").forEach(function (d) {
        d.classList.remove("is-open");
      });
    });

    document.querySelectorAll(".app-dropdown-trigger").forEach(function (t) {
      t.addEventListener("click", function (e) {
        if (window.innerWidth <= 720) return;
        e.preventDefault();
        e.stopPropagation();
        t.closest(".app-dropdown-wrap").classList.toggle("is-open");
      });
    });
  }

  /* ───────────────────────── MOBILE POPUP ───────────────────────── */

  function openPopup(href) {
    closePopup();

    var overlay = document.createElement("div");
    overlay.className = "app-popup-overlay";

    var panel = document.createElement("div");
    panel.className = "app-popup-panel";

    var handle = '<div class="app-popup-handle"></div>';

    var items = SUBSERIES.map(function (s) {
      var itemHref = s.href || href;
      var chevron = '<span class="material-symbols-outlined app-popup-chevron">chevron_right</span>';
      var emojiHtml = s.emoji ? '<span class="app-popup-emoji">' + s.emoji + "</span>" : "";
      return (
        '<a href="' +
        esc(itemHref) +
        '" class="app-popup-item">' +
        '<span class="app-dropdown-icon">' +
        '<span class="material-symbols-outlined">' +
        esc(s.icon) +
        "</span>" +
        "</span>" +
        '<span class="app-popup-label" data-i18n="' +
        esc(s.key) +
        '">' +
        esc(s.key) +
        "</span>" +
        emojiHtml +
        chevron +
        "</a>"
      );
    }).join("\n");

    var extrasItems = EXTRAS.map(function (s) {
      var badgeHtml = s.badge
        ? '<span class="app-roi-badge" data-i18n="nav_roi_badge">HOT</span>'
        : '<span class="material-symbols-outlined app-popup-chevron">chevron_right</span>';
      return (
        '<a href="' +
        esc(s.href) +
        '" class="app-popup-item">' +
        '<span class="app-dropdown-icon">' +
        '<span class="material-symbols-outlined">' +
        esc(s.icon) +
        "</span>" +
        "</span>" +
        '<span class="app-popup-label" data-i18n="' +
        esc(s.key) +
        '">' +
        esc(s.key) +
        "</span>" +
        badgeHtml +
        "</a>"
      );
    }).join("\n");

    panel.innerHTML = handle + items + extrasItems;

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
    var popupItems = panel.querySelectorAll(".app-popup-item");
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
    document.querySelectorAll(".app-popup-overlay,.app-popup-panel").forEach(function (el) {
      el.parentNode && el.parentNode.removeChild(el);
    });
  }

  /**
   * Bind click handlers to all elements with data-app-popup attribute.
   */
  function bindAllPopupTriggers() {
    var triggers = document.querySelectorAll("[data-app-popup]");
    for (var i = 0; i < triggers.length; i++) {
      var el = triggers[i];
      if (el._appPopupBound) continue;
      el._appPopupBound = true;

      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var href = el.getAttribute("data-app-popup-href") || el.getAttribute("href") || "/applications/";
        openPopup(href);
      });
    }
  }

  /* ───────────────────────── SPA CLEANUP ───────────────────────── */

  document.addEventListener("spa:load", function () {
    closePopup();
  });

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.ApplicationsDropdown = {
    SUBSERIES: SUBSERIES,
    EXTRAS: EXTRAS,
    renderPC: renderDropdown,
    renderTablet: renderDropdown,
    initDropdownClick: initDropdownClick,
    openPopup: openPopup,
    closePopup: closePopup,
    bindAllPopupTriggers: bindAllPopupTriggers,
    injectAllStyles: injectStyles,
  };
})(window);
