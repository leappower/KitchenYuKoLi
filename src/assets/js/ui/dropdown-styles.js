/**
 * dropdown-styles.js — Shared dropdown base styles
 *
 * Generates identical CSS for all dropdown prefixes (abt, cnt, prod, sol, sup, app).
 * Each dropdown's injectStyles() calls injectDropdownBaseStyles() first,
 * then adds only its own unique overrides (e.g. WhatsApp green, ROI badge, emoji).
 *
 * Consumed by: about-dropdown.js, contact-dropdown.js, products-dropdown.js,
 *              solutions-dropdown.js, support-dropdown.js, applications-dropdown.js
 */

(function (global) {
  "use strict";

  /**
   * Shared style template — uses {{PREFIX}} placeholder.
   * Includes: trigger, arrow, wrap, panel, card, item, icon, label, chevron,
   *           separator, popup overlay/panel/handle/item/label/chevron,
   *           dark mode, @keyframes, mobile media query.
   */
  var TEMPLATE = [
    /* ===== Trigger ===== */
    ".{{PREFIX}}-dropdown-trigger {",
    "  display: inline-flex; align-items: center; gap: 4px;",
    "  cursor: pointer; user-select: none;",
    "  -webkit-tap-highlight-color: transparent;",
    "  padding-bottom: 8px; margin-bottom: -8px;",
    "}",

    ".{{PREFIX}}-dropdown-arrow {",
    "  font-size: 16px; opacity: .5;",
    "  transition: transform .25s cubic-bezier(.4,0,.2,1);",
    "}",

    ".{{PREFIX}}-dropdown-wrap.is-open .{{PREFIX}}-dropdown-arrow,",
    ".{{PREFIX}}-dropdown-wrap:not(.touch-device):hover .{{PREFIX}}-dropdown-arrow {",
    "  transform: rotate(180deg);",
    "}",

    /* ===== Wrap ===== */
    ".{{PREFIX}}-dropdown-wrap { position: relative; display: inline-block; }",

    /* ===== Panel — floating card animation ===== */
    ".{{PREFIX}}-dropdown-panel {",
    "  position: absolute; left: 50%; top: 100%;",
    "  transform: translateX(-50%) scale(.97); transform-origin: top center;",
    "  opacity: 0; visibility: hidden; pointer-events: none;",
    "  transition: opacity .2s ease, transform .25s cubic-bezier(.32,.72,0,1), visibility 0s .2s;",
    "  z-index: 2500; padding-top: 8px;",
    "}",

    ".{{PREFIX}}-dropdown-wrap.is-open .{{PREFIX}}-dropdown-panel,",
    ".{{PREFIX}}-dropdown-wrap:not(.touch-device):hover .{{PREFIX}}-dropdown-panel {",
    "  opacity: 1; visibility: visible; pointer-events: auto;",
    "  transform: translateX(-50%) scale(1);",
    "  transition: opacity .2s ease, transform .35s cubic-bezier(.32,.72,0,1), visibility 0s 0s;",
    "}",

    /* ===== Card ===== */
    ".{{PREFIX}}-dropdown-card {",
    "  background: rgba(246,246,248,1);",
    "  border-radius: 13px; padding: 4px;",
    "  border: .5px solid rgba(0,0,0,.08);",
    "  box-shadow: 0 0 0 .5px rgba(0,0,0,.04), 0 8px 40px rgba(0,0,0,.12), 0 2px 12px rgba(0,0,0,.08);",
    "}",

    "html.dark .{{PREFIX}}-dropdown-card {",
    "  background: rgba(44,44,46,1); border-color: rgba(255,255,255,.12);",
    "  box-shadow: 0 0 0 .5px rgba(255,255,255,.06), 0 8px 40px rgba(0,0,0,.4), 0 2px 12px rgba(0,0,0,.3);",
    "}",

    /* ===== Item ===== */
    ".{{PREFIX}}-dropdown-item {",
    "  display: flex; align-items: center; gap: 10px; padding: 9px 12px;",
    "  font-size: 13px; font-weight: 500; letter-spacing: -.01em; line-height: 1.38;",
    "  color: #1d1d1f; text-decoration: none; border-radius: 10px; position: relative;",
    "  transition: background .1s ease, transform .15s cubic-bezier(.32,.72,0,1);",
    "}",

    "html.dark .{{PREFIX}}-dropdown-item { color: #f5f5f7; }",

    ".{{PREFIX}}-dropdown-item:hover { background: rgba(236,91,19,.06); }",

    ".{{PREFIX}}-dropdown-item:active { background: rgba(236,91,19,.12); transform: scale(.98); }",

    "html.dark .{{PREFIX}}-dropdown-item:hover { background: rgba(236,91,19,.10); }",

    "html.dark .{{PREFIX}}-dropdown-item:active { background: rgba(236,91,19,.18); }",

    /* ===== Active sub-item ===== */
    ".{{PREFIX}}-dropdown-item.is-active {",
    "  background: rgba(236,91,19,.08);",
    "  font-weight: 600;",
    "}",
    ".{{PREFIX}}-dropdown-item.is-active .{{PREFIX}}-dropdown-chevron { color: #ec5b13; }",
    "html.dark .{{PREFIX}}-dropdown-item.is-active { background: rgba(236,91,19,.14); }",

    /* ===== Icon ===== */
    ".{{PREFIX}}-dropdown-icon {",
    "  width: 28px; height: 28px; border-radius: 7px;",
    "  background: rgba(236,91,19,.10);",
    "  display: flex; align-items: center; justify-content: center; flex-shrink: 0;",
    "}",

    "html.dark .{{PREFIX}}-dropdown-icon { background: rgba(236,91,19,.18); }",

    ".{{PREFIX}}-dropdown-icon .material-symbols-outlined { font-size: 16px; color: #ec5b13; }",

    /* ===== Label ===== */
    ".{{PREFIX}}-dropdown-label {",
    "  flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
    "}",

    /* ===== Chevron ===== */
    ".{{PREFIX}}-dropdown-chevron {",
    "  margin-left: auto; font-size: 14px; color: rgba(60,60,67,.3); flex-shrink: 0;",
    "}",

    "html.dark .{{PREFIX}}-dropdown-chevron { color: rgba(235,235,245,.25); }",

    /* ===== Separator ===== */
    ".{{PREFIX}}-dropdown-separator {",
    "  height: .5px; background: rgba(60,60,67,.12); margin: 0 12px 0 50px;",
    "}",

    "html.dark .{{PREFIX}}-dropdown-separator { background: rgba(235,235,245,.15); }",

    /* ===== Mobile — hide panel ===== */
    "@media (max-width: 720px) { .{{PREFIX}}-dropdown-panel { display: none !important; } }",

    /* ===== Popup — iOS bottom sheet ===== */
    ".{{PREFIX}}-popup-overlay {",
    "  position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 998;",
    "  animation: dd-fade-in .2s ease;",
    "}",

    ".{{PREFIX}}-popup-panel {",
    "  position: fixed; left: 8px; right: 8px; bottom: 0;",
    "  background: rgba(246,246,248,.97);",
    "  border-radius: 14px 14px 0 0; transform: translateY(100%);",
    "  transition: transform .35s cubic-bezier(.32,.72,0,1);",
    "  z-index: 999; padding: 8px 4px calc(16px + env(safe-area-inset-bottom)) 4px;",
    "  box-shadow: 0 -2px 20px rgba(0,0,0,.1);",
    "}",

    ".{{PREFIX}}-popup-panel.is-open { transform: translateY(0); }",

    "html.dark .{{PREFIX}}-popup-panel {",
    "  background: rgba(44,44,46,.97); box-shadow: 0 -2px 20px rgba(0,0,0,.4);",
    "}",

    /* iOS drag indicator */
    ".{{PREFIX}}-popup-handle {",
    "  width: 36px; height: 5px; border-radius: 3px;",
    "  background: rgba(60,60,67,.25); margin: 0 auto 8px;",
    "}",

    "html.dark .{{PREFIX}}-popup-handle { background: rgba(235,235,245,.2); }",

    /* Popup items */
    ".{{PREFIX}}-popup-item {",
    "  display: flex; align-items: center; gap: 12px; padding: 12px 16px;",
    "  font-size: 17px; font-weight: 400; color: #1d1d1f; text-decoration: none;",
    "  border-radius: 10px; margin: 0 4px;",
    "  transition: background .1s ease, transform .15s cubic-bezier(.32,.72,0,1);",
    "}",

    "html.dark .{{PREFIX}}-popup-item { color: #f5f5f7; }",

    ".{{PREFIX}}-popup-item:hover { background: rgba(236,91,19,.06); }",

    "html.dark .{{PREFIX}}-popup-item:hover { background: rgba(236,91,19,.10); }",

    ".{{PREFIX}}-popup-item:active { background: rgba(236,91,19,.12); transform: scale(.98); }",

    "html.dark .{{PREFIX}}-popup-item:active { background: rgba(236,91,19,.18); }",

    ".{{PREFIX}}-popup-item.is-active {",
    "  background: rgba(236,91,19,.08);",
    "  font-weight: 600;",
    "}",
    ".{{PREFIX}}-popup-item.is-active .{{PREFIX}}-popup-chevron { color: #ec5b13; }",
    "html.dark .{{PREFIX}}-popup-item.is-active { background: rgba(236,91,19,.14); }",

    ".{{PREFIX}}-popup-label { flex: 1; min-width: 0; }",

    ".{{PREFIX}}-popup-chevron { font-size: 16px; color: rgba(60,60,67,.3); flex-shrink: 0; }",

    "html.dark .{{PREFIX}}-popup-chevron { color: rgba(235,235,245,.25); }",
  ].join("\n");

  var PREFIXES = ["abt", "cnt", "prod", "sol", "sup", "app"];
  var STYLE_ID = "dd-base-styles";

  /**
   * Inject shared dropdown base styles for all prefixes.
   * Idempotent — safe to call multiple times.
   */
  function injectDropdownBaseStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.setAttribute("data-ver", "2026-03-25-v1");

    var css = PREFIXES
      .map(function (pfx) {
        return TEMPLATE.replace(/\{\{PREFIX\}\}/g, pfx);
      })
      .join("\n\n");

    // Shared @keyframes (only once)
    css += "\n@keyframes dd-fade-in { from { opacity: 0; } to { opacity: 1; } }\n";

    style.textContent = css;
    document.head.appendChild(style);
  }

  global.DropdownBaseStyles = {
    inject: injectDropdownBaseStyles,
    STYLE_ID: STYLE_ID,
  };
})(window);
