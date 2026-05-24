/**
 * products-dropdown.js — Responsive Products Dropdown
 * Desktop / Tablet: floating card style
 * Mobile: iOS bottom sheet popup
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

  /**
   * 从共享 NAV_CONFIG 读取 products 子分类（剔除 separator, overview 等辅助项）
   */
  function getSubseries() {
    return ((window.NAV_CONFIG && window.NAV_CONFIG.products) || []).filter(function (s) {
      return !s._separator;
    });
  }

  /* ───────────────────────── CSS ───────────────────────── */

  function renderDropdown(cfg) {
    var parentHref = "/products/";
    var viewAllHref = "/products/all/";

    var overviewItem =
      '<a href="' +
      esc(parentHref) +
      '" class="prod-dropdown-item prod-overview-item">' +
      '<span class="prod-dropdown-icon">' +
      '<span class="material-symbols-outlined">apps</span>' +
      "</span>" +
      '<span class="prod-dropdown-label" data-i18n="nav_products_overview">产品中心</span>' +
      '<span class="material-symbols-outlined prod-dropdown-chevron">chevron_right</span>' +
      "</a>";

    var viewAll =
      '<a href="' +
      esc(viewAllHref) +
      '" class="prod-dropdown-item prod-viewall-item">' +
      '<span class="prod-dropdown-icon">' +
      '<span class="material-symbols-outlined">grid_view</span>' +
      "</span>" +
      '<span class="prod-dropdown-label" data-i18n="nav_mega_view_all">View All Products</span>' +
      '<span class="material-symbols-outlined prod-dropdown-chevron">chevron_right</span>' +
      "</a>";

    var _subs = getSubseries();
    var items = _subs
      .map(function (s, idx) {
        var html = _buildItem(s, parentHref);
        if (idx < _subs.length - 1) html += '<div class="prod-dropdown-separator"></div>';
        return html;
      })
      .join("\n");

    return (
      '<div class="prod-dropdown-wrap' +
      (isTouch() ? " touch-device" : "") +
      '">' +
      '<div class="prod-dropdown-trigger">' +
      '<a class="' +
      esc(cfg.activeClass || "") +
      ' prod-dropdown-link"' +
      ' href="javascript:void(0)" data-no-swup onclick="event.stopPropagation();event.preventDefault();return false"' +
      ' data-prod-trigger-label="' +
      esc(cfg.labelKey || cfg.label) +
      '">' +
      '<span data-i18n="' +
      esc(cfg.labelKey || cfg.label) +
      '">' +
      esc(cfg.label || cfg.labelKey) +
      "</span>" +
      "</a>" +
      '<button class="prod-dropdown-toggle" type="button" aria-label="Toggle submenu">' +
      '<span class="material-symbols-outlined prod-dropdown-arrow">expand_more</span>' +
      "</button>" +
      "</div>" +
      '<div class="prod-dropdown-panel"><div class="prod-dropdown-card">' +
      overviewItem +
      '<div class="prod-dropdown-separator" style="margin: 4px 0;"></div>' +
      items +
      '<div class="prod-dropdown-separator" style="margin: 4px 0;"></div>' +
      viewAll +
      "</div></div>" +
      "</div>"
    );
  }

  function _buildItem(sub, parentHref) {
    var itemHref = sub.href || parentHref;
    var chevron = '<span class="material-symbols-outlined prod-dropdown-chevron">chevron_right</span>';
    var emojiHtml = sub.emoji ? '<span class="prod-dropdown-emoji">' + sub.emoji + "</span>" : "";
    return (
      '<a href="' +
      esc(itemHref) +
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

  /* ───────────────────────── POPUP CONTENT ───────────────────────── */

  function buildPopupContent(items, parentHref) {
    if (!items) items = getSubseries();
    var overviewHtml =
      '<a href="' +
      esc(parentHref || "/products/") +
      '" data-no-swup class="prod-popup-item prod-overview-item">' +
      '<span class="prod-dropdown-icon">' +
      '<span class="material-symbols-outlined">apps</span>' +
      "</span>" +
      '<span class="prod-popup-label" data-i18n="nav_products_overview">产品中心</span>' +
      '<span class="material-symbols-outlined prod-popup-chevron">chevron_right</span>' +
      "</a>";

    var viewAllHtml =
      '<a href="/products/all/" data-no-swup class="prod-popup-item prod-viewall-item">' +
      '<span class="prod-dropdown-icon">' +
      '<span class="material-symbols-outlined">grid_view</span>' +
      "</span>" +
      '<span class="prod-popup-label" data-i18n="nav_mega_view_all">View All Products</span>' +
      '<span class="material-symbols-outlined prod-popup-chevron">chevron_right</span>' +
      "</a>";

    var list = items
      .map(function (s) {
        var itemHref = s.href || parentHref;
        var chevron = '<span class="material-symbols-outlined prod-popup-chevron">chevron_right</span>';
        var emojiHtml = s.emoji ? '<span class="prod-popup-emoji">' + s.emoji + "</span>" : "";
        return (
          '<a href="' +
          esc(itemHref) +
          '" data-no-swup class="prod-popup-item">' +
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
      })
      .join("\n");

    return (
      overviewHtml +
      '<div class="prod-popup-separator"></div>' +
      list +
      '<div class="prod-popup-separator"></div>' +
      viewAllHtml
    );
  }

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.ProductsDropdown = global.DropdownBase.create({
    prefix: "prod",
    getItems: function () {
      return getSubseries();
    },
    renderDropdown: renderDropdown,
    buildPopupContent: buildPopupContent,
    defaultHref: "/products/",
  });
})(window);
