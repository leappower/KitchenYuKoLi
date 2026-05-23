/**
 * about-dropdown.js — About Dropdown (L2)
 *
 * L2: 公司简介 / 工厂实力 / 资质认证
 * CSS prefix: abt-dropdown-* / abt-popup-*
 * Unique: SPA sub-item navigation (hash anchor → SpaRouter.navigate)
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

  var DEFAULT_ITEMS = [
    { key: "nav_about_profile", icon: "apartment", href: "/about/#profile" },
    { key: "nav_about_factory", icon: "factory", href: "/about/#factory" },
    { key: "nav_about_cert", icon: "verified", href: "/about/#cert" },
  ];

  function getItems() {
    return DEFAULT_ITEMS;
  }

  /* ───────────────────────── CSS ───────────────────────── */

  /* ───────────────────────── RENDER ───────────────────────── */

  function renderDropdown(cfg) {
    var items = getItems()
      .map(function (item, idx) {
        var row =
          '<a href="' +
          esc(item.href) +
          '" class="abt-dropdown-item">' +
          '<span class="abt-dropdown-icon"><span class="material-symbols-outlined">' +
          esc(item.icon) +
          "</span></span>" +
          '<span class="abt-dropdown-label" data-i18n="' +
          esc(item.key) +
          '">' +
          esc(item.key) +
          "</span>" +
          '<span class="material-symbols-outlined abt-dropdown-chevron">chevron_right</span>' +
          "</a>";
        if (idx < getItems().length - 1) row += '<div class="abt-dropdown-separator"></div>';
        return row;
      })
      .join("\n");

    return (
      '<div class="abt-dropdown-wrap' +
      (isTouch() ? " touch-device" : "") +
      '">' +
      '<div class="abt-dropdown-trigger">' +
      '<a class="' +
      esc(cfg.activeClass || "") +
      ' abt-dropdown-link"' +
      ' href="javascript:void(0)" data-no-swup onclick="event.stopPropagation();event.preventDefault();return false"' +
      ' data-abt-trigger-label="' +
      esc(cfg.labelKey || cfg.label) +
      '">' +
      '<span data-i18n="' +
      esc(cfg.labelKey || cfg.label) +
      '">' +
      esc(cfg.label || cfg.labelKey) +
      "</span>" +
      "</a>" +
      '<button class="abt-dropdown-toggle" type="button" aria-label="Toggle submenu">' +
      '<span class="material-symbols-outlined abt-dropdown-arrow">expand_more</span>' +
      "</button>" +
      "</div>" +
      '<div class="abt-dropdown-panel"><div class="abt-dropdown-card">' +
      items +
      "</div></div>" +
      "</div>"
    );
  }

  /* ───────────────────────── POPUP CONTENT ───────────────────────── */

  function buildPopupContent(items) {
    return items
      .map(function (item) {
        return (
          '<a href="' +
          esc(item.href) +
          '" class="abt-popup-item">' +
          '<span class="abt-dropdown-icon"><span class="material-symbols-outlined">' +
          esc(item.icon) +
          "</span></span>" +
          '<span class="abt-popup-label" data-i18n="' +
          esc(item.key) +
          '">' +
          esc(item.key) +
          "</span>" +
          '<span class="material-symbols-outlined abt-popup-chevron">chevron_right</span>' +
          "</a>"
        );
      })
      .join("\n");
  }

  /* ───────────────────────── CUSTOM INIT (SPA sub-item nav) ───────────────────────── */

  function initDropdownClickOverride(shared) {
    // Run the shared init first (document click-to-close + bindTriggers)
    shared.initDropdownClick();

    // SPA navigation for dropdown sub-items (prevent full page refresh)
    document.querySelectorAll(".abt-dropdown-item").forEach(function (item) {
      if (item._abtNavBound) return;
      item._abtNavBound = true;
      item.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var wrap = item.closest(".abt-dropdown-wrap");
        if (wrap) wrap.classList.remove("is-open");

        var href = item.getAttribute("href");
        if (!href) return;

        var hashMatch = href.match(/^(\/[^#]*?)#([^#]*)$/);
        if (hashMatch) {
          var targetPath = hashMatch[1];
          var anchorId = hashMatch[2];
          if (!targetPath.endsWith("/")) targetPath += "/";

          var currentPath = window.SpaRouter ? window.SpaRouter.getCurrentPath() : window.location.pathname;
          if (!currentPath.endsWith("/")) currentPath += "/";

          if (targetPath === currentPath) {
            window.setTimeout(function () {
              var el = document.getElementById(anchorId);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
          } else if (window.SpaRouter) {
            window.SpaRouter._pendingScroll = anchorId;
            window.SpaRouter.navigate(targetPath);
          } else {
            window.location.href = href;
          }
        } else {
          if (window.SpaRouter) {
            window.SpaRouter.navigate(href);
          } else {
            window.location.href = href;
          }
        }
      });
    });
  }

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.AboutDropdown = global.DropdownBase.create({
    prefix: "abt",
    getItems: getItems,
    renderDropdown: renderDropdown,
    buildPopupContent: buildPopupContent,
    defaultHref: "/about/",
    initDropdownClickOverride: initDropdownClickOverride,
    extraKeys: function () {
      return { ITEMS: DEFAULT_ITEMS };
    },
  });
})(window);
