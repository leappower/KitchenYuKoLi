/**
 * support-dropdown.js — iOS Style Responsive Support Dropdown
 * Desktop / Tablet / Mobile adaptive
 */

(function (global) {
  "use strict";

  /* ───────────────────────── DATA ───────────────────────── */

  var SUBSERIES = [
    { key: "nav_support_installation", icon: "construction", emoji: "" },
    { key: "nav_support_warranty", icon: "verified", emoji: "" },
    { key: "nav_support_spare_parts", icon: "build_circle", emoji: "" },
    { key: "nav_support_training", icon: "school", emoji: "" },
    { key: "nav_support_faq", icon: "contact_support", emoji: "" },
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
    if (document.getElementById("sup-dropdown-styles-v1")) return;

    var style = document.createElement("style");
    style.id = "sup-dropdown-styles-v1";
    style.setAttribute("data-ver", "2026-03-22-v1");
    style.textContent = [
      /* ===== Trigger ===== */
      ".sup-dropdown-trigger {",
      "  display: inline-flex;",
      "  align-items: center;",
      "  gap: 4px;",
      "  cursor: pointer;",
      "  user-select: none;",
      "  -webkit-tap-highlight-color: transparent;",
      "}",

      ".sup-dropdown-arrow {",
      "  font-size: 16px;",
      "  opacity: .5;",
      "  transition: transform .28s cubic-bezier(.4,0,.2,1);",
      "}",

      ".sup-dropdown-wrap.is-open .sup-dropdown-arrow,",
      ".sup-dropdown-wrap:not(.touch-device):hover .sup-dropdown-arrow {",
      "  transform: rotate(180deg);",
      "}",

      /* ===== Wrap ===== */
      ".sup-dropdown-wrap {",
      "  position: relative;",
      "  display: inline-block;",
      "}",

      /* ===== Panel — iOS spring animation ===== */
      ".sup-dropdown-panel {",
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

      ".sup-dropdown-wrap.is-open .sup-dropdown-panel,",
      ".sup-dropdown-wrap:not(.touch-device):hover .sup-dropdown-panel {",
      "  opacity: 1;",
      "  visibility: visible;",
      "  pointer-events: auto;",
      "  transform: translateX(-50%) scale(1);",
      "  transition: opacity .2s ease, transform .35s cubic-bezier(.32,.72,0,1), visibility 0s 0s;",
      "}",

      /* ===== Card — iOS system menu (SF-style) ===== */
      ".sup-dropdown-card {",
      "  background: rgba(246,246,248,1);",
      "  border-radius: 13px;",
      "  padding: 4px;",
      "  min-width: 320px;",
      "  max-width: 420px;",
      "  border: .5px solid rgba(0,0,0,.08);",
      "  box-shadow: 0 0 0 .5px rgba(0,0,0,.04), 0 8px 40px rgba(0,0,0,.12), 0 2px 12px rgba(0,0,0,.08);",
      "}",

      "html.dark .sup-dropdown-card {",
      "  background: rgba(44,44,46,1);",
      "  border-color: rgba(255,255,255,.12);",
      "  box-shadow: 0 0 0 .5px rgba(255,255,255,.06), 0 8px 40px rgba(0,0,0,.4), 0 2px 12px rgba(0,0,0,.3);",
      "}",

      /* ===== Item — iOS list row ===== */
      ".sup-dropdown-item {",
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

      "html.dark .sup-dropdown-item {",
      "  color: #f5f5f7;",
      "}",

      ".sup-dropdown-item:hover {",
      "  background: rgba(236,91,19,.06);",
      "}",

      ".sup-dropdown-item:active {",
      "  background: rgba(236,91,19,.12);",
      "  transform: scale(.98);",
      "}",

      "html.dark .sup-dropdown-item:hover {",
      "  background: rgba(236,91,19,.10);",
      "}",

      "html.dark .sup-dropdown-item:active {",
      "  background: rgba(236,91,19,.18);",
      "}",

      /* ===== Icon — tinted rounded square ===== */
      ".sup-dropdown-icon {",
      "  width: 28px;",
      "  height: 28px;",
      "  border-radius: 7px;",
      "  background: rgba(236,91,19,.10);",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  flex-shrink: 0;",
      "}",

      "html.dark .sup-dropdown-icon {",
      "  background: rgba(236,91,19,.18);",
      "}",

      ".sup-dropdown-icon .material-symbols-outlined {",
      "  font-size: 16px;",
      "  color: #ec5b13;",
      "}",

      /* ===== Label ===== */
      ".sup-dropdown-label {",
      "  flex: 1;",
      "  min-width: 0;",
      "  white-space: nowrap;",
      "  overflow: hidden;",
      "  text-overflow: ellipsis;",
      "}",

      /* ===== Emoji Badge ===== */
      ".sup-dropdown-emoji {",
      "  margin-left: auto;",
      "  font-size: 13px;",
      "  line-height: 1;",
      "  opacity: .85;",
      "  flex-shrink: 0;",
      "}",

      /* ===== Chevron ===== */
      ".sup-dropdown-chevron {",
      "  margin-left: auto;",
      "  font-size: 14px;",
      "  color: rgba(60,60,67,.3);",
      "  flex-shrink: 0;",
      "}",

      "html.dark .sup-dropdown-chevron {",
      "  color: rgba(235,235,245,.25);",
      "}",

      /* ===== Separator ===== */
      ".sup-dropdown-item + .sup-dropdown-item {",
      "  margin-top: 0;",
      "}",

      ".sup-dropdown-separator {",
      "  height: .5px;",
      "  background: rgba(60,60,67,.12);",
      "  margin: 0 12px 0 50px;",
      "}",

      "html.dark .sup-dropdown-separator {",
      "  background: rgba(235,235,245,.15);",
      "}",

      /* ===== Mobile — hide panel, use popup instead ===== */
      "@media (max-width: 720px) {",
      "  .sup-dropdown-panel { display: none !important; }",
      "}",

      /* ===== Popup — iOS bottom sheet ===== */
      ".sup-popup-overlay {",
      "  position: fixed;",
      "  inset: 0;",
      "  background: rgba(0,0,0,.35);",
      "  z-index: 998;",
      "  animation: sdp-fade-in .2s ease;",
      "}",

      "@keyframes sdp-fade-in { from { opacity: 0; } to { opacity: 1; } }",

      ".sup-popup-panel {",
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

      ".sup-popup-panel.is-open {",
      "  transform: translateY(0);",
      "}",

      "html.dark .sup-popup-panel {",
      "  background: rgba(44,44,46,.97);",
      "  box-shadow: 0 -2px 20px rgba(0,0,0,.4);",
      "}",

      /* iOS drag indicator */
      ".sup-popup-handle {",
      "  width: 36px;",
      "  height: 5px;",
      "  border-radius: 3px;",
      "  background: rgba(60,60,67,.25);",
      "  margin: 0 auto 8px;",
      "}",

      "html.dark .sup-popup-handle {",
      "  background: rgba(235,235,245,.2);",
      "}",

      /* Popup items */
      ".sup-popup-item {",
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

      "html.dark .sup-popup-item {",
      "  color: #f5f5f7;",
      "}",

      ".sup-popup-item:hover {",
      "  background: rgba(236,91,19,.06);",
      "}",

      "html.dark .sup-popup-item:hover {",
      "  background: rgba(236,91,19,.10);",
      "}",

      ".sup-popup-item:active {",
      "  background: rgba(236,91,19,.12);",
      "  transform: scale(.98);",
      "}",

      "html.dark .sup-popup-item:active {",
      "  background: rgba(236,91,19,.18);",
      "}",

      ".sup-popup-label {",
      "  flex: 1;",
      "  min-width: 0;",
      "}",

      ".sup-popup-chevron {",
      "  font-size: 16px;",
      "  color: rgba(60,60,67,.3);",
      "  flex-shrink: 0;",
      "}",

      "html.dark .sup-popup-chevron {",
      "  color: rgba(235,235,245,.25);",
      "}",

      ".sup-popup-emoji {",
      "  margin-left: auto;",
      "  font-size: 15px;",
      "  opacity: .85;",
      "  flex-shrink: 0;",
      "}",

      ".sup-popup-item + .sup-popup-item {",
      "  border-top: none;",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ───────────────────────── BUILDERS ───────────────────────── */

  function buildItem(sub, href) {
    var chevron = '<span class="material-symbols-outlined sup-dropdown-chevron">chevron_right</span>';
    var emojiHtml = sub.emoji ? '<span class="sup-dropdown-emoji">' + sub.emoji + "</span>" : "";
    return (
      '<a href="' +
      esc(href) +
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

  function buildSeparator() {
    return '<div class="sup-dropdown-separator"></div>';
  }

  function renderDropdown(cfg) {
    var items = SUBSERIES.map(function (s, idx) {
      var html = buildItem(s, cfg.href);
      if (idx < SUBSERIES.length - 1) {
        html += buildSeparator();
      }
      return html;
    }).join("\n");

    var html =
      '<div class="sup-dropdown-wrap' +
      (isTouch() ? " touch-device" : "") +
      '">' +
      '<a href="' +
      esc(cfg.href) +
      '"' +
      ' class="' +
      esc(cfg.activeClass || "") +
      ' sup-dropdown-trigger"' +
      ' data-sup-trigger-label="' +
      esc(cfg.labelKey) +
      '">' +
      '<span data-i18n="' +
      esc(cfg.labelKey) +
      '">' +
      esc(cfg.labelKey) +
      "</span>" +
      '<span class="material-symbols-outlined sup-dropdown-arrow">expand_more</span>' +
      "</a>" +
      '<div class="sup-dropdown-panel">' +
      '<div class="sup-dropdown-card">' +
      items +
      "</div>" +
      "</div>" +
      "</div>";

    return html;
  }

  /* ───────────────────────── INTERACTION ───────────────────────── */

  function initDropdownClick() {
    document.addEventListener("click", function () {
      document.querySelectorAll(".sup-dropdown-wrap.is-open").forEach(function (d) {
        d.classList.remove("is-open");
      });
    });

    document.querySelectorAll(".sup-dropdown-trigger").forEach(function (t) {
      t.addEventListener("click", function (e) {
        if (window.innerWidth <= 720) return;
        e.preventDefault();
        e.stopPropagation();
        t.closest(".sup-dropdown-wrap").classList.toggle("is-open");
      });
    });
  }

  /* ───────────────────────── MOBILE POPUP ───────────────────────── */

  function openPopup(href) {
    closePopup();

    var overlay = document.createElement("div");
    overlay.className = "sup-popup-overlay";

    var panel = document.createElement("div");
    panel.className = "sup-popup-panel";

    var handle = '<div class="sup-popup-handle"></div>';

    var items = SUBSERIES.map(function (s) {
      var chevron = '<span class="material-symbols-outlined sup-popup-chevron">chevron_right</span>';
      var emojiHtml = s.emoji ? '<span class="sup-popup-emoji">' + s.emoji + "</span>" : "";
      return (
        '<a href="' +
        esc(href) +
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
    }).join("\n");

    panel.innerHTML = handle + items;

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
    var popupItems = panel.querySelectorAll(".sup-popup-item");
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
    document.querySelectorAll(".sup-popup-overlay,.sup-popup-panel").forEach(function (el) {
      el.parentNode && el.parentNode.removeChild(el);
    });
  }

  /**
   * Bind click handlers to all elements with data-sup-popup attribute.
   */
  function bindAllPopupTriggers() {
    var triggers = document.querySelectorAll("[data-sup-popup]");
    for (var i = 0; i < triggers.length; i++) {
      var el = triggers[i];
      if (el._supPopupBound) continue;
      el._supPopupBound = true;

      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var href = el.getAttribute("data-sup-popup-href") || el.getAttribute("href") || "/support/";
        openPopup(href);
      });
    }
  }

  /* ───────────────────────── SPA CLEANUP ───────────────────────── */

  document.addEventListener("spa:load", function () {
    closePopup();
  });

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.SupportDropdown = {
    SUBSERIES: SUBSERIES,
    renderPC: renderDropdown,
    renderTablet: renderDropdown,
    initDropdownClick: initDropdownClick,
    openPopup: openPopup,
    closePopup: closePopup,
    bindAllPopupTriggers: bindAllPopupTriggers,
    injectAllStyles: injectStyles,
  };
})(window);
