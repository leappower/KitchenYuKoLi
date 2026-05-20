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
    { key: "nav_support_services", icon: "grid_view", href: "/support/services/", emoji: "" },
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
    style.setAttribute("data-ver", "2026-05-20-v2");
    style.textContent = [
      ".sup-dropdown-card { min-width: 320px; max-width: 420px; }",
      ".sup-dropdown-emoji {",
      "  margin-left: auto; font-size: 13px; line-height: 1; opacity: .85; flex-shrink: 0;",
      "}",
      ".sup-popup-emoji {",
      "  margin-left: auto; font-size: 15px; opacity: .85; flex-shrink: 0;",
      "}",
      /* Overview item styling */
      ".sup-overview-item {",
      "  display: flex; align-items: center; gap: 8px;",
      "  padding: 9px 12px; font-size: 13px; font-weight: 700; color: #1d1d1f;",
      "  text-decoration: none; border-radius: 10px; transition: background .1s ease;",
      "}",
      ".sup-overview-item:hover { background: rgba(236,91,19,.06); color: #ec5b13; }",
      "html.dark .sup-overview-item { color: #f5f5f7; }",
      "html.dark .sup-overview-item:hover { background: rgba(236,91,19,.10); color: #f97316; }",
      /* View all styling */
      ".sup-viewall-item {",
      "  display: flex; align-items: center; gap: 8px;",
      "  padding: 9px 12px; font-size: 13px; font-weight: 600; color: #1d1d1f;",
      "  text-decoration: none; border-radius: 10px; transition: background .1s ease;",
      "}",
      ".sup-viewall-item:hover { background: rgba(236,91,19,.06); color: #ec5b13; }",
      "html.dark .sup-viewall-item { color: #f5f5f7; }",
      "html.dark .sup-viewall-item:hover { background: rgba(236,91,19,.10); color: #f97316; }",
      /* Split trigger toggle button */
      ".sup-dropdown-trigger {",
      "  display: flex; align-items: center; gap: 4px;",
      "}",
      ".sup-dropdown-link {",
      "  text-decoration: none; color: inherit;",
      "}",
      ".sup-dropdown-toggle {",
      "  display: flex; align-items: center; justify-content: center;",
      "  width: 28px; height: 28px; padding: 0; border: none;",
      "  background: transparent; cursor: pointer; border-radius: 6px;",
      "  -webkit-tap-highlight-color: transparent;",
      "  transition: background .15s ease;",
      "}",
      ".sup-dropdown-toggle:active { background: rgba(0,0,0,.06); }",
      "html.dark .sup-dropdown-toggle:active { background: rgba(255,255,255,.08); }",
      ".sup-dropdown-toggle .sup-dropdown-arrow {",
      "  font-size: 20px; color: rgba(60,60,67,.4); transition: transform .2s ease;",
      "}",
      ".sup-dropdown-wrap.is-open .sup-dropdown-toggle .sup-dropdown-arrow {",
      "  transform: rotate(180deg);",
      "}",
      "html.dark .sup-dropdown-toggle .sup-dropdown-arrow {",
      "  color: rgba(235,235,245,.35);",
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
    injectStyles: injectStyles,
    renderDropdown: renderDropdown,
    buildPopupContent: buildPopupContent,
    defaultHref: "/support/",
  });
})(window);
