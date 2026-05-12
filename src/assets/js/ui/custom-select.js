/**
 * custom-select.js - Universal Custom Select Component
 *
 * Replaces native <select> elements with a styled custom dropdown.
 * - PC/Tablet: floating dropdown panel (above/below trigger)
 * - Mobile (≤720px): iOS-style bottom sheet popup
 * - Supports: placeholder, searchable, disabled, optgroup, data-i18n
 * - Fully compatible with existing form-interactions.js validation
 * - Preserves native <select> as hidden source of truth (.value, .selectedIndex)
 * - Dark mode via class-based toggle
 *
 * Usage:
 *   <select data-custom-select id="my-field" required>
 *     <option value="">请选择</option>
 *     <option value="TH">🇹🇭 泰国</option>
 *   </select>
 *
 * Options (via data attributes):
 *   data-custom-select        - auto-init on DOMContentLoaded
 *   data-custom-search="true" - enable search filter in dropdown
 *   data-placeholder          - override placeholder text
 */

(function (global) {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  /* ────────────────────────────────────────────────────────────────
   *  CONFIG
   * ──────────────────────────────────────────────────────────────── */

  var MOBILE_BREAKPOINT = 720;
  var STYLE_ID = "custom-select-styles";
  var ATTR = "data-custom-select";
  var OPEN_CLASS = "cs-is-open";
  var ACTIVE_CLASS = "cs-item-active";
  var HOVER_CLASS = "cs-item-hover";
  var DISABLED_CLASS = "cs-disabled";

  /* ────────────────────────────────────────────────────────────────
   *  HELPERS
   * ──────────────────────────────────────────────────────────────── */

  function esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  /* ────────────────────────────────────────────────────────────────
   *  CSS INJECTION (idempotent)
   * ──────────────────────────────────────────────────────────────── */

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var css = [
      /* ─── Trigger (the visible button) ─── */
      ".cs-trigger {",
      "  display: flex; align-items: center; justify-content: space-between;",
      "  width: 100%; cursor: pointer; user-select: none;",
      "  -webkit-tap-highlight-color: transparent;",
      "  position: relative;",
      "}",
      ".cs-trigger-text {",
      "  flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
      "}",
      ".cs-trigger-text.cs-placeholder {",
      "  color: #94a3b8;",
      "}",
      "html.dark .cs-trigger-text.cs-placeholder {",
      "  color: #64748b;",
      "}",
      ".cs-trigger-chevron {",
      "  font-size: 20px; color: #94a3b8; flex-shrink: 0;",
      "  transition: transform .25s cubic-bezier(.4,0,.2,1);",
      "  margin-left: 4px;",
      "}",
      "html.dark .cs-trigger-chevron { color: #64748b; }",
      ".cs-is-open .cs-trigger-chevron,",
      ".cs-trigger-wrap:hover .cs-trigger-chevron {",
      "  transform: rotate(180deg);",
      "}",

      /* ─── Wrapper ─── */
      ".cs-trigger-wrap { position: relative; width: 100%; }",
      ".cs-trigger-wrap" + "." + DISABLED_CLASS + " .cs-trigger {",
      "  cursor: not-allowed; opacity: .5; pointer-events: none;",
      "}",

      /* ─── Floating Panel (PC/Tablet) - uses position:fixed to avoid overflow clipping ─── */
      ".cs-panel {",
      "  position: fixed;",
      "  background: rgba(248,250,252,1);",
      "  border: .5px solid rgba(0,0,0,.08);",
      "  border-radius: 12px; padding: 4px;",
      "  box-shadow: 0 0 0 .5px rgba(0,0,0,.04), 0 8px 32px rgba(0,0,0,.10), 0 2px 8px rgba(0,0,0,.06);",
      "  z-index: 3000; max-height: 260px; overflow-y: auto;",
      "  opacity: 0; visibility: hidden; pointer-events: none;",
      "  transform: translateY(-4px) scale(.98); transform-origin: top center;",
      "  transition: opacity .15s ease, transform .2s cubic-bezier(.32,.72,0,1), visibility 0s .15s;",
      "}",
      "html.dark .cs-panel {",
      "  background: rgba(30,41,59,1); border-color: rgba(255,255,255,.10);",
      "  box-shadow: 0 0 0 .5px rgba(255,255,255,.06), 0 8px 32px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.3);",
      "}",
      ".cs-is-open .cs-panel,.cs-panel.cs-is-open {",
      "  opacity: 1; visibility: visible; pointer-events: auto;",
      "  transform: translateY(0) scale(1);",
      "  transition: opacity .15s ease, transform .25s cubic-bezier(.32,.72,0,1), visibility 0s 0s;",
      "}",
      ".cs-panel-below { transform-origin: top center; }",
      ".cs-panel-above { transform-origin: bottom center; }",

      /* ─── Items ─── */
      ".cs-item {",
      "  display: flex; align-items: center; gap: 8px; padding: 10px 12px;",
      "  font-size: 14px; font-weight: 400; color: #1e293b; cursor: pointer;",
      "  border-radius: 8px; transition: background .1s ease;",
      "}",
      "html.dark .cs-item { color: #e2e8f0; }",
      ".cs-item:hover, .cs-item" + "." + HOVER_CLASS + " { background: rgba(236,91,19,.06); }",
      ".cs-item:active { background: rgba(236,91,19,.12); }",
      "html.dark .cs-item:hover, html.dark .cs-item" + "." + HOVER_CLASS + " { background: rgba(236,91,19,.10); }",
      ".cs-item" + "." + ACTIVE_CLASS + " {",
      "  background: rgba(236,91,19,.08); color: #ec5b13; font-weight: 600;",
      "}",
      "html.dark .cs-item" + "." + ACTIVE_CLASS + " { background: rgba(236,91,19,.14); color: #f97316; }",
      ".cs-item.cs-item-disabled {",
      "  opacity: .4; pointer-events: none;",
      "}",
      ".cs-check {",
      "  margin-left: auto; font-size: 18px; color: #ec5b13; opacity: 0; flex-shrink: 0;",
      "  transition: opacity .15s ease;",
      "}",
      "html.dark .cs-check { color: #f97316; }",
      ".cs-item" + "." + ACTIVE_CLASS + " .cs-check { opacity: 1; }",

      /* ─── Optgroup ─── */
      ".cs-group-label {",
      "  padding: 10px 12px 4px; font-size: 11px; font-weight: 600; letter-spacing: .03em;",
      "  color: #64748b; pointer-events: none;",
      "  border-top: 1px solid rgba(0,0,0,.06); margin-top: 2px;",
      "}",
      ".cs-group-label:first-child { border-top: none; margin-top: 0; }",
      "html.dark .cs-group-label { color: #94a3b8; border-top-color: rgba(255,255,255,.08); }",
      ".cs-group-items .cs-item { padding-left: 20px; font-size: 13px; }",

      /* ─── Search ─── */
      ".cs-search-wrap {",
      "  padding: 4px 4px 0; position: sticky; top: 0; z-index: 1;",
      "  background: inherit; border-radius: 8px 8px 0 0;",
      "}",
      ".cs-search {",
      "  width: 100%; padding: 8px 10px 8px 32px; font-size: 13px;",
      "  border: .5px solid rgba(0,0,0,.06); border-radius: 8px;",
      "  background: rgba(255,255,255,.8); color: #1e293b; outline: none;",
      "}",
      ".cs-search:focus { border-color: #ec5b13; box-shadow: 0 0 0 2px rgba(236,91,19,.15); }",
      "html.dark .cs-search {",
      "  background: rgba(51,65,85,.8); color: #e2e8f0; border-color: rgba(255,255,255,.08);",
      "}",
      "html.dark .cs-search:focus { border-color: #f97316; box-shadow: 0 0 0 2px rgba(249,115,22,.15); }",
      ".cs-search-icon {",
      "  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);",
      "  font-size: 16px; color: #94a3b8; pointer-events: none;",
      "}",
      "html.dark .cs-search-icon { color: #64748b; }",
      ".cs-search-wrap .cs-search {",
      "  background: rgba(248,250,252,.95);",
      "}",
      "html.dark .cs-search-wrap .cs-search {",
      "  background: rgba(30,41,59,.95);",
      "}",

      /* ─── No Results ─── */
      ".cs-no-results {",
      "  padding: 16px; text-align: center; font-size: 13px; color: #94a3b8;",
      "}",
      "html.dark .cs-no-results { color: #64748b; }",

      /* ─── Mobile - hide float panel ─── */
      "@media (max-width: " + MOBILE_BREAKPOINT + "px) {",
      "  .cs-panel { display: none !important; }",
      "}",

      /* ─── Mobile Popup (bottom sheet) ─── */
      ".cs-popup-overlay {",
      "  position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 998;",
      "  animation: cs-fade-in .2s ease;",
      "}",
      ".cs-popup-panel {",
      "  position: fixed; left: 8px; right: 8px; bottom: 0;",
      "  background: rgba(248,250,252,.98);",
      "  border-radius: 14px 14px 0 0; transform: translateY(100%);",
      "  transition: transform .35s cubic-bezier(.32,.72,0,1);",
      "  z-index: 999; padding: 8px 4px calc(16px + env(safe-area-inset-bottom)) 4px;",
      "  box-shadow: 0 -2px 20px rgba(0,0,0,.1);",
      "}",
      ".cs-popup-panel.cs-popup-open { transform: translateY(0); }",
      "html.dark .cs-popup-panel {",
      "  background: rgba(30,41,59,.98); box-shadow: 0 -2px 20px rgba(0,0,0,.4);",
      "}",
      ".cs-popup-handle {",
      "  width: 36px; height: 5px; border-radius: 3px;",
      "  background: rgba(100,116,139,.25); margin: 0 auto 8px;",
      "}",
      "html.dark .cs-popup-handle { background: rgba(100,116,139,.35); }",
      ".cs-popup-title {",
      "  padding: 4px 12px 8px; font-size: 15px; font-weight: 600; color: #1e293b;",
      "}",
      "html.dark .cs-popup-title { color: #e2e8f0; }",
      /* ─── Mobile Popup Optgroup ─── */
      ".cs-popup-panel .cs-group-label {",
      "  padding: 10px 12px 4px; font-size: 11px; font-weight: 600; letter-spacing: .03em;",
      "  color: #64748b; pointer-events: none;",
      "  border-top: 1px solid rgba(0,0,0,.06); margin-top: 2px;",
      "}",
      ".cs-popup-panel .cs-group-label:first-child { border-top: none; margin-top: 0; }",
      "html.dark .cs-popup-panel .cs-group-label { color: #94a3b8; border-top-color: rgba(255,255,255,.08); }",
      ".cs-popup-panel .cs-group-items .cs-item { padding-left: 20px; font-size: 13px; }",
      ".cs-popup-list {",
      "  max-height: 50vh; overflow-y: auto; -webkit-overflow-scrolling: touch;",
      "}",
      ".cs-popup-search-wrap {",
      "  padding: 0 4px 8px; position: relative;",
      "}",
      ".cs-popup-search {",
      "  width: 100%; padding: 10px 10px 10px 36px; font-size: 15px;",
      "  border: .5px solid rgba(0,0,0,.06); border-radius: 10px;",
      "  background: rgba(255,255,255,.8); color: #1e293b; outline: none;",
      "}",
      ".cs-popup-search:focus { border-color: #ec5b13; box-shadow: 0 0 0 2px rgba(236,91,19,.15); }",
      "html.dark .cs-popup-search {",
      "  background: rgba(51,65,85,.8); color: #e2e8f0; border-color: rgba(255,255,255,.08);",
      "}",
      "html.dark .cs-popup-search:focus { border-color: #f97316; box-shadow: 0 0 0 2px rgba(249,115,22,.15); }",
      ".cs-popup-search-icon {",
      "  position: absolute; left: 16px; top: 50%; transform: translateY(-50%);",
      "  font-size: 18px; color: #94a3b8; pointer-events: none;",
      "}",
      "html.dark .cs-popup-search-icon { color: #64748b; }",

      /* shared keyframes */
      "@keyframes cs-fade-in { from { opacity: 0; } to { opacity: 1; } }",
    ].join("\n");

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ────────────────────────────────────────────────────────────────
   *  SINGLE INSTANCE
   * ──────────────────────────────────────────────────────────────── */

  function CustomSelectInstance(selectEl) {
    this.select = selectEl;
    this.wrap = null;
    this.trigger = null;
    this.panel = null;
    this.searchable = selectEl.getAttribute("data-custom-search") === "true";
    this.placeholder = selectEl.getAttribute("data-placeholder") || "";
    this._popupOverlay = null;
    this._popupPanel = null;
    this._bound = false;
  }

  /* Read options from native <select> */
  CustomSelectInstance.prototype.getOptions = function () {
    var opts = [];
    var groups = [];
    for (var i = 0; i < this.select.options.length; i++) {
      var o = this.select.options[i];
      opts.push({
        value: o.value,
        text: o.text,
        selected: o.selected,
        disabled: o.disabled,
        i18n: o.getAttribute("data-i18n") || "",
      });
    }
    // optgroups
    if (this.select.children) {
      for (var g = 0; g < this.select.children.length; g++) {
        var child = this.select.children[g];
        if (child.tagName && child.tagName.toLowerCase() === "optgroup") {
          var label = child.getAttribute("label") || "";
          var groupOpts = [];
          var groupChildren = child.children || child.childNodes;
          for (var j = 0; j < groupChildren.length; j++) {
            var go = groupChildren[j];
            if (!go || (go.tagName && go.tagName.toLowerCase() !== "option")) continue;
            groupOpts.push({
              value: go.value,
              text: go.text,
              selected: go.selected,
              disabled: go.disabled,
              i18n: go.getAttribute("data-i18n") || "",
            });
          }
          groups.push({ label: label, options: groupOpts });
        }
      }
    }
    return { options: opts, groups: groups };
  };

  /* Get display text for current value */
  CustomSelectInstance.prototype.getDisplayText = function () {
    if (!this.select.value) return this.placeholder || this.getOptions().options[0].text || "";
    var opt = this.select.options[this.select.selectedIndex];
    return opt ? opt.text : "";
  };

  /* Render the trigger + hidden native select + float panel */
  CustomSelectInstance.prototype.render = function () {
    if (this.wrap) return; // already rendered

    var selectEl = this.select;

    // ★ Read computed styles BEFORE hiding the native select
    var selectStyle = window.getComputedStyle(selectEl);
    var inheritProps = [
      "height",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "borderRadius",
      "fontSize",
      "fontWeight",
      "letterSpacing",
      "lineHeight",
    ];
    var computedStyle = {};
    for (var p = 0; p < inheritProps.length; p++) {
      var cssProp = inheritProps[p].replace(/([A-Z])/g, "-$1").toLowerCase();
      computedStyle[inheritProps[p]] = selectStyle.getPropertyValue(cssProp);
    }

    // Copy Tailwind classes from select to trigger (before mutating)
    // Use indexOf with the class suffix portion, so dark:text-white matches text-white etc.
    var classList = selectEl.classList;
    var SKIP = {
      "appearance-none": 1,
      "w-full": 1,
      "h-14": 1,
      "h-12": 1,
      "p-3": 1,
      "p-2\.5": 1,
      "px-4": 1,
      "px-3": 1,
      "py-3": 1,
    };
    var bgClasses = [];
    for (var c = 0; c < classList.length; c++) {
      var cls = classList[c];
      if (SKIP[cls]) continue;
      // Strip responsive/state prefixes to get the raw Tailwind token
      var token = cls.replace(/^(sm:|md:|lg:|xl:|dark:|focus:|hover:|active:)+/, "");
      // Match visual-property prefixes (everything except layout/spacing)
      var visPrefixes = ["border", "bg", "rounded", "text", "outline", "transition", "shadow", "ring"];
      var matched = false;
      for (var v = 0; v < visPrefixes.length; v++) {
        if (token.indexOf(visPrefixes[v]) === 0) {
          matched = true;
          break;
        }
      }
      if (matched) bgClasses.push(cls);
    }

    // ★ NOW hide native select (after reading styles)
    selectEl.style.cssText =
      "position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;clip:rect(0,0,0,0);";

    // Build trigger
    var displayText = this.getDisplayText();
    var isPlaceholder = !selectEl.value;

    this.wrap = document.createElement("div");
    this.wrap.className = "cs-trigger-wrap" + (selectEl.disabled ? " " + DISABLED_CLASS : "");
    this.wrap.style.width = "100%";

    this.trigger = document.createElement("div");
    this.trigger.className = "cs-trigger";

    // Apply pre-read computed styles (use array order, not for-in)
    for (var s = 0; s < inheritProps.length; s++) {
      var val = computedStyle[inheritProps[s]];
      if (val) this.trigger.style[inheritProps[s]] = val;
    }

    // Apply Tailwind classes
    if (bgClasses.length > 0) {
      this.trigger.classList.add.apply(this.trigger.classList, bgClasses);
    }

    // Ensure trigger has visible border (some selects only have border-color class
    // but no border-width - Tailwind reset sets border-width: 0)
    var hasBorderWidth =
      selectEl.classList.contains("border") ||
      selectEl.classList.contains("border-2") ||
      selectEl.classList.contains("border-y") ||
      selectEl.classList.contains("border-t") ||
      selectEl.classList.contains("border-b");
    if (!hasBorderWidth) {
      this.trigger.style.borderWidth = "1px";
      this.trigger.style.borderStyle = "solid";
    }
    this.trigger.setAttribute("tabindex", selectEl.disabled ? "-1" : "0");
    this.trigger.setAttribute("role", "combobox");
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.setAttribute("aria-haspopup", "listbox");
    // Copy relevant ARIA attributes
    if (selectEl.id) this.trigger.setAttribute("aria-labelledby", selectEl.id);

    this.trigger.innerHTML =
      '<span class="cs-trigger-text' +
      (isPlaceholder ? " cs-placeholder" : "") +
      '">' +
      esc(displayText) +
      "</span>" +
      '<span class="material-symbols-outlined cs-trigger-chevron">expand_more</span>';

    // Build float panel
    this.panel = this._buildPanel();

    // Insert into DOM
    selectEl.parentNode.insertBefore(this.wrap, selectEl);
    this.wrap.appendChild(this.trigger);
    this.wrap.appendChild(selectEl);
    // Panel goes to <body> to avoid being affected by ancestor transforms
    // (e.g. .animate-hidden translate3d) which break position:fixed
    document.body.appendChild(this.panel);

    // Debug: log sizing after DOM insertion
    if (window.__CS_DEBUG) {
      var wR = this.wrap.getBoundingClientRect();
      var tR = this.trigger.getBoundingClientRect();
      // Compare with nearby input if any
      var siblingInput = this.wrap.parentNode.querySelector("input");
      if (siblingInput) {
        var iR = siblingInput.getBoundingClientRect();
      }
    }

    this._bindEvents();
  };

  /* Build the floating dropdown panel */
  CustomSelectInstance.prototype._buildPanel = function () {
    var data = this.getOptions();
    var panel = document.createElement("div");
    panel.className = "cs-panel cs-panel-below";
    panel.setAttribute("role", "listbox");

    var html = "";

    // Search box
    if (this.searchable) {
      html +=
        '<div class="cs-search-wrap" style="position:relative;">' +
        '<span class="material-symbols-outlined cs-search-icon">search</span>' +
        '<input type="text" class="cs-search" placeholder="搜索...">' +
        "</div>";
    }

    // Items
    html += this._buildItemsHTML(data);

    panel.innerHTML = html;

    // Bind search
    if (this.searchable) {
      var self = this;
      var searchInput = panel.querySelector(".cs-search");
      searchInput.addEventListener("input", function () {
        var q = this.value.trim().toLowerCase();
        var items = panel.querySelectorAll(".cs-item");
        var groups = panel.querySelectorAll(".cs-group-label");
        var hasVisible = false;
        for (var i = 0; i < items.length; i++) {
          var text = (items[i].getAttribute("data-text") || "").toLowerCase();
          var show = !q || text.indexOf(q) !== -1;
          items[i].style.display = show ? "" : "none";
          if (show) hasVisible = true;
        }
        // show/hide group labels
        for (var g = 0; g < groups.length; g++) {
          var wrapper = groups[g].nextElementSibling;
          var anyVisible = false;
          if (wrapper && wrapper.classList.contains("cs-group-items")) {
            var wrappedItems = wrapper.querySelectorAll(".cs-item");
            for (var w = 0; w < wrappedItems.length; w++) {
              if (wrappedItems[w].style.display !== "none") {
                anyVisible = true;
                break;
              }
            }
          }
          groups[g].style.display = anyVisible ? "" : "none";
        }
        // no results
        var noRes = panel.querySelector(".cs-no-results");
        if (!hasVisible && q) {
          if (!noRes) {
            noRes = document.createElement("div");
            noRes.className = "cs-no-results";
            noRes.textContent = "无匹配结果";
            panel.appendChild(noRes);
          }
          noRes.style.display = "";
        } else if (noRes) {
          noRes.style.display = "none";
        }
      });
    }

    // Bind item click
    var self = this;
    panel.addEventListener("click", function (e) {
      var item = e.target.closest(".cs-item");
      if (!item || item.classList.contains("cs-item-disabled")) return;
      self._selectItem(item);
    });

    return panel;
  };

  /* Build items HTML */
  CustomSelectInstance.prototype._buildItemsHTML = function (data) {
    var html = "";
    var hasGroups = data.groups && data.groups.length > 0;

    // Filter out placeholder options (value="") — shown as popup-title, not as item
    function withoutPlaceholder(opts) {
      return opts.filter(function (o) {
        return o.value !== "";
      });
    }

    if (hasGroups) {
      for (var g = 0; g < data.groups.length; g++) {
        html += '<div class="cs-group-label">' + esc(data.groups[g].label) + "</div>";
        html +=
          '<div class="cs-group-items">' +
          this._buildOptionItemsHTML(withoutPlaceholder(data.groups[g].options)) +
          "</div>";
      }
      // Also add non-grouped options
      if (data.options.length > 0) {
        // Check if options were already in groups
        var groupedValues = {};
        for (var gg = 0; gg < data.groups.length; gg++) {
          for (var oo = 0; oo < data.groups[gg].options.length; oo++) {
            groupedValues[data.groups[gg].options[oo].value] = true;
          }
        }
        var ungrouped = data.options.filter(function (o) {
          return !groupedValues[o.value] && o.value !== "";
        });
        if (ungrouped.length > 0) {
          html += this._buildOptionItemsHTML(ungrouped);
        }
      }
    } else {
      html += this._buildOptionItemsHTML(withoutPlaceholder(data.options));
    }

    return html;
  };

  CustomSelectInstance.prototype._buildOptionItemsHTML = function (options) {
    var html = "";
    for (var i = 0; i < options.length; i++) {
      var o = options[i];
      var active = o.selected ? " " + ACTIVE_CLASS : "";
      var disabled = o.disabled ? " cs-item-disabled" : "";
      var i18nAttr = o.i18n ? ' data-i18n="' + esc(o.i18n) + '"' : "";
      html +=
        '<div class="cs-item' +
        active +
        disabled +
        '"' +
        ' data-value="' +
        esc(o.value) +
        '"' +
        ' data-text="' +
        esc(o.text) +
        '"' +
        i18nAttr +
        ' role="option">' +
        "<span>" +
        esc(o.text) +
        "</span>" +
        '<span class="material-symbols-outlined cs-check">check</span>' +
        "</div>";
    }
    return html;
  };

  /* Select an item by its DOM element */
  CustomSelectInstance.prototype._selectItem = function (itemEl) {
    var value = itemEl.getAttribute("data-value");
    var text = itemEl.getAttribute("data-text");

    // Update native select
    this.select.value = value;
    // Trigger change event on native select for form handlers
    var evt = new Event("change", { bubbles: true });
    this.select.dispatchEvent(evt);

    // Update trigger text (may be null when using buildPanel without render)
    var isPlaceholder = !value;
    if (this.trigger) {
      var textEl = this.trigger.querySelector(".cs-trigger-text");
      if (textEl) {
        textEl.textContent = isPlaceholder ? this.placeholder || text : text;
        textEl.className = "cs-trigger-text" + (isPlaceholder ? " cs-placeholder" : "");
      }
    }

    // Update active state
    if (this.panel) {
      var items = this.panel.querySelectorAll(".cs-item");
      for (var i = 0; i < items.length; i++) {
        items[i].classList.remove(ACTIVE_CLASS);
      }
      itemEl.classList.add(ACTIVE_CLASS);
    }

    // Close
    this.close();
  };

  /* Open */
  CustomSelectInstance.prototype.open = function () {
    if (this.select.disabled) return;

    if (isMobile()) {
      this._openPopup();
    } else {
      this._openPanel();
    }
  };

  CustomSelectInstance.prototype._openPanel = function () {
    // Close others first
    CustomSelect.closeAll();

    this.wrap.classList.add(OPEN_CLASS);
    this.panel.classList.add(OPEN_CLASS);
    this.trigger.setAttribute("aria-expanded", "true");

    // Position panel using fixed coordinates from trigger rect (or override anchor)
    var anchor = this._positionAnchor || this.trigger;
    var rect = anchor.getBoundingClientRect();
    var panelWidth = rect.width;
    var gap = 6;
    var spaceBelow = window.innerHeight - rect.bottom;
    var spaceAbove = rect.top;
    var openAbove = spaceBelow < 280 && spaceAbove > spaceBelow;

    // Set position
    this.panel.style.left = rect.left + "px";
    this.panel.style.width = panelWidth + "px";

    if (openAbove) {
      this.panel.classList.remove("cs-panel-below");
      this.panel.classList.add("cs-panel-above");
      this.panel.style.top = "";
      this.panel.style.bottom = window.innerHeight - rect.top + gap + "px";
    } else {
      this.panel.classList.remove("cs-panel-above");
      this.panel.classList.add("cs-panel-below");
      this.panel.style.bottom = "";
      this.panel.style.top = rect.bottom + gap + "px";
    }

    // Bind scroll/resize reposition for this instance
    var self = this;
    this._onScrollResize = function () {
      if (!self.wrap.classList.contains(OPEN_CLASS)) {
        self._removeScrollResize();
        return;
      }
      var anchor = self._positionAnchor || self.trigger;
      var r = anchor.getBoundingClientRect();
      self.panel.style.left = r.left + "px";
      self.panel.style.width = r.width + "px";
      var sb = window.innerHeight - r.bottom;
      var sa = r.top;
      var above = sb < 280 && sa > sb;
      if (above) {
        self.panel.style.top = "";
        self.panel.style.bottom = window.innerHeight - r.top + gap + "px";
        self.panel.classList.remove("cs-panel-below");
        self.panel.classList.add("cs-panel-above");
      } else {
        self.panel.style.bottom = "";
        self.panel.style.top = r.bottom + gap + "px";
        self.panel.classList.remove("cs-panel-above");
        self.panel.classList.add("cs-panel-below");
      }
    };
    window.addEventListener("scroll", this._onScrollResize, true);
    window.addEventListener("resize", this._onScrollResize);

    // Focus search if available
    var searchInput = this.panel.querySelector(".cs-search");
    if (searchInput) {
      setTimeout(function () {
        searchInput.focus();
      }, 50);
    }
  };

  CustomSelectInstance.prototype._removeScrollResize = function () {
    if (this._onScrollResize) {
      window.removeEventListener("scroll", this._onScrollResize, true);
      window.removeEventListener("resize", this._onScrollResize);
      this._onScrollResize = null;
    }
  };

  CustomSelectInstance.prototype._openPopup = function () {
    this._closePopup();
    CustomSelect.closeAll();

    var data = this.getOptions();
    var placeholder = this.placeholder || this.getOptions().options[0].text || "";

    // Overlay
    this._popupOverlay = document.createElement("div");
    this._popupOverlay.className = "cs-popup-overlay";

    // Panel
    this._popupPanel = document.createElement("div");
    this._popupPanel.className = "cs-popup-panel";

    var html = '<div class="cs-popup-handle"></div>';

    // Title (trigger text or label)
    var labelEl = this.select.parentNode.querySelector("label");
    var titleText = labelEl ? labelEl.textContent.trim().replace(/\s*\*\s*$/, "") : placeholder;
    html += '<div class="cs-popup-title">' + esc(titleText) + "</div>";

    // Search
    if (this.searchable) {
      html +=
        '<div class="cs-popup-search-wrap">' +
        '<span class="material-symbols-outlined cs-popup-search-icon">search</span>' +
        '<input type="text" class="cs-popup-search" placeholder="搜索...">' +
        "</div>";
    }

    // Items
    html += '<div class="cs-popup-list">' + this._buildItemsHTML(data) + "</div>";

    this._popupPanel.innerHTML = html;

    // Insert
    document.body.appendChild(this._popupOverlay);
    document.body.appendChild(this._popupPanel);

    // Bind overlay close
    var self = this;
    this._popupOverlay.addEventListener("click", function () {
      self.close();
    });

    // Bind item click
    var popupItems = this._popupPanel.querySelectorAll(".cs-item");
    for (var i = 0; i < popupItems.length; i++) {
      popupItems[i].addEventListener("click", function () {
        self._selectItem(this);
        self._closePopup();
      });
    }

    // Bind search
    if (this.searchable) {
      var searchInput = this._popupPanel.querySelector(".cs-popup-search");
      searchInput.addEventListener("input", function () {
        var q = this.value.trim().toLowerCase();
        var items = self._popupPanel.querySelectorAll(".cs-item");
        var groupLabels = self._popupPanel.querySelectorAll(".cs-group-label");
        var hasVisible = false;
        for (var j = 0; j < items.length; j++) {
          var text = (items[j].getAttribute("data-text") || "").toLowerCase();
          var show = !q || text.indexOf(q) !== -1;
          items[j].style.display = show ? "" : "none";
          if (show) hasVisible = true;
        }
        // Hide group labels whose items are all filtered out
        for (var g = 0; g < groupLabels.length; g++) {
          var wrapper = groupLabels[g].nextElementSibling;
          var anyVisible = false;
          if (wrapper && wrapper.classList.contains("cs-group-items")) {
            var wrappedItems = wrapper.querySelectorAll(".cs-item");
            for (var w = 0; w < wrappedItems.length; w++) {
              if (wrappedItems[w].style.display !== "none") {
                anyVisible = true;
                break;
              }
            }
          }
          groupLabels[g].style.display = anyVisible ? "" : "none";
        }
        var noRes = self._popupPanel.querySelector(".cs-no-results");
        if (!hasVisible && q) {
          if (!noRes) {
            noRes = document.createElement("div");
            noRes.className = "cs-no-results";
            noRes.textContent = "无匹配结果";
            self._popupPanel.querySelector(".cs-popup-list").appendChild(noRes);
          }
          noRes.style.display = "";
        } else if (noRes) {
          noRes.style.display = "none";
        }
      });
      setTimeout(function () {
        searchInput.focus();
      }, 100);
    }

    // Animate open
    requestAnimationFrame(function () {
      if (self._popupPanel) {
        self._popupPanel.classList.add("cs-popup-open");
        if (navigator.vibrate) navigator.vibrate(10);
      }
    });
  };

  CustomSelectInstance.prototype._closePopup = function () {
    if (this._popupOverlay) {
      this._popupOverlay.parentNode && this._popupOverlay.parentNode.removeChild(this._popupOverlay);
      this._popupOverlay = null;
    }
    if (this._popupPanel) {
      this._popupPanel.parentNode && this._popupPanel.parentNode.removeChild(this._popupPanel);
      this._popupPanel = null;
    }
  };

  /* Close */
  CustomSelectInstance.prototype.close = function () {
    this.wrap && this.wrap.classList.remove(OPEN_CLASS);
    this.panel && this.panel.classList.remove(OPEN_CLASS);
    this.trigger && this.trigger.setAttribute("aria-expanded", "false");
    this._closePopup();
    this._removeScrollResize();
    // Reset inline positioning so it doesn't linger
    if (this.panel) {
      this.panel.style.left = "";
      this.panel.style.top = "";
      this.panel.style.bottom = "";
      this.panel.style.width = "";
    }
  };

  /* Bind events */
  CustomSelectInstance.prototype._bindEvents = function () {
    if (this._bound) return;
    this._bound = true;
    var self = this;

    // Trigger click
    this.trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (self.wrap.classList.contains(OPEN_CLASS)) {
        self.close();
      } else {
        self.open();
      }
    });

    // Keyboard
    this.trigger.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        self.open();
      } else if (e.key === "Escape") {
        self.close();
      }
    });
  };

  /* Refresh trigger text (e.g. after external value change) */
  CustomSelectInstance.prototype.refresh = function () {
    var text = this.getDisplayText();
    var isPlaceholder = !this.select.value;
    var textEl = this.trigger.querySelector(".cs-trigger-text");
    if (textEl) {
      textEl.textContent = text;
      textEl.className = "cs-trigger-text" + (isPlaceholder ? " cs-placeholder" : "");
    }
    // Refresh panel active state
    if (this.panel) {
      var items = this.panel.querySelectorAll(".cs-item");
      for (var i = 0; i < items.length; i++) {
        if (items[i].getAttribute("data-value") === this.select.value) {
          items[i].classList.add(ACTIVE_CLASS);
        } else {
          items[i].classList.remove(ACTIVE_CLASS);
        }
      }
    }
  };

  /* ────────────────────────────────────────────────────────────────
   *  STATIC API
   * ──────────────────────────────────────────────────────────────── */

  var instances = [];

  /* CustomSelect constructor (factory - delegates to Instance) */
  function CustomSelect(el) {
    return CustomSelect.init(el);
  }

  CustomSelect.closeAll = function () {
    for (var i = 0; i < instances.length; i++) {
      instances[i].close();
    }
  };

  /* Close all when clicking outside */
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".cs-trigger-wrap")) {
      CustomSelect.closeAll();
    }
  });

  /* Close on Escape */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") CustomSelect.closeAll();
  });

  /* Close on spa:load */
  _spaOn(
    document,
    "spa:load",
    function () {
      CustomSelect.closeAll();
    },
    "spa:load:closeAll"
  );

  /* Init all [data-custom-select] elements */
  CustomSelect.initAll = function (root) {
    injectStyles();
    root = root || document;
    var els = root.querySelectorAll("select[" + ATTR + "]");
    for (var i = 0; i < els.length; i++) {
      // Skip if already initialized
      if (els[i]._customSelectInstance) continue;
      // Skip lang-selector — managed manually by navigator.js (buildPanel)
      if (els[i].id === "lang-selector") continue;
      // Skip selects with no options (may be populated later by JS)
      if (els[i].options.length === 0 && els[i].children.length === 0) continue;
      var inst = new CustomSelectInstance(els[i]);
      inst.render();
      els[i]._customSelectInstance = inst;
      instances.push(inst);
    }
  };

  /* Init a single element and return the instance */
  CustomSelect.init = function (selectEl) {
    injectStyles();
    if (selectEl._customSelectInstance) return selectEl._customSelectInstance;
    if (selectEl.id === "lang-selector") return null; // managed by navigator.js
    var inst = new CustomSelectInstance(selectEl);
    inst.render();
    selectEl._customSelectInstance = inst;
    instances.push(inst);
    return inst;
  };

  /* Get instance by native select element */
  CustomSelect.getInstance = function (selectEl) {
    return selectEl._customSelectInstance || null;
  };

  /**
   * Lightweight panel factory — builds a dropdown panel without rendering trigger/wrap.
   * Useful for custom button-triggered selects (e.g. language switcher).
   * Returns { panel: HTMLElement, data: Object } — caller manages show/hide/position.
   */
  CustomSelect.buildPanel = function (selectEl) {
    injectStyles();
    var tempInst = new CustomSelectInstance(selectEl);
    var data = tempInst.getOptions();
    var panel = tempInst._buildPanel();
    return { panel: panel, data: data, inst: tempInst };
  };

  /* ────────────────────────────────────────────────────────────────
   *  AUTO-INIT on DOMContentLoaded
   * ──────────────────────────────────────────────────────────────── */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      CustomSelect.initAll();
    });
  } else {
    CustomSelect.initAll();
  }

  /* Re-init on spa:load (SPA navigation may inject new selects) */
  _spaOn(
    document,
    "spa:load",
    function () {
      CustomSelect.initAll();
    },
    "spa:load:initAll"
  );

  /* ────────────────────────────────────────────────────────────────
   *  EXPORT
   * ──────────────────────────────────────────────────────────────── */

  global.CustomSelect = CustomSelect;
})(window);
