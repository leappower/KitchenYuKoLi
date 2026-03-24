/**
 * whatsapp-fab.js — WhatsApp Floating Action Button
 *
 * Renders a fixed green WhatsApp FAB at the bottom-right corner.
 * Visible on Desktop (PC) and Tablet only.
 * Hidden on Mobile (≤ 767px) since WhatsApp is in the bottom Tab Bar.
 *
 * Usage in HTML:
 *   <script defer src="/assets/js/ui/whatsapp-fab.js"></script>
 *   <!-- No extra markup needed. FAB is injected automatically. -->
 *
 * Config (optional, set before script loads):
 *   window.WHATSAPP_NUMBER = '+8613800000000';  // default fallback
 *   window.WHATSAPP_MESSAGE = 'Hello, I would like to inquire about your products.';
 */

(function (global) {
  "use strict";

  var DEFAULT_NUMBER = global.WHATSAPP_NUMBER || "+8613800000000";
  var DEFAULT_MESSAGE = global.WHATSAPP_MESSAGE || "Hello, I would like to inquire about your products.";

  /* ───────────────────────── CSS ───────────────────────── */

  function injectStyles() {
    if (document.getElementById("wa-fab-styles")) return;
    var style = document.createElement("style");
    style.id = "wa-fab-styles";
    style.textContent = [
      /* Hide on mobile — WhatsApp is in Tab Bar */
      "@media (max-width: 767px) { .wa-fab { display: none !important; } }",

      ".wa-fab {",
      "  position: fixed;",
      "  right: 20px;",
      "  bottom: 28px;",
      "  width: 52px;",
      "  height: 52px;",
      "  border-radius: 50%;",
      "  background: #25d366;",
      "  box-shadow: 0 4px 16px rgba(37,211,102,.45), 0 2px 6px rgba(0,0,0,.15);",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  cursor: pointer;",
      "  text-decoration: none;",
      "  z-index: 1100;",
      "  transition: transform .2s cubic-bezier(.32,.72,0,1), box-shadow .2s ease, background .15s ease;",
      "  -webkit-tap-highlight-color: transparent;",
      "}",

      ".wa-fab:hover {",
      "  background: #20c05c;",
      "  transform: scale(1.08);",
      "  box-shadow: 0 6px 24px rgba(37,211,102,.55), 0 2px 8px rgba(0,0,0,.18);",
      "}",

      ".wa-fab:active {",
      "  transform: scale(.93);",
      "  box-shadow: 0 2px 8px rgba(37,211,102,.35);",
      "}",

      /* WhatsApp SVG icon */
      ".wa-fab svg {",
      "  width: 28px;",
      "  height: 28px;",
      "  fill: #fff;",
      "  pointer-events: none;",
      "}",

      /* Tooltip */
      ".wa-fab-tooltip {",
      "  position: absolute;",
      "  right: calc(100% + 10px);",
      "  top: 50%;",
      "  transform: translateY(-50%) scale(.92);",
      "  background: rgba(28,28,30,.88);",
      "  color: #fff;",
      "  font-size: 12px;",
      "  font-weight: 500;",
      "  white-space: nowrap;",
      "  padding: 5px 10px;",
      "  border-radius: 8px;",
      "  opacity: 0;",
      "  pointer-events: none;",
      "  transition: opacity .15s ease, transform .15s cubic-bezier(.32,.72,0,1);",
      "}",

      ".wa-fab:hover .wa-fab-tooltip {",
      "  opacity: 1;",
      "  transform: translateY(-50%) scale(1);",
      "}",

      /* Pulse ring — subtle attention cue */
      ".wa-fab::after {",
      '  content: "";',
      "  position: absolute;",
      "  inset: 0;",
      "  border-radius: 50%;",
      "  border: 2px solid rgba(37,211,102,.5);",
      "  animation: wa-pulse 2.4s ease-out infinite;",
      "}",

      "@keyframes wa-pulse {",
      "  0%   { transform: scale(1);   opacity: .7; }",
      "  70%  { transform: scale(1.55); opacity: 0; }",
      "  100% { transform: scale(1.55); opacity: 0; }",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ───────────────────────── BUILD ───────────────────────── */

  var WA_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15' +
    "-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475" +
    "-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52" +
    ".149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207" +
    "-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372" +
    "-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2" +
    " 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719" +
    ' 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>' +
    '<path d="M12 0C5.374 0 0 5.373 0 12c0 2.121.554 4.11 1.522 5.836L.044 23.447' +
    "a.75.75 0 0 0 .917.972l5.8-1.524A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12" +
    "S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.016-1.381l-.36-.214-3.732.98.997-3.648" +
    "-.234-.374A9.817 9.817 0 0 1 2.182 12C2.182 6.58 6.58 2.182 12 2.182c5.42 0 9.818 4.398" +
    ' 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/>' +
    "</svg>";

  function buildHref(number, message) {
    var encoded = encodeURIComponent(message);
    return "https://wa.me/" + number.replace(/\D/g, "") + "?text=" + encoded;
  }

  /* ───────────────────────── MOUNT ───────────────────────── */

  function mount() {
    if (document.getElementById("wa-fab")) return;

    injectStyles();

    var fab = document.createElement("a");
    fab.id = "wa-fab";
    fab.className = "wa-fab";
    fab.href = buildHref(DEFAULT_NUMBER, DEFAULT_MESSAGE);
    fab.target = "_blank";
    fab.rel = "noopener noreferrer";
    fab.setAttribute("aria-label", "Chat on WhatsApp");

    fab.innerHTML =
      WA_SVG + '<span class="wa-fab-tooltip" data-i18n="nav_contact_whatsapp_chat">Chat on WhatsApp</span>';

    // Translate tooltip text if translationManager is available
    function tryTranslate() {
      if (global.translationManager) {
        fab.querySelectorAll("[data-i18n]").forEach(function (el) {
          var key = el.getAttribute("data-i18n");
          var val = global.translationManager.translate(key);
          if (val && val !== key) el.textContent = val;
        });
      }
    }

    document.body.appendChild(fab);
    tryTranslate();

    // Re-translate on language switch
    document.addEventListener("language:changed", tryTranslate);

    // SPA navigation: keep FAB alive
    document.addEventListener("spa:load", function () {
      if (!document.getElementById("wa-fab")) {
        document.body.appendChild(fab);
      }
    });
  }

  /* ───────────────────────── INIT ───────────────────────── */

  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }
  }

  init();

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.WhatsAppFAB = {
    mount: mount,
    setNumber: function (n) {
      DEFAULT_NUMBER = n;
    },
    setMessage: function (m) {
      DEFAULT_MESSAGE = m;
    },
  };
})(window);
