/**
 * support-dropdown.js — Responsive Support Dropdown
 * Desktop / Tablet / Mobile adaptive
 */

(function (global) {
  "use strict";

  var esc = global.DropdownBase.esc;
  var isTouch = global.DropdownBase.isTouch;

  /* ───────────────────────── DATA ───────────────────────── */

  var SUBSERIES = [
    { key: "nav_support_services", icon: "grid_view", href: "/support/", emoji: "" },
    { key: "nav_support_installation", icon: "construction", href: "/support/installation/", emoji: "" },
    { key: "nav_support_warranty", icon: "verified", href: "/support/warranty/", emoji: "" },
    { key: "nav_support_spare_parts", icon: "build_circle", href: "/support/spare-parts/", emoji: "" },
    { key: "nav_support_training", icon: "school", href: "/support/training/", emoji: "" },
    { key: "nav_support_faq", icon: "contact_support", href: "/support/faq/", emoji: "" },
  ];

  /* ───────────────────────── CSS ───────────────────────── */

  function injectStyles() {
    if (window.DropdownBaseStyles) window.DropdownBaseStyles.inject();

    var style = document.createElement("style");
    style.id = "sup-dropdown-styles-v1";
    style.setAttribute("data-ver", "2026-03-22-v1");
    style.textContent = [
      ".sup-dropdown-card { min-width: 320px; max-width: 420px; }",
      ".sup-dropdown-emoji {",
      "  margin-left: auto; font-size: 13px; line-height: 1; opacity: .85; flex-shrink: 0;",
      "}",
      ".sup-popup-emoji {",
      "  margin-left: auto; font-size: 15px; opacity: .85; flex-shrink: 0;",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ───────────────────────── RENDER ───────────────────────── */

  function renderDropdown(cfg) {
    var parentHref = "/support/";

    var items = SUBSERIES.map(function (s, idx) {
      var html = _buildItem(s, parentHref);
      if (idx < SUBSERIES.length - 1) html += '<div class="sup-dropdown-separator"></div>';
      return html;
    }).join("\n");

    return (
      '<div class="sup-dropdown-wrap' +
      (isTouch() ? " touch-device" : "") +
      '">' +
      '<a class="' +
      esc(cfg.activeClass || "") +
      ' sup-dropdown-trigger"' +
      ' href="' +
      esc(cfg.href || "#") +
      '"' +
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
      '<div class="sup-dropdown-panel"><div class="sup-dropdown-card">' +
      items +
      "</div></div>" +
      "</div>"
    );
  }

  function _buildItem(sub, parentHref) {
    var itemHref = sub.href || parentHref;
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

  /* ───────────────────────── POPUP CONTENT ───────────────────────── */

  function buildPopupContent(items, parentHref) {
    return items
      .map(function (s) {
        var itemHref = s.href || parentHref;
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
      })
      .join("\n");
  }

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.SupportDropdown = global.DropdownBase.create({
    prefix: "sup",
    getItems: function () {
      return SUBSERIES;
    },
    injectStyles: injectStyles,
    renderDropdown: renderDropdown,
    buildPopupContent: buildPopupContent,
    defaultHref: "/support/",
  });
})(window);
