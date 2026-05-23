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

  /**
   * 从共享 NAV_CONFIG 读取 applications 子分类（剔除 separator, overview 等辅助项）
   */
  function getSubseries() {
    return (window.NAV_CONFIG && window.NAV_CONFIG.applications || []).filter(function(s) { return !s._separator; });
  }

  var EXTRAS = [];

  /* ───────────────────────── CSS ───────────────────────── */

  function renderDropdown(cfg) {
    var parentHref = "/applications/";

    var _subs = getSubseries();
    var items = _subs.map(function (s, idx) {
      var html = _buildItem(s, parentHref);
      if (idx < _subs.length - 1) html += '<div class="app-dropdown-separator"></div>';
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
      ' href="javascript:void(0)" data-no-swup' +
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
    if (!items) items = getSubseries();
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
      return getSubseries();
    },
    renderDropdown: renderDropdown,
    buildPopupContent: buildPopupContent,
    defaultHref: "/applications/",
    extraKeys: function () {
      return { EXTRAS: EXTRAS };
    },
  });
})(window);
