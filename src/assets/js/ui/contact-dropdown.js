/**
 * contact-dropdown.js — Contact Dropdown (L2)
 *
 * L2:  留言表单 / 全球网点 / WhatsApp 客服
 * CSS prefix:  cnt-dropdown-* / cnt-popup-*
 */

(function (global) {
  "use strict";

  /* ───────────────────────── DATA ───────────────────────── */

  var ITEMS = (typeof NAV_CONFIG !== 'undefined' && NAV_CONFIG.dropdowns && NAV_CONFIG.dropdowns.contact) || [
    { key: "nav_contact_us", icon: "grid_view", href: "/contact/" },
    { key: "nav_contact_form", icon: "mail", href: "/contact/" },
    { key: "nav_contact_locations", icon: "location_on", href: "/contact/" },
    { key: "nav_contact_whatsapp", icon: "chat", href: "/contact/", isWhatsApp: true },
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
    // Shared base styles
    if (window.DropdownBaseStyles) window.DropdownBaseStyles.inject();
    // WhatsApp green accent (unique to contact dropdown)
    if (document.getElementById("cnt-dropdown-styles")) return;
    var style = document.createElement("style");
    style.id = "cnt-dropdown-styles";
    style.textContent = [
      ".cnt-dropdown-item.is-whatsapp .cnt-dropdown-icon { background:rgba(37,211,102,.12); }",
      "html.dark .cnt-dropdown-item.is-whatsapp .cnt-dropdown-icon { background:rgba(37,211,102,.20); }",
      ".cnt-dropdown-item.is-whatsapp .cnt-dropdown-icon .material-symbols-outlined { color:#25d366; }",
      ".cnt-popup-item.is-whatsapp .cnt-dropdown-icon { background:rgba(37,211,102,.12); }",
      "html.dark .cnt-popup-item.is-whatsapp .cnt-dropdown-icon { background:rgba(37,211,102,.20); }",
      ".cnt-popup-item.is-whatsapp .cnt-dropdown-icon .material-symbols-outlined { color:#25d366; }",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ───────────────────────── BUILDERS ───────────────────────── */

  function buildDropdownItem(item, showSep) {
    var waCls = item.isWhatsApp ? " is-whatsapp" : "";
    var row =
      '<a href="' +
      esc(item.href) +
      '" class="cnt-dropdown-item' +
      waCls +
      '">' +
      '<span class="cnt-dropdown-icon"><span class="material-symbols-outlined">' +
      esc(item.icon) +
      "</span></span>" +
      '<span class="cnt-dropdown-label" data-i18n="' +
      esc(item.key) +
      '">' +
      esc(item.key) +
      "</span>" +
      '<span class="material-symbols-outlined cnt-dropdown-chevron">chevron_right</span>' +
      "</a>";
    if (showSep) row += '<div class="cnt-dropdown-separator"></div>';
    return row;
  }

  function renderDropdown(cfg) {
    var items = ITEMS.map(function (item, idx) {
      return buildDropdownItem(item, idx < ITEMS.length - 1);
    }).join("\n");

    return (
      '<div class="cnt-dropdown-wrap' +
      (isTouch() ? " touch-device" : "") +
      '">' +
      '<a href="#"' +
      ' class="' +
      esc(cfg.activeClass || "") +
      ' cnt-dropdown-trigger"' +
      ' data-cnt-trigger-label="' +
      esc(cfg.labelKey || cfg.label) +
      '">' +
      '<span data-i18n="' +
      esc(cfg.labelKey || cfg.label) +
      '">' +
      esc(cfg.label || cfg.labelKey) +
      "</span>" +
      '<span class="material-symbols-outlined cnt-dropdown-arrow">expand_more</span>' +
      "</a>" +
      '<div class="cnt-dropdown-panel"><div class="cnt-dropdown-card">' +
      items +
      "</div></div>" +
      "</div>"
    );
  }

  /* ───────────────────────── INTERACTION ───────────────────────── */

  function initDropdownClick() {
    document.addEventListener("click", function () {
      document.querySelectorAll(".cnt-dropdown-wrap.is-open").forEach(function (d) {
        d.classList.remove("is-open");
      });
    });
    document.querySelectorAll(".cnt-dropdown-trigger").forEach(function (t) {
      t.addEventListener("click", function (e) {
        if (window.innerWidth <= 720) return;
        e.stopPropagation();
        t.closest(".cnt-dropdown-wrap").classList.toggle("is-open");
      });
    });
  }

  /* ───────────────────────── MOBILE POPUP ───────────────────────── */

  function openPopup(_href) {
    closePopup();
    var overlay = document.createElement("div");
    overlay.className = "cnt-popup-overlay";
    var panel = document.createElement("div");
    panel.className = "cnt-popup-panel";

    var items = ITEMS.map(function (item) {
      var waCls = item.isWhatsApp ? " is-whatsapp" : "";
      return (
        '<a href="' +
        esc(item.href) +
        '" class="cnt-popup-item' +
        waCls +
        '">' +
        '<span class="cnt-dropdown-icon"><span class="material-symbols-outlined">' +
        esc(item.icon) +
        "</span></span>" +
        '<span class="cnt-popup-label" data-i18n="' +
        esc(item.key) +
        '">' +
        esc(item.key) +
        "</span>" +
        '<span class="material-symbols-outlined cnt-popup-chevron">chevron_right</span>' +
        "</a>"
      );
    }).join("\n");

    panel.innerHTML = '<div class="cnt-popup-handle"></div>' + items;

    if (global.translationManager) {
      panel.querySelectorAll("[data-i18n]").forEach(function (el) {
        var val = global.translationManager.translate(el.getAttribute("data-i18n"));
        if (val && val !== el.getAttribute("data-i18n")) el.textContent = val;
      });
    }

    overlay.onclick = closePopup;
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    panel.querySelectorAll(".cnt-popup-item").forEach(function (item) {
      item.addEventListener("click", function (e) {
        var itemHref = item.getAttribute("href");
        closePopup();
        if (itemHref && global.SpaRouter) {
          e.preventDefault();
          global.SpaRouter.navigate(itemHref);
        }
      });
    });

    requestAnimationFrame(function () {
      panel.classList.add("is-open");
      navigator.vibrate && navigator.vibrate(12);
    });
  }

  function closePopup() {
    document.querySelectorAll(".cnt-popup-overlay,.cnt-popup-panel").forEach(function (el) {
      el.parentNode && el.parentNode.removeChild(el);
    });
  }

  function bindAllPopupTriggers() {
    document.querySelectorAll("[data-cnt-popup]").forEach(function (el) {
      if (el._cntPopupBound) return;
      el._cntPopupBound = true;
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        openPopup(el.getAttribute("data-cnt-popup-href") || el.getAttribute("href") || "/contact/");
      });
    });
  }

  document.addEventListener("spa:load", closePopup);

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.ContactDropdown = {
    ITEMS: ITEMS,
    renderPC: renderDropdown,
    renderTablet: renderDropdown,
    initDropdownClick: initDropdownClick,
    openPopup: openPopup,
    closePopup: closePopup,
    bindAllPopupTriggers: bindAllPopupTriggers,
    injectAllStyles: injectStyles,
  };
})(window);
