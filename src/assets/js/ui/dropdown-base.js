/**
 * dropdown-base.js — Shared dropdown infrastructure (factory pattern)
 *
 * Provides common utilities (_spaOn, esc, isTouch) and a createModule()
 * factory that generates the interaction layer (bindTriggers, initDropdownClick,
 * openPopup, closePopup, bindAllPopupTriggers) for each dropdown module.
 *
 * Must be loaded BEFORE any dropdown module that uses it.
 *
 * Consumed by: products-dropdown.js, applications-dropdown.js,
 *              support-dropdown.js, about-dropdown.js
 */

(function (global) {
  "use strict";

  /* ───────────────────────── SHARED UTILITIES ───────────────────────── */

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  function esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function isTouch() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  /* ───────────────────────── FACTORY ───────────────────────── */

  /**
   * Create a dropdown module with standard interaction behaviour.
   *
   * @param {Object} cfg
   * @param {string} cfg.prefix          — CSS prefix: "prod" | "app" | "sup" | "abt"
   * @param {Function} cfg.getItems       — () => Array<{key, icon, href, emoji?}>
   * @param {Function} cfg.injectStyles   — injects module-specific CSS overrides
   * @param {Function} cfg.renderDropdown — (cfg) => HTML string for desktop/tablet card
   * @param {Function} cfg.buildPopupContent — (items, parentHref) => HTML string for mobile popup items
   * @param {Function} [cfg.initDropdownClickOverride] — custom initDropdownClick (about's SPA nav)
   * @param {string} [cfg.defaultHref]   — default fallback href for popup triggers
   * @param {Function} [cfg.extraKeys]   — () => Object with extra public API keys (e.g. EXTRAS)
   */
  function createModule(cfg) {
    var prefix = cfg.prefix;
    var wrapClass = prefix + "-dropdown-wrap";
    var triggerClass = prefix + "-dropdown-trigger";
    var overlayClass = prefix + "-popup-overlay";
    var panelClass = prefix + "-popup-panel";
    var popupItemClass = prefix + "-popup-item";
    var boundFlag = "_" + prefix + "DropdownBound";
    var popupBoundFlag = "_" + prefix + "PopupBound";
    var defaultHref =
      cfg.defaultHref ||
      "/" + prefix.replace("prod", "products").replace("sup", "support").replace("abt", "about") + "/";

    var _docClickBound = false;

    /* ── buildItem helper (shared) ── */
    function _buildItem(sub, parentHref) {
      var itemHref = sub.href || parentHref;
      var chevron = '<span class="material-symbols-outlined ' + prefix + '-dropdown-chevron">chevron_right</span>';
      var emojiHtml = sub.emoji ? '<span class="' + prefix + '-dropdown-emoji">' + sub.emoji + "</span>" : "";
      return (
        '<a href="' +
        esc(itemHref) +
        '" class="' +
        prefix +
        '-dropdown-item">' +
        '<span class="' +
        prefix +
        '-dropdown-icon">' +
        '<span class="material-symbols-outlined">' +
        esc(sub.icon) +
        "</span>" +
        "</span>" +
        '<span class="' +
        prefix +
        '-dropdown-label" data-i18n="' +
        esc(sub.key) +
        '">' +
        esc(sub.key) +
        "</span>" +
        emojiHtml +
        chevron +
        "</a>"
      );
    }

    function _buildSeparator() {
      return '<div class="' + prefix + '-dropdown-separator"></div>';
    }

    /* ── Wrap HTML builder ── */
    function _wrapDropdown(innerHtml, cfg) {
      return (
        '<div class="' +
        wrapClass +
        (isTouch() ? " touch-device" : "") +
        '">' +
        '<a class="' +
        esc(cfg.activeClass || "") +
        " " +
        triggerClass +
        '"' +
        ' href="' +
        esc(cfg.href || "#") +
        '"' +
        " data-" +
        prefix +
        '-trigger-label="' +
        esc(cfg.labelKey || cfg.label) +
        '">' +
        '<span data-i18n="' +
        esc(cfg.labelKey || cfg.label) +
        '">' +
        esc(cfg.label || cfg.labelKey) +
        "</span>" +
        '<span class="material-symbols-outlined ' +
        prefix +
        '-dropdown-arrow">expand_more</span>' +
        "</a>" +
        '<div class="' +
        prefix +
        '-dropdown-panel"><div class="' +
        prefix +
        '-dropdown-card">' +
        innerHtml +
        "</div></div>" +
        "</div>"
      );
    }

    /* ── INTERACTION ── */

    function bindTriggers() {
      document.querySelectorAll("." + triggerClass).forEach(function (t) {
        if (t[boundFlag]) return;
        t[boundFlag] = true;
        t.addEventListener("click", function (e) {
          if (window.innerWidth <= 720) return;
          /* Touch devices: toggle dropdown & prevent navigation.
           * Non-touch devices: let click propagate to SPA router (hover handles dropdown). */
          if (isTouch()) {
            e.preventDefault();
            e.stopPropagation();
            t.closest("." + wrapClass).classList.toggle("is-open");
          }
          /* Non-touch: do nothing — hover already opened the dropdown,
           * and the click should navigate to the overview page via SPA router. */
        });
      });
    }

    function initDropdownClick() {
      if (!_docClickBound) {
        _docClickBound = true;
        document.addEventListener("click", function () {
          document.querySelectorAll("." + wrapClass + ".is-open").forEach(function (d) {
            d.classList.remove("is-open");
          });
        });
      }
      bindTriggers();
    }

    /* ── MOBILE POPUP ── */

    function openPopup(href) {
      closePopup();

      var overlay = document.createElement("div");
      overlay.className = overlayClass;

      var panel = document.createElement("div");
      panel.className = panelClass;

      var handle = '<div class="' + prefix + '-popup-handle"></div>';
      var items = cfg.getItems();
      var content = cfg.buildPopupContent ? cfg.buildPopupContent(items, href || defaultHref) : "";

      panel.innerHTML = handle + content;

      overlay.onclick = closePopup;
      document.body.appendChild(overlay);
      document.body.appendChild(panel);

      // Translate popup items immediately after DOM insertion
      if (window.translationManager) {
        panel.querySelectorAll("[data-i18n]").forEach(function (el) {
          var key = el.getAttribute("data-i18n");
          var translated = window.translationManager.translate(key);
          if (translated && translated !== key) {
            el.textContent = translated;
          }
        });
      }

      // Bind close on popup item click
      var popupItems = panel.querySelectorAll("." + popupItemClass);
      for (var k = 0; k < popupItems.length; k++) {
        popupItems[k].addEventListener("click", function () {
          closePopup();
          // Navigate 由全局 click handler (spa-router.js) 统一处理
        });
      }

      requestAnimationFrame(function () {
        panel.classList.add("is-open");
        navigator.vibrate && navigator.vibrate(12);
      });
    }

    function closePopup() {
      document.querySelectorAll("." + overlayClass + ",." + panelClass).forEach(function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      });
    }

    function bindAllPopupTriggers() {
      var triggers = document.querySelectorAll("[data-" + prefix + "-popup]");
      for (var i = 0; i < triggers.length; i++) {
        var el = triggers[i];
        if (el[popupBoundFlag]) continue;
        el[popupBoundFlag] = true;
        el.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var triggerHref = el.getAttribute("data-" + prefix + "-popup-href") || el.getAttribute("href") || defaultHref;
          openPopup(triggerHref);
        });
      }
    }

    /* ── KEYBOARD NAVIGATION ── */
    function _bindKeyboardNav() {
      document.addEventListener("keydown", function (e) {
        var key = e.key;

        // Escape: close any open dropdown or popup
        if (key === "Escape") {
          var openDropdown = document.querySelector("." + wrapClass + ".is-open");
          if (openDropdown) {
            openDropdown.classList.remove("is-open");
            // Move focus back to trigger
            var trigger = openDropdown.querySelector("." + triggerClass);
            if (trigger) trigger.focus();
            return;
          }
          // Also close mobile popup if open
          var openPanel = document.querySelector("." + panelClass + ".is-open");
          if (openPanel) {
            closePopup();
            return;
          }
        }

        // Tab: close dropdown when focus moves away
        if (key === "Tab") {
          var activeEl = document.activeElement;
          if (activeEl) {
            var openWrap = activeEl.closest("." + wrapClass);
            if (!openWrap) {
              document.querySelectorAll("." + wrapClass + ".is-open").forEach(function (d) {
                d.classList.remove("is-open");
              });
            }
          }
        }
      });
    }

    /* ── SPA CLEANUP ── */
    _spaOn(
      document,
      "spa:load",
      function () {
        closePopup();
        _bindKeyboardNav();
      },
      "spa:load:closePopup:" + prefix
    );

    // Also bind keyboard nav on first call
    _bindKeyboardNav();

    /* ── PUBLIC API ── */
    var api = {
      renderPC: cfg.renderDropdown,
      renderTablet: cfg.renderDropdown,
      initDropdownClick: cfg.initDropdownClickOverride
        ? function () {
            cfg.initDropdownClickOverride({ initDropdownClick: initDropdownClick });
          }
        : initDropdownClick,
      openPopup: openPopup,
      closePopup: closePopup,
      bindAllPopupTriggers: bindAllPopupTriggers,
      injectAllStyles: cfg.injectStyles,
      SUBSERIES: cfg.getItems(),
    };

    // Merge any extra public keys
    if (cfg.extraKeys) {
      var extra = cfg.extraKeys();
      for (var key in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, key)) api[key] = extra[key];
      }
    }

    return api;
  }

  /* ───────────────────────── PUBLIC API ───────────────────────── */

  global.DropdownBase = {
    create: createModule,
    esc: esc,
    isTouch: isTouch,
    _spaOn: _spaOn,
  };
})(window);
