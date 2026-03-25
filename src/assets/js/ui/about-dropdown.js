/**
 * about-dropdown.js — About Dropdown (L2)
 *
 * L2:  公司简介 / 工厂实力 / 资质认证
 * CSS prefix:  abt-dropdown-* / abt-popup-*
 */

(function (global) {
  "use strict";

  /* ───────────────────────── DATA ───────────────────────── */

  var ITEMS = [
    { key: "nav_about_profile", icon: "apartment", href: "/about/#profile" },
    { key: "nav_about_factory", icon: "factory", href: "/about/#factory" },
    { key: "nav_about_cert", icon: "verified", href: "/about/#cert" },
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
    // Shared base styles (trigger, wrap, panel, card, item, icon, label, chevron, separator, popup)
    if (window.DropdownBaseStyles) window.DropdownBaseStyles.inject();
    // No unique overrides for about dropdown
  }

  /* ───────────────────────── BUILDERS ───────────────────────── */

  function buildDropdownItem(item, showSep) {
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
    if (showSep) row += '<div class="abt-dropdown-separator"></div>';
    return row;
  }

  function renderDropdown(cfg) {
    var items = ITEMS.map(function (item, idx) {
      return buildDropdownItem(item, idx < ITEMS.length - 1);
    }).join("\n");

    return (
      '<div class="abt-dropdown-wrap' +
      (isTouch() ? " touch-device" : "") +
      '">' +
      '<a href="' +
      esc(cfg.href) +
      '"' +
      ' class="' +
      esc(cfg.activeClass || "") +
      ' abt-dropdown-trigger"' +
      ' data-abt-trigger-label="' +
      esc(cfg.labelKey) +
      '">' +
      '<span data-i18n="' +
      esc(cfg.labelKey) +
      '">' +
      esc(cfg.labelKey) +
      "</span>" +
      '<span class="material-symbols-outlined abt-dropdown-arrow">expand_more</span>' +
      "</a>" +
      '<div class="abt-dropdown-panel"><div class="abt-dropdown-card">' +
      items +
      "</div></div>" +
      "</div>"
    );
  }

  /* ───────────────────────── INTERACTION ───────────────────────── */

  function initDropdownClick() {
    document.addEventListener("click", function () {
      document.querySelectorAll(".abt-dropdown-wrap.is-open").forEach(function (d) {
        d.classList.remove("is-open");
      });
    });
    document.querySelectorAll(".abt-dropdown-trigger").forEach(function (t) {
      t.addEventListener("click", function (e) {
        if (window.innerWidth <= 720) return;
        e.preventDefault();
        e.stopPropagation();
        t.closest(".abt-dropdown-wrap").classList.toggle("is-open");
      });
    });
  }

  /* ───────────────────────── MOBILE POPUP ───────────────────────── */

  function openPopup(_href) {
    closePopup();
    var overlay = document.createElement("div");
    overlay.className = "abt-popup-overlay";
    var panel = document.createElement("div");
    panel.className = "abt-popup-panel";

    var items = ITEMS.map(function (item) {
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
    }).join("\n");

    panel.innerHTML = '<div class="abt-popup-handle"></div>' + items;

    if (global.translationManager) {
      panel.querySelectorAll("[data-i18n]").forEach(function (el) {
        var val = global.translationManager.translate(el.getAttribute("data-i18n"));
        if (val && val !== el.getAttribute("data-i18n")) el.textContent = val;
      });
    }

    overlay.onclick = closePopup;
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    panel.querySelectorAll(".abt-popup-item").forEach(function (item) {
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
    document.querySelectorAll(".abt-popup-overlay,.abt-popup-panel").forEach(function (el) {
      el.parentNode && el.parentNode.removeChild(el);
    });
  }

  function bindAllPopupTriggers() {
    document.querySelectorAll("[data-abt-popup]").forEach(function (el) {
      if (el._abtPopupBound) return;
      el._abtPopupBound = true;
      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openPopup(el.getAttribute("data-abt-popup-href") || el.getAttribute("href") || "/about/");
      });
    });
  }

  document.addEventListener("spa:load", closePopup);

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.AboutDropdown = {
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
