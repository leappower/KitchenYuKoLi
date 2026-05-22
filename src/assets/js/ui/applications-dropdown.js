/**
 * applications-dropdown.js — Responsive Applications Dropdown
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
    {
      key: "nav_applications_small_restaurant",
      icon: "storefront",
      href: "/applications/small-restaurant/",
      emoji: "",
    },
    { key: "nav_applications_central_kitchen", icon: "apartment", href: "/applications/central-kitchen/", emoji: "" },
    {
      key: "nav_applications_chain_restaurant",
      icon: "ramen_dining",
      href: "/applications/chain-restaurant/",
      emoji: "",
    },
    { key: "nav_applications_canteen", icon: "restaurant", href: "/applications/canteen/", emoji: "" },
    { key: "nav_applications_cloud_kitchen", icon: "delivery_dining", href: "/applications/cloud-kitchen/", emoji: "" },
    { key: "nav_applications_food_factory", icon: "factory", href: "/applications/food-factory/", emoji: "" },
    { key: "nav_applications_menu_lab", icon: "science", href: "/applications/menu-lab/", emoji: "" },
  ];

  var EXTRAS = [];

  /* ───────────────────────── CSS ───────────────────────── */

  function renderDropdown(cfg) {
    var parentHref = "/applications/";

    var items = SUBSERIES.map(function (s, idx) {
      var html = _buildItem(s, parentHref);
      if (idx < SUBSERIES.length - 1) html += '<div class="app-dropdown-separator"></div>';
      return html;
    }).join("\n");

    var extrasHtml = EXTRAS.map(function (s, idx) {
      var row = _buildDropdownItem(s);
      if (idx < EXTRAS.length - 1) row += '<div class="app-dropdown-separator"></div>';
      return row;
    }).join("\n");

    var overviewItem =
      '<a href="' +
      esc(parentHref) +
      '" class="app-dropdown-item app-overview-item">' +
      '<span class="app-dropdown-icon">' +
      '<span class="material-symbols-outlined">apps</span>' +
      "</span>" +
      '<span class="app-dropdown-label" data-i18n="nav_applications_overview">应用场景总览</span>' +
      '<span class="material-symbols-outlined app-dropdown-chevron">chevron_right</span>' +
      "</a>";

    return (
      '<div class="app-dropdown-wrap' +
      (isTouch() ? " touch-device" : "") +
      '">' +
      '<div class="app-dropdown-trigger">' +
      '<a class="' +
      esc(cfg.activeClass || "") +
      ' app-dropdown-link"' +
      ' href="' +
      esc(cfg.href || "#") +
      '"' +
      ' data-app-trigger-label="' +
      esc(cfg.labelKey || cfg.label) +
      '">' +
      '<span data-i18n="' +
      esc(cfg.labelKey || cfg.label) +
      '">' +
      esc(cfg.label || cfg.labelKey) +
      "</span>" +
      "</a>" +
      '<button class="app-dropdown-toggle" type="button" aria-label="Toggle submenu">' +
      '<span class="material-symbols-outlined app-dropdown-arrow">expand_more</span>' +
      "</button>" +
      "</div>" +
      '<div class="app-dropdown-panel"><div class="app-dropdown-card">' +
      overviewItem +
      '<div class="app-dropdown-separator" style="margin: 4px 0;"></div>' +
      items +
      extrasHtml +
      "</div></div>" +
      "</div>"
    );
  }

  function _buildItem(sub, parentHref) {
    var itemHref = sub.href || parentHref;
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

  function _buildDropdownItem(item) {
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
      '<span class="material-symbols-outlined app-dropdown-chevron">chevron_right</span>' +
      "</a>"
    );
  }

  /* ───────────────────────── POPUP CONTENT ───────────────────────── */

  function buildPopupContent(items, parentHref) {
    var overviewHtml =
      '<a href="' +
      esc(parentHref || "/applications/") +
      '" class="app-popup-item app-overview-item">' +
      '<span class="app-dropdown-icon">' +
      '<span class="material-symbols-outlined">apps</span>' +
      "</span>" +
      '<span class="app-popup-label" data-i18n="nav_applications_overview">应用场景总览</span>' +
      '<span class="material-symbols-outlined app-popup-chevron">chevron_right</span>' +
      "</a>";

    var list = items
      .map(function (s) {
        var itemHref = s.href || parentHref;
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
      })
      .join("\n");

    var extrasItems = EXTRAS.map(function (s) {
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
        '<span class="material-symbols-outlined app-popup-chevron">chevron_right</span>' +
        "</a>"
      );
    }).join("\n");

    return overviewHtml + '<div class="app-popup-separator"></div>' + list + extrasItems;
  }

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.ApplicationsDropdown = global.DropdownBase.create({
    prefix: "app",
    getItems: function () {
      return SUBSERIES;
    },
    renderDropdown: renderDropdown,
    buildPopupContent: buildPopupContent,
    defaultHref: "/applications/",
    extraKeys: function () {
      return { EXTRAS: EXTRAS };
    },
  });
})(window);
