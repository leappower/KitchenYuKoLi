/**
 * applications-dropdown.js — Responsive Applications Dropdown
 * Desktop / Tablet / Mobile adaptive
 */

(function (global) {
  "use strict";

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

  function injectStyles() {
    if (window.DropdownBaseStyles) window.DropdownBaseStyles.inject();

    var style = document.createElement("style");
    style.id = "app-dropdown-styles-v1";
    style.setAttribute("data-ver", "2026-05-20-v2");
    style.textContent = [
      ".app-dropdown-card { min-width: 320px; max-width: 420px; }",
      ".app-dropdown-emoji {",
      "  margin-left: auto; font-size: 13px; line-height: 1; opacity: .85; flex-shrink: 0;",
      "}",
      ".app-popup-emoji {",
      "  margin-left: auto; font-size: 15px; opacity: .85; flex-shrink: 0;",
      "}",
      /* Overview item styling */
      ".app-overview-item {",
      "  display: flex; align-items: center; gap: 8px;",
      "  padding: 9px 12px; font-size: 13px; font-weight: 700; color: #1d1d1f;",
      "  text-decoration: none; border-radius: 10px; transition: background .1s ease;",
      "}",
      ".app-overview-item:hover { background: rgba(236,91,19,.06); color: #ec5b13; }",
      "html.dark .app-overview-item { color: #f5f5f7; }",
      "html.dark .app-overview-item:hover { background: rgba(236,91,19,.10); color: #f97316; }",
      /* View all styling */
      ".app-viewall-item {",
      "  display: flex; align-items: center; gap: 8px;",
      "  padding: 9px 12px; font-size: 13px; font-weight: 600; color: #1d1d1f;",
      "  text-decoration: none; border-radius: 10px; transition: background .1s ease;",
      "}",
      ".app-viewall-item:hover { background: rgba(236,91,19,.06); color: #ec5b13; }",
      "html.dark .app-viewall-item { color: #f5f5f7; }",
      "html.dark .app-viewall-item:hover { background: rgba(236,91,19,.10); color: #f97316; }",
      /* Split trigger toggle button */
      ".app-dropdown-trigger {",
      "  display: flex; align-items: center; gap: 4px;",
      "}",
      ".app-dropdown-link {",
      "  text-decoration: none; color: inherit;",
      "}",
      ".app-dropdown-toggle {",
      "  display: flex; align-items: center; justify-content: center;",
      "  width: 28px; height: 28px; padding: 0; border: none;",
      "  background: transparent; cursor: pointer; border-radius: 6px;",
      "  -webkit-tap-highlight-color: transparent;",
      "  transition: background .15s ease;",
      "}",
      ".app-dropdown-toggle:active { background: rgba(0,0,0,.06); }",
      "html.dark .app-dropdown-toggle:active { background: rgba(255,255,255,.08); }",
      ".app-dropdown-toggle .app-dropdown-arrow {",
      "  font-size: 20px; color: rgba(60,60,67,.4); transition: transform .2s ease;",
      "}",
      ".app-dropdown-wrap.is-open .app-dropdown-toggle .app-dropdown-arrow {",
      "  transform: rotate(180deg);",
      "}",
      "html.dark .app-dropdown-toggle .app-dropdown-arrow {",
      "  color: rgba(235,235,245,.35);",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ───────────────────────── RENDER ───────────────────────── */

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
    injectStyles: injectStyles,
    renderDropdown: renderDropdown,
    buildPopupContent: buildPopupContent,
    defaultHref: "/applications/",
    extraKeys: function () {
      return { EXTRAS: EXTRAS };
    },
  });
})(window);
