/**
 * applications-dropdown.js — iOS Style Responsive Applications Dropdown
 * Desktop / Tablet / Mobile adaptive
 */

(function (global) {
  "use strict";

  /* ───────────────────────── DATA ───────────────────────── */

  /** Application scenarios (5 items) */
  var SUBSERIES = [
    { key: "nav_applications_fastfood", icon: "ramen_dining", emoji: "" },
    { key: "nav_applications_hotpot", icon: "local_fire_department", emoji: "" },
    { key: "nav_applications_cloud_kitchen", icon: "delivery_dining", emoji: "" },
    { key: "nav_applications_canteen", icon: "restaurant", emoji: "" },
    { key: "nav_applications_thai", icon: "public", emoji: "" },
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
    if (document.getElementById("app-dropdown-styles-v1")) return;

    var style = document.createElement("style");
    style.id = "app-dropdown-styles-v1";
    style.setAttribute("data-ver", "2026-03-22-v1");
    style.textContent = [
      /* ===== Trigger ===== */
      ".app-dropdown-trigger {",
      "  display: inline-flex;",
      "  align-items: center;",
      "  gap: 4px;",
      "  cursor: pointer;",
      "  user-select: none;",
      "  -webkit-tap-highlight-color: transparent;",
      "}",

      ".app-dropdown-arrow {",
      "  font-size: 16px;",
      "  opacity: .5;",
      "  transition: transform .28s cubic-bezier(.4,0,.2,1);",
      "}",

      ".app-dropdown-wrap.is-open .app-dropdown-arrow,",
      ".app-dropdown-wrap:not(.touch-device):hover .app-dropdown-arrow {",
      "  transform: rotate(180deg);",
      "}",

      /* ===== Wrap ===== */
      ".app-dropdown-wrap {",
      "  position: relative;",
      "  display: inline-block;",
      "}",

      /* ===== Panel — iOS spring animation ===== */
      ".app-dropdown-panel {",
      "  position: absolute;",
      "  left: 50%;",
      "  top: calc(100% + 6px);",
      "  transform: translateX(-50%) scale(.96);",
      "  transform-origin: top center;",
      "  opacity: 0;",
      "  visibility: hidden;",
      "  pointer-events: none;",
      "  transition: opacity .2s ease, transform .25s cubic-bezier(.32,.72,0,1), visibility 0s .2s;",
      "  z-index: 1200;",
      "}",

      ".app-dropdown-wrap.is-open .app-dropdown-panel,",
      ".app-dropdown-wrap:not(.touch-device):hover .app-dropdown-panel {",
      "  opacity: 1;",
      "  visibility: visible;",
      "  pointer-events: auto;",
      "  transform: translateX(-50%) scale(1);",
      "  transition: opacity .2s ease, transform .35s cubic-bezier(.32,.72,0,1), visibility 0s 0s;",
      "}",

      /* ===== Card — iOS system menu (SF-style) ===== */
      ".app-dropdown-card {",
      "  background: rgba(246,246,248,1);",
      "  border-radius: 13px;",
      "  padding: 4px;",
      "  min-width: 320px;",
      "  max-width: 420px;",
      "  border: .5px solid rgba(0,0,0,.08);",
      "  box-shadow: 0 0 0 .5px rgba(0,0,0,.04), 0 8px 40px rgba(0,0,0,.12), 0 2px 12px rgba(0,0,0,.08);",
      "}",

      "html.dark .app-dropdown-card {",
      "  background: rgba(44,44,46,1);",
      "  border-color: rgba(255,255,255,.12);",
      "  box-shadow: 0 0 0 .5px rgba(255,255,255,.06), 0 8px 40px rgba(0,0,0,.4), 0 2px 12px rgba(0,0,0,.3);",
      "}",

      /* ===== Item — iOS list row ===== */
      ".app-dropdown-item {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 10px;",
      "  padding: 9px 12px;",
      "  font-size: 13px;",
      "  font-weight: 500;",
      "  letter-spacing: -.01em;",
      "  line-height: 1.38;",
      "  color: #1d1d1f;",
      "  text-decoration: none;",
      "  border-radius: 10px;",
      "  position: relative;",
      "  transition: background .1s ease, transform .15s cubic-bezier(.32,.72,0,1);",
      "}",

      "html.dark .app-dropdown-item {",
      "  color: #f5f5f7;",
      "}",

      ".app-dropdown-item:hover {",
      "  background: rgba(236,91,19,.06);",
      "}",

      ".app-dropdown-item:active {",
      "  background: rgba(236,91,19,.12);",
      "  transform: scale(.98);",
      "}",

      "html.dark .app-dropdown-item:hover {",
      "  background: rgba(236,91,19,.10);",
      "}",

      "html.dark .app-dropdown-item:active {",
      "  background: rgba(236,91,19,.18);",
      "}",

      /* ===== Icon — tinted rounded square ===== */
      ".app-dropdown-icon {",
      "  width: 28px;",
      "  height: 28px;",
      "  border-radius: 7px;",
      "  background: rgba(236,91,19,.10);",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  flex-shrink: 0;",
      "}",

      "html.dark .app-dropdown-icon {",
      "  background: rgba(236,91,19,.18);",
      "}",

      ".app-dropdown-icon .material-symbols-outlined {",
      "  font-size: 16px;",
      "  color: #ec5b13;",
      "}",

      /* ===== Label ===== */
      ".app-dropdown-label {",
      "  flex: 1;",
      "  min-width: 0;",
      "  white-space: nowrap;",
      "  overflow: hidden;",
      "  text-overflow: ellipsis;",
      "}",

      /* ===== Emoji Badge ===== */
      ".app-dropdown-emoji {",
      "  margin-left: auto;",
      "  font-size: 13px;",
      "  line-height: 1;",
      "  opacity: .85;",
      "  flex-shrink: 0;",
      "}",

      /* ===== Chevron ===== */
      ".app-dropdown-chevron {",
      "  margin-left: auto;",
      "  font-size: 14px;",
      "  color: rgba(60,60,67,.3);",
      "  flex-shrink: 0;",
      "}",

      "html.dark .app-dropdown-chevron {",
      "  color: rgba(235,235,245,.25);",
      "}",

      /* ===== ROI Badge ===== */
      ".app-roi-badge {",
      "  display: inline-flex; align-items: center; padding: 2px 7px;",
      "  font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;",
      "  background: #ec5b13; color: #fff; border-radius: 20px;",
      "  flex-shrink: 0; line-height: 1.4;",
      "}",

      /* ===== Separator ===== */
      ".app-dropdown-item + .app-dropdown-item {",
      "  margin-top: 0;",
      "}",

      ".app-dropdown-separator {",
      "  height: .5px;",
      "  background: rgba(60,60,67,.12);",
      "  margin: 0 12px 0 50px;",
      "}",

      "html.dark .app-dropdown-separator {",
      "  background: rgba(235,235,245,.15);",
      "}",

      /* ===== Mobile — hide panel, use popup instead ===== */
      "@media (max-width: 720px) {",
      "  .app-dropdown-panel { display: none !important; }",
      "}",

      /* ===== Popup — iOS bottom sheet ===== */
      ".app-popup-overlay {",
      "  position: fixed;",
      "  inset: 0;",
      "  background: rgba(0,0,0,.35);",
      "  z-index: 998;",
      "  animation: adp-fade-in .2s ease;",
      "}",

      "@keyframes adp-fade-in { from { opacity: 0; } to { opacity: 1; } }",

      ".app-popup-panel {",
      "  position: fixed;",
      "  left: 8px;",
      "  right: 8px;",
      "  bottom: 0;",
      "  background: rgba(246,246,248,.97);",
      "  border-radius: 14px 14px 0 0;",
      "  transform: translateY(100%);",
      "  transition: transform .35s cubic-bezier(.32,.72,0,1);",
      "  z-index: 999;",
      "  padding: 8px 4px calc(16px + env(safe-area-inset-bottom)) 4px;",
      "  box-shadow: 0 -2px 20px rgba(0,0,0,.1);",
      "}",

      ".app-popup-panel.is-open {",
      "  transform: translateY(0);",
      "}",

      "html.dark .app-popup-panel {",
      "  background: rgba(44,44,46,.97);",
      "  box-shadow: 0 -2px 20px rgba(0,0,0,.4);",
      "}",

      /* iOS drag indicator */
      ".app-popup-handle {",
      "  width: 36px;",
      "  height: 5px;",
      "  border-radius: 3px;",
      "  background: rgba(60,60,67,.25);",
      "  margin: 0 auto 8px;",
      "}",

      "html.dark .app-popup-handle {",
      "  background: rgba(235,235,245,.2);",
      "}",

      /* Popup items */
      ".app-popup-item {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 12px;",
      "  padding: 12px 16px;",
      "  font-size: 17px;",
      "  font-weight: 400;",
      "  color: #1d1d1f;",
      "  text-decoration: none;",
      "  border-radius: 10px;",
      "  margin: 0 4px;",
      "  transition: background .1s ease, transform .15s cubic-bezier(.32,.72,0,1);",
      "}",

      "html.dark .app-popup-item {",
      "  color: #f5f5f7;",
      "}",

      ".app-popup-item:hover {",
      "  background: rgba(236,91,19,.06);",
      "}",

      "html.dark .app-popup-item:hover {",
      "  background: rgba(236,91,19,.10);",
      "}",

      ".app-popup-item:active {",
      "  background: rgba(236,91,19,.12);",
      "  transform: scale(.98);",
      "}",

      "html.dark .app-popup-item:active {",
      "  background: rgba(236,91,19,.18);",
      "}",

      ".app-popup-label {",
      "  flex: 1;",
      "  min-width: 0;",
      "}",

      ".app-popup-chevron {",
      "  font-size: 16px;",
      "  color: rgba(60,60,67,.3);",
      "  flex-shrink: 0;",
      "}",

      "html.dark .app-popup-chevron {",
      "  color: rgba(235,235,245,.25);",
      "}",

      ".app-popup-emoji {",
      "  margin-left: auto;",
      "  font-size: 15px;",
      "  opacity: .85;",
      "  flex-shrink: 0;",
      "}",

      ".app-popup-item + .app-popup-item {",
      "  border-top: none;",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ───────────────────────── BUILDERS ───────────────────────── */

  function buildItem(sub, href) {
    var chevron = '<span class="material-symbols-outlined app-dropdown-chevron">chevron_right</span>';
    var emojiHtml = sub.emoji ? '<span class="app-dropdown-emoji">' + sub.emoji + "</span>" : "";
    return (
      '<a href="' +
      esc(href) +
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
      esc(cfg.labelKey) +
      '">' +
      '<span data-i18n="' +
      esc(cfg.labelKey) +
      '">' +
      esc(cfg.labelKey) +
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
      var chevron = '<span class="material-symbols-outlined app-popup-chevron">chevron_right</span>';
      var emojiHtml = s.emoji ? '<span class="app-popup-emoji">' + s.emoji + "</span>" : "";
      return (
        '<a href="' +
        esc(href) +
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
