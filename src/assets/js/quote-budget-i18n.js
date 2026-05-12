/**
 * quote-budget-i18n.js — Dynamic budget options with language-aware currency labels
 * Listens for languageChanged events and updates #q-budget options.
 * Also runs on init (DOMContentLoaded / SPA afterNavigate).
 */
(function () {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  /* Budget values (universal — used for submission, not display) */
  var TIER_VALUES = ["5k-1w", "1w-5w", "5w-10w", "10w-30w", "30w-50w", "50w+"];

  /* Display labels per language */
  var LABELS = {
    "zh-CN": [
      "5千-1万 人民币",
      "1万-5万 人民币",
      "5万-10万 人民币",
      "10万-30万 人民币",
      "30万-50万 人民币",
      "50万以上 人民币",
    ],
    "zh-TW": ["5千-1萬 台幣", "1萬-5萬 台幣", "5萬-10萬 台幣", "10萬-30萬 台幣", "30萬-50萬 台幣", "50萬以上 台幣"],
    en: [
      "$700 – $1,400",
      "$1,400 – $7,000",
      "$7,000 – $14,000",
      "$14,000 – $42,000",
      "$42,000 – $70,000",
      "Over $70,000",
    ],
    ja: ["7千–1.4万円", "1.4万–7万円", "7万–14万円", "14万–42万円", "42万–70万円", "70万円以上"],
    ko: ["700만–1,400만 원", "1,400만–7,000만 원", "7,000만–1.4억 원", "1.4억–4.2억 원", "4.2억–7억 원", "7억 이상"],
    th: ["5千–1万 ฿", "1万–5万 ฿", "5万–10万 ฿", "10万–30万 ฿", "30万–50万 ฿", "50万以上 ฿"],
    vi: ["5 nghìn–1 vạn ₫", "1–5 vạn ₫", "5–10 vạn ₫", "10–30 vạn ₫", "30–50 vạn ₫", "Trên 50 vạn ₫"],
    id: [
      "Rp 5 jt–10 jt",
      "Rp 10 jt–50 jt",
      "Rp 50 jt–100 jt",
      "Rp 100 jt–300 jt",
      "Rp 300 jt–500 jt",
      "Di atas Rp 500 jt",
    ],
    ms: [
      "RM 3,000–7,000",
      "RM 7,000–35,000",
      "RM 35,000–70,000",
      "RM 70,000–200,000",
      "RM 200,000–350,000",
      "Melebihi RM 350,000",
    ],
    hi: ["₹50K – ₹1L", "₹1L – ₹5L", "₹5L – ₹10L", "₹10L – ₹30L", "₹30L – ₹50L", "₹50L से अधिक"],
    ar: [
      "3,500–7,000 ر.س",
      "7,000–35,000 ر.س",
      "35,000–70,000 ر.س",
      "70,000–200,000 ر.س",
      "200,000–350,000 ر.س",
      "أكثر من 350,000 ر.س",
    ],
  };

  function getCurrentLang() {
    if (window.translationManager && window.translationManager.currentLanguage) {
      return window.translationManager.currentLanguage;
    }
    var lang = (document.documentElement.lang || "en").replace(/^en-GB$/i, "en");
    return lang;
  }

  function getLabels(lang) {
    /* Exact match first */
    if (LABELS[lang]) return LABELS[lang];
    /* Prefix match: e.g. zh-CN → zh-CN, zh-TW → zh-TW */
    for (var k in LABELS) {
      if (lang.indexOf(k) === 0) return LABELS[k];
    }
    return LABELS["en"];
  }

  /**
   * Rebuild budget <option> elements.
   * Preserves the currently selected value if it still exists.
   */
  function updateBudgetOptions() {
    var sel = document.getElementById("q-budget");
    if (!sel) return;

    var lang = getCurrentLang();
    var labels = getLabels(lang);
    var prev = sel.value;

    /* Keep the placeholder and consult option */
    /* We rebuild all budget-tier options */
    var html = "";
    var placeholder = sel.querySelector('option[value=""]');
    var consult = sel.querySelector('option[value="consult"]');

    if (placeholder) {
      html += '<option value="">' + (placeholder.textContent || "请选择预算范围") + "</option>";
    } else {
      html += '<option value="">—</option>';
    }

    if (consult) {
      html += '<option value="consult">' + (consult.textContent || "需咨询") + "</option>";
    }

    for (var i = 0; i < TIER_VALUES.length; i++) {
      var selected = TIER_VALUES[i] === prev ? " selected" : "";
      html += '<option value="' + TIER_VALUES[i] + '"' + selected + ">" + (labels[i] || TIER_VALUES[i]) + "</option>";
    }

    sel.innerHTML = html;
    sel.value = prev || ""; /* restore selection */

    /* Re-render custom-select UI if active */
    if (window.CustomSelect && typeof window.CustomSelect.init === "function") {
      try {
        if (sel._customSelectInstance) {
          /* Destroy old instance: restore native select, remove wrapper */
          var oldWrap = sel.parentElement;
          if (oldWrap && oldWrap.classList.contains("cs-trigger-wrap")) {
            oldWrap.parentNode.insertBefore(sel, oldWrap);
            oldWrap.parentNode.removeChild(oldWrap);
          }
          sel._customSelectInstance = null;
          /* Restore native select visibility */
          sel.style.cssText = "";
        }
        window.CustomSelect.init(sel);
      } catch (e) {
        /* ignore */
      }
    }
  }

  /* ── Init ── */

  var listenersRegistered = false;

  function init() {
    /* Only update if #q-budget exists on the page */
    if (!document.getElementById("q-budget")) return;
    updateBudgetOptions();

    if (listenersRegistered) return;
    listenersRegistered = true;

    /* Listen for language changes — translationsApplied fires after DOM is updated */
    window.addEventListener("translationsApplied", function () {
      updateBudgetOptions();
    });

    /* Also try the translationManager.on API as backup */
    function tryRegisterOnManager() {
      if (window.translationManager && typeof window.translationManager.on === "function") {
        window.translationManager.on("translationsApplied", function () {
          updateBudgetOptions();
        });
        return true;
      }
      return false;
    }
    if (!tryRegisterOnManager()) {
      var attempts = 0;
      var timer = setInterval(function () {
        if (tryRegisterOnManager() || ++attempts > 20) clearInterval(timer);
      }, 200);
    }
  }

  /* Run on current page */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* On SPA navigation: re-check and update (spa:ready fires after translations applied) */
  _spaOn(
    document,
    "spa:ready",
    function () {
      init();
    },
    "spa:ready"
  );

  /* Expose for manual trigger */
  window.updateBudgetOptions = updateBudgetOptions;
})();
