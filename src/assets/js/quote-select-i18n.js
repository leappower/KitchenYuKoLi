/**
 * quote-select-i18n.js — Dynamic i18n for quote/contact page <select> options
 * Rebuilds country/restaurant-type/contact-channel option labels on language change.
 * Also marks <select> for custom-select to re-render.
 */
(function () {
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
   *  LABEL MAPS (value → i18n key)
   *  Each entry maps <option value> → i18n key
   * ──────────────────────────────────────────────────────────────── */

  var RESTAURANT_TYPE_LABELS = {
    "small-restaurant": "app_small_restaurant",
    "central-kitchen": "app_central_kitchen",
    "chain-restaurant": "app_chain_restaurant",
    "smart-canteen": "cases_industry_smart_canteen",
    "cloud-kitchen": "app_cloud_kitchen",
    takeaway: "quote_takeaway",
    "food-factory": "app_food_factory",
    other: "quote_other",
  };

  var CONTACT_CHANNEL_LABELS = {
    WhatsApp: "menu_lab_cta_whatsapp",
    LINE: "contact_channel_line",
    Zalo: "contact_channel_zalo",
    "Facebook Messenger": "contact_channel_messenger",
    Viber: "contact_channel_viber",
    Telegram: "contact_channel_telegram",
    WeChat: "contact_channel_wechat",
    "Phone Call": "contact_channel_phone",
    other: "quote_other",
  };

  /* Hardcoded defaults for channels — these are brand names, not real translations */
  var CHANNEL_DEFAULTS = {
    LINE: "LINE",
    Zalo: "Zalo",
    "Facebook Messenger": "Messenger",
    Viber: "Viber",
    Telegram: "Telegram",
    WeChat: "WeChat",
    "Phone Call": "Phone Call",
  };

  /* ────────────────────────────────────────────────────────────────
   *  TRANSLATION HELPERS
   * ──────────────────────────────────────────────────────────────── */

  function tr(key, fallback) {
    if (typeof window.t === "function") {
      var v = window.t(key);
      if (v && v !== key) return v;
    }
    if (typeof window.uiText === "function") {
      return window.uiText(key, fallback);
    }
    return fallback;
  }

  function getLabelText(value, labelMap, defaultMap) {
    var key = labelMap[value];
    if (key) {
      var result = tr(key, null);
      if (result) return result;
    }
    if (defaultMap && defaultMap[value]) return defaultMap[value];
    return value;
  }

  /* ────────────────────────────────────────────────────────────────
   *  REBUILD A SINGLE SELECT
   * ──────────────────────────────────────────────────────────────── */

  function rebuildSelect(selId, labelMap, placeholderKey, placeholderFallback) {
    var sel = document.getElementById(selId);
    if (!sel) return;

    var prevValue = sel.value;
    var html = [];

    // Placeholder option
    html.push(
      '<option value=""' +
        (prevValue === "" ? " selected" : "") +
        ' data-i18n="' +
        placeholderKey +
        '">' +
        tr(placeholderKey, placeholderFallback) +
        "</option>"
    );

    for (var i = 0; i < sel.options.length; i++) {
      var opt = sel.options[i];
      if (opt.value === "") continue; // skip placeholder
      var label = getLabelText(opt.value, labelMap, null);
      var selected = opt.value === prevValue ? " selected" : "";
      html.push('<option value="' + opt.value + '"' + selected + ">" + label + "</option>");
    }

    sel.innerHTML = html.join("");
    sel.value = prevValue;

    // Re-init custom-select instance
    reinitCustomSelect(sel);
  }

  function rebuildPlaceholderSelect(selId, placeholderKey, placeholderFallback) {
    var sel = document.getElementById(selId);
    if (!sel) return;

    var prevValue = sel.value;
    var prevIdx = sel.selectedIndex;

    // Only update the placeholder text, don't nuke all options
    var ph = sel.querySelector('option[value=""]');
    if (ph) {
      ph.textContent = tr(placeholderKey, placeholderFallback);
    }

    // Restore selection
    if (prevValue) sel.value = prevValue;

    reinitCustomSelect(sel);
  }

  function reinitCustomSelect(sel) {
    if (window.CustomSelect && typeof window.CustomSelect.init === "function") {
      try {
        if (sel.__csInstance) {
          var oldWrap = sel.parentElement;
          if (oldWrap && oldWrap.classList.contains("cs-trigger-wrap")) {
            oldWrap.parentNode.insertBefore(sel, oldWrap);
            oldWrap.parentNode.removeChild(oldWrap);
          }
          sel.__csInstance = null;
          sel.style.cssText = "";
        }
        window.CustomSelect.init(sel);
      } catch (e) {
        /* ignore */
      }
    }
  }

  /* ────────────────────────────────────────────────────────────────
   *  MAIN UPDATE
   * ──────────────────────────────────────────────────────────────── */

  function updateAllSelects() {
    /* Restaurant type */
    rebuildSelect("q-restaurant-type", RESTAURANT_TYPE_LABELS, "quote_select_restaurant_type", "选择餐厅类型");

    /* Contact channel */
    rebuildSelect(
      "q-contact-channel",
      CONTACT_CHANNEL_LABELS,
      "quote_select_channel",
      "选择联系方式",
      CHANNEL_DEFAULTS
    );

    /* Capacity — just translate placeholder */
    rebuildPlaceholderSelect("q-capacity", "quote_select_capacity", "选择");

    /* Country select doesn't need translation (country names are universal) */
    /* Just translate placeholder if needed */
    var countrySel = document.getElementById("q-country");
    if (countrySel) {
      var ph = countrySel.querySelector('option[value=""]');
      if (ph && typeof window.t === "function") {
        var translated = tr("select_country", "选择国家/地区");
        ph.textContent = translated;
        // Refresh custom-select trigger
        reinitCustomSelect(countrySel);
      }
    }

    /* Contact page selects */
    rebuildSelect("c-restaurant-type", RESTAURANT_TYPE_LABELS, "quote_select_restaurant_type", "选择餐厅类型");
    rebuildSelect(
      "c-contact-channel",
      CONTACT_CHANNEL_LABELS,
      "quote_select_channel",
      "选择联系方式",
      CHANNEL_DEFAULTS
    );
    var cCountry = document.getElementById("c-country");
    if (cCountry) {
      var ph2 = cCountry.querySelector('option[value=""]');
      if (ph2 && typeof window.t === "function") {
        ph2.textContent = tr("select_country", "选择国家/地区");
        reinitCustomSelect(cCountry);
      }
    }
  }

  /* ────────────────────────────────────────────────────────────────
   *  INIT
   * ──────────────────────────────────────────────────────────────── */

  var listenersRegistered = false;

  function init() {
    /* Only run on pages that have quote/contact selects */
    var hasTarget = document.getElementById("q-restaurant-type") || document.getElementById("c-restaurant-type");
    if (!hasTarget) return;

    updateAllSelects();

    if (listenersRegistered) return;
    listenersRegistered = true;

    /* Listen for language changes */
    window.addEventListener("translationsApplied", function () {
      updateAllSelects();
    });

    /* Also try the translationManager.on API */
    function tryRegisterOnManager() {
      if (window.translationManager && typeof window.translationManager.on === "function") {
        window.translationManager.on("translationsApplied", function () {
          updateAllSelects();
        });
        return true;
      }
      return false;
    }
    if (!tryRegisterOnManager()) {
      // Wait for translationManager.ready instead of polling
      if (window.translationManager && window.translationManager.ready) {
        window.translationManager.ready.then(tryRegisterOnManager);
      }
    }
  }

  /* Run on current page */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* SPA navigation */
  _spaOn(
    document,
    "spa:ready",
    function () {
      init();
    },
    "spa:ready:quoteSelectI18n"
  );

  /* Expose for manual trigger */
  window.updateQuoteSelectI18n = updateAllSelects;
})();
