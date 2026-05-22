/**
 * support-dropdown.js — Responsive Support Dropdown
 * Desktop / Tablet / Mobile adaptive
 */

(function (global) {
  "use strict";

  // Guard: DropdownBase must be loaded first
  if (!global.DropdownBase || typeof global.DropdownBase.esc !== "function") {
    // DropdownBase not ready — this script ran out of order (likely SPA re-execution).
    // The first page load ensures correct order via synchronous script tags.
    // For SPA navigation, DropdownBase is already persisted by Swup head plugin.
    return;
  }

  var esc = global.DropdownBase.esc;
  var isTouch = global.DropdownBase.isTouch;

  /* ───────────────────────── DATA ───────────────────────── */

  var SUBSERIES = [
    { key: "nav_support_services", icon: "grid_view", href: "/support/services/", emoji: "" },
    { key: "nav_support_installation", icon: "construction", href: "/support/installation/", emoji: "" },
    { key: "nav_support_warranty", icon: "verified", href: "/support/warranty/", emoji: "" },
    { key: "nav_support_spare_parts", icon: "build_circle", href: "/support/spare-parts/", emoji: "" },
    { key: "nav_support_training", icon: "school", href: "/support/training/", emoji: "" },
    { key: "nav_support_faq", icon: "contact_support", href: "/support/faq/", emoji: "" },
  ];

  /* ───────────────────────── CSS ───────────────────────── */

  /* ───────────────────────── RENDER ───────────────────────── */

  function renderDropdown(cfg) {
    var parentHref = "/support/";

    var items = SUBSERIES.map(function (s, idx) {
      var html = _buildItem(s, parentHref);
      if (idx < SUBSERIES.length - 1) html += '<div class="sup-dropdown-separator"></div>';
      return html;
    }).join("\n");

    var overviewItem =
      '<a href="' +
      esc(parentHref) +
      '" class="sup-dropdown-item sup-overview-item">' +
      '<span class="sup-dropdown-icon">' +
      '<span class="material-symbols-outlined">apps</span>' +
      "</span>" +
      '<span class="sup-dropdown-label" data-i18n="nav_support_overview">服务与支持总览</span>' +
      '<span class="material-symbols-outlined sup-dropdown-chevron">chevron_right</span>' +
      "</a>";

    var viewAllItem =
      '<div class="sup-dropdown-separator" style="margin: 4px 0;"></div>' +
      '<a href="' +
      esc(parentHref) +
      '" class="sup-dropdown-item sup-viewall-item">' +
      '<span class="sup-dropdown-icon">' +
      '<span class="material-symbols-outlined">grid_view</span>' +
      "</span>" +
      '<span class="sup-dropdown-label" data-i18n="nav_support_view_all">查看全部服务</span>' +
      '<span class="material-symbols-outlined sup-dropdown-chevron">chevron_right</span>' +
      "</a>";

    return (
      '<div class="sup-dropdown-wrap' +
      (isTouch() ? " touch-device" : "") +
      '">' +
      '<div class="sup-dropdown-trigger">' +
      '<a class="' +
      esc(cfg.activeClass || "") +
      ' sup-dropdown-link"' +
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
      "</a>" +
      '<button class="sup-dropdown-toggle" type="button" aria-label="Toggle submenu">' +
      '<span class="material-symbols-outlined sup-dropdown-arrow">expand_more</span>' +
      "</button>" +
      "</div>" +
      '<div class="sup-dropdown-panel"><div class="sup-dropdown-card">' +
      overviewItem +
      '<div class="sup-dropdown-separator" style="margin: 4px 0;"></div>' +
      items +
      viewAllItem +
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
    var overviewHtml =
      '<a href="' +
      esc(parentHref || "/support/") +
      '" class="sup-popup-item sup-overview-item">' +
      '<span class="sup-dropdown-icon">' +
      '<span class="material-symbols-outlined">apps</span>' +
      "</span>" +
      '<span class="sup-popup-label" data-i18n="nav_support_overview">服务与支持总览</span>' +
      '<span class="material-symbols-outlined sup-popup-chevron">chevron_right</span>' +
      "</a>";

    var list = items
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

    var viewAllHtml =
      '<a href="' +
      esc(parentHref || "/support/") +
      '" class="sup-popup-item sup-viewall-item">' +
      '<span class="sup-dropdown-icon">' +
      '<span class="material-symbols-outlined">grid_view</span>' +
      "</span>" +
      '<span class="sup-popup-label" data-i18n="nav_support_view_all">查看全部服务</span>' +
      '<span class="material-symbols-outlined sup-popup-chevron">chevron_right</span>' +
      "</a>";

    return (
      overviewHtml +
      '<div class="sup-popup-separator"></div>' +
      list +
      '<div class="sup-popup-separator"></div>' +
      viewAllHtml
    );
  }

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.SupportDropdown = global.DropdownBase.create({
    prefix: "sup",
    getItems: function () {
      return SUBSERIES;
    },
    renderDropdown: renderDropdown,
    buildPopupContent: buildPopupContent,
    defaultHref: "/support/",
  });
})(window);
