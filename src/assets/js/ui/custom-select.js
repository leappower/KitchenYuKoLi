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
    if (key == null) key = evt + ":" + (++_spaRegs.__k || (_spaRegs.__k = 1));
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
      "p-2.5": 1,
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
      var _wR = this.wrap.getBoundingClientRect();
      var _tR = this.trigger.getBoundingClientRect();
      // Compare with nearby input if any
      var siblingInput = this.wrap.parentNode.querySelector("input");
      if (siblingInput) {
        var _iR = siblingInput.getBoundingClientRect();
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
        '<input type="text" class="cs-search" placeholder="' +
        window.uiText("search_placeholder", "Search...") +
        '">' +
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
            noRes.textContent =
              typeof window.t === "function" ? window.uiText("no_matching_results", "无匹配结果") : "无匹配结果";
            panel.appendChild(noRes);
          }
          noRes.style.display = "";
        } else if (noRes) {
          noRes.style.display = "none";
        }
      });
    }

    // Bind item click
    var _self = this;
    panel.addEventListener("click", function (e) {
      var item = e.target.closest(".cs-item");
      if (!item || item.classList.contains("cs-item-disabled")) return;
      _self._selectItem(item);
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
        '<input type="text" class="cs-popup-search" placeholder="' +
        window.uiText("search_placeholder", "Search...") +
        '">' +
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
            noRes.textContent =
              typeof window.t === "function" ? window.uiText("no_matching_results", "无匹配结果") : "无匹配结果";
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
   *  languageChanged — update any visible "no results" text
   * ──────────────────────────────────────────────────────────────── */
  _spaOn(
    document,
    "languageChanged",
    function () {
      var noResEls = document.querySelectorAll(".cs-no-results");
      noResEls.forEach(function (el) {
        el.textContent =
          typeof window.t === "function" ? window.uiText("no_matching_results", "无匹配结果") : "无匹配结果";
      });
    },
    "langChanged:noResults"
  );

  /* ────────────────────────────────────────────────────────────────
   *  EXPORT
   * ──────────────────────────────────────────────────────────────── */

  global.CustomSelect = CustomSelect;
})(window);
