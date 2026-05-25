/**
 * quote-form.js — Two-step quote form + Contact form
 * Features: step navigation, country→phone-code sync, phone→account auto-fill, pain-point/equip "other" toggle
 */
(function () {
  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (key == null) key = evt + ":" + (++_spaRegs.__k || (_spaRegs.__k = 1));
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  window._quotePageLoadTime = window._quotePageLoadTime || Date.now();

  function _t(key, fallback) {
    if (typeof window.uiText !== "function") return fallback || key;
    var v = window.uiText(key, null);
    return v || fallback || key;
  }

  // Country → phone code mapping
  var COUNTRY_CODE_MAP = {
    ID: "+62",
    MY: "+60",
    PH: "+63",
    VN: "+84",
    TH: "+66",
    SG: "+65",
    MM: "+95",
    KH: "+855",
    LA: "+856",
    BN: "+673",
    CN: "+86",
    IN: "+91",
    JP: "+81",
    KR: "+82",
    SA: "+966",
    TW: "+886",
    HK: "+852",
    DE: "+49",
    ES: "+34",
    FR: "+33",
    PT: "+351",
    RU: "+7",
    NL: "+31",
    PL: "+48",
    IT: "+39",
    TR: "+90",
    IL: "+972",
  };

  // Set a native phone-code select to a given code value
  function setPhoneCode(selectEl, code) {
    if (!selectEl) return;
    for (var i = 0; i < selectEl.options.length; i++) {
      if (selectEl.options[i].value === code) {
        selectEl.selectedIndex = i;
        return;
      }
    }
    for (var j = 0; j < selectEl.options.length; j++) {
      if (selectEl.options[j].value === "+other") {
        selectEl.selectedIndex = j;
        return;
      }
    }
  }

  // Global handler called from inline onchange on country selects
  window._onCountryChange = function (countryCode) {
    var phoneCode = COUNTRY_CODE_MAP[countryCode];
    if (!phoneCode) return;
    // Sync all phone-code selects on the page
    var selects = document.querySelectorAll("[id$=-phone-code]");
    for (var i = 0; i < selects.length; i++) {
      setPhoneCode(selects[i], phoneCode);
    }
  };

  function ensureErrorBanner(form) {
    var id = (form.id || "quote-form") + "-error";
    var existing = document.getElementById(id);
    if (existing) return existing;
    var banner = document.createElement("div");
    banner.id = id;
    banner.style.cssText =
      "display:none;background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;font-weight:600;text-align:center;";
    form.insertBefore(banner, form.firstChild);
    return banner;
  }

  function showError(form, msg) {
    if (typeof window.showNotification === "function") window.showNotification(msg, "error");
    var banner = ensureErrorBanner(form);
    banner.textContent = "⚠ " + msg;
    banner.style.display = "block";
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearError(form) {
    var id = (form.id || "quote-form") + "-error";
    var banner = document.getElementById(id);
    if (banner) banner.style.display = "none";
  }

  function bindPhoneToAccount(form, phoneId, phoneCodeId, accountId) {
    var phoneEl = form.querySelector("#" + phoneId);
    var phoneCodeEl = form.querySelector("#" + phoneCodeId);
    var accountEl = form.querySelector("#" + accountId);
    if (!phoneEl || !accountEl) return;

    var fillAccount = function () {
      var code = phoneCodeEl ? phoneCodeEl.value : "";
      var num = phoneEl.value.trim();
      if (num && !accountEl.value.trim()) {
        accountEl.value = (code && code !== "+other" ? code + " " : "") + num;
      }
    };
    phoneEl.addEventListener("blur", fillAccount);
    if (phoneCodeEl) phoneCodeEl.addEventListener("change", fillAccount);
  }

  function initStepNavigation(form) {
    var step1 = form.querySelector("#quote-step-1");
    var step2 = form.querySelector("#quote-step-2");
    if (!step1 || !step2) return;

    var nextBtn = form.querySelector("#quote-next-btn");
    var prevBtn = form.querySelector("#quote-prev-btn");

    // Bind phone → account auto-fill for quote form
    bindPhoneToAccount(form, "q-phone", "q-phone-code", "q-contact-account");

    // Equipment "other" toggle
    var equipOtherCb = form.querySelector("#q-equip-other-cb");
    var equipOther = form.querySelector("#q-equip-other");
    if (equipOtherCb && equipOther) {
      equipOtherCb.addEventListener("change", function () {
        if (equipOtherCb.checked) {
          equipOther.classList.remove("hidden");
          equipOther.focus();
        } else {
          equipOther.classList.add("hidden");
          equipOther.value = "";
        }
      });
    }

    // Pain-point "other" toggle
    var painOtherCb = form.querySelector("#q-pain-other-cb");
    var painOther = form.querySelector("#q-pain-other");
    if (painOtherCb && painOther) {
      painOtherCb.addEventListener("change", function () {
        if (painOtherCb.checked) {
          painOther.classList.remove("hidden");
          painOther.focus();
        } else {
          painOther.classList.add("hidden");
          painOther.value = "";
        }
      });
    }

    // Next button
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        clearError(form);
        var required = ["q-country", "q-contact", "q-restaurant-type", "q-phone", "q-contact-channel"];
        var valid = true,
          firstInvalid = null;
        required.forEach(function (id) {
          var el = form.querySelector("#" + id);
          if (!el) return;
          if (!el.value.trim()) {
            el.classList.add("border-red-500", "ring-2", "ring-red-300");
            valid = false;
            if (!firstInvalid) firstInvalid = el;
          } else {
            el.classList.remove("border-red-500", "ring-2", "ring-red-300");
          }
        });
        if (!valid) {
          showError(form, _t("quote_fill_required", "Please fill in all required fields (*)"));
          if (firstInvalid) firstInvalid.focus();
          return;
        }
        step1.classList.add("hidden");
        step2.classList.remove("hidden");
        step2.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    // Prev button
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        step2.classList.add("hidden");
        step1.classList.remove("hidden");
        step1.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function initQuoteForm() {
    var form = document.getElementById("quote-form") || document.getElementById("quote-form-mobile");
    if (!form || form.dataset.quoteFormBound) return;
    form.dataset.quoteFormBound = "1";

    initStepNavigation(form);
    form.addEventListener("input", function () {
      clearError(form);
    });
    form.addEventListener("change", function () {
      clearError(form);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError(form);

      // Validate step 2
      var requiredStep2 = ["q-capacity", "q-budget"];
      var timelineChecked = form.querySelector('input[name="q-timeline"]:checked');
      var valid = true,
        firstInvalid = null;

      requiredStep2.forEach(function (id) {
        var el = form.querySelector("#" + id);
        if (!el) return;
        if (!el.value.trim()) {
          el.classList.add("border-red-500", "ring-2", "ring-red-300");
          valid = false;
          if (!firstInvalid) firstInvalid = el;
        } else {
          el.classList.remove("border-red-500", "ring-2", "ring-red-300");
        }
      });
      if (!timelineChecked) valid = false;

      if (!valid) {
        showError(form, _t("quote_fill_required", "Please fill in all required fields (*)"));
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Collect all data
      var country = form.querySelector("#q-country");
      var phone = form.querySelector("#q-phone");
      var phoneCode = form.querySelector("#q-phone-code");
      var email = form.querySelector("#q-email");
      var contact = form.querySelector("#q-contact");
      var company = form.querySelector("#q-company");
      var restaurantType = form.querySelector("#q-restaurant-type");
      var contactChannel = form.querySelector("#q-contact-channel");
      var contactAccount = form.querySelector("#q-contact-account");
      var capacity = form.querySelector("#q-capacity");
      var budget = form.querySelector("#q-budget");
      var timeline = form.querySelector('input[name="q-timeline"]:checked');

      var countryText = country && country.value ? country.options[country.selectedIndex].text : "";
      var restaurantText =
        restaurantType && restaurantType.value ? restaurantType.options[restaurantType.selectedIndex].text : "";

      var equipments = [];
      form
        .querySelectorAll(
          '#quote-step-2 input[type="checkbox"][value="cutting"],#quote-step-2 input[type="checkbox"][value="stirfry"],#quote-step-2 input[type="checkbox"][value="frying"],#quote-step-2 input[type="checkbox"][value="stewing"],#quote-step-2 input[type="checkbox"][value="steaming"],#quote-step-2 input[type="checkbox"][value="auxiliary"]'
        )
        .forEach(function (cb) {
          if (cb.checked) equipments.push(cb.value);
        });
      var equipOther = form.querySelector("#q-equip-other");
      if (equipOther && equipOther.value.trim()) equipments.push("Other: " + equipOther.value.trim());

      var pains = [];
      form
        .querySelectorAll(
          '#quote-step-2 input[type="checkbox"][value="招聘困难"],#quote-step-2 input[type="checkbox"][value="出餐慢"],#quote-step-2 input[type="checkbox"][value="品质不稳"],#quote-step-2 input[type="checkbox"][value="成本高"],#quote-step-2 input[type="checkbox"][value="新店"]'
        )
        .forEach(function (cb) {
          if (cb.checked) pains.push(cb.value);
        });
      var painOtherCb = form.querySelector("#q-pain-other-cb");
      var painOther = form.querySelector("#q-pain-other");
      if (painOtherCb && painOtherCb.checked && painOther && painOther.value.trim()) {
        pains.push("Other: " + painOther.value.trim());
      }

      var _richMsg = [
        "Restaurant Type: " + restaurantText,
        "Contact Via: " +
          (contactChannel ? contactChannel.value : "") +
          (contactAccount && contactAccount.value ? " (" + contactAccount.value + ")" : ""),
        "Equipment: " + (equipments.length ? equipments.join(", ") : "Not specified"),
        "Daily Output: " + (capacity && capacity.value ? capacity.options[capacity.selectedIndex].text : ""),
        "Budget: " + (budget && budget.value ? budget.options[budget.selectedIndex].text : ""),
        "Timeline: " + (timeline ? timeline.value : ""),
        "Pain Points: " + (pains.length ? pains.join(", ") : "None"),
      ].join(" | ");

      var formData = {
        source: "获取报价",
        country: countryText,
        contact: contact ? contact.value : "",
        company: company ? company.value : "",
        restaurantType: restaurantText,
        phoneCode: phoneCode && phoneCode.value !== "+other" ? phoneCode.value : "",
        phone: phone ? phone.value : "",
        contactChannel: contactChannel ? contactChannel.value : "",
        contactAccount: contactAccount ? contactAccount.value : "",
        email: email ? email.value : "",
        equipTypes: equipments.join(", "),
        capacity: capacity && capacity.value ? capacity.options[capacity.selectedIndex].text : "",
        budget: budget && budget.value ? budget.options[budget.selectedIndex].text : "",
        painPoints: pains.join(", "),
        painOther: painOtherCb && painOtherCb.checked && painOther ? painOther.value.trim() : "",
        language: (window.translationManager && window.translationManager.currentLang) || navigator.language,
        browserLanguage: navigator.language,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        pageUrl: location.href,
        timeOnPage: Math.round((Date.now() - (window._quotePageLoadTime || Date.now())) / 1000) + "s",
        userAgent: navigator.userAgent,
      };

      var btn = form.querySelector("#quote-submit-btn");
      var btnOrig = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML =
          '<span class="material-symbols-outlined animate-spin">progress_activity</span> ' +
          _t("quote_submitting", "Submitting...") +
          "...";
      }

      fetch("/api/form-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
        .then(function (res) {
          if (!res.ok)
            return res.json().then(function (err) {
              throw new Error(err.error || "Submission failed");
            });
          return res.json();
        })
        .then(function () {
          if (typeof window.showNotification === "function")
            window.showNotification(_t("quote_submit_success", "Submitted! We will contact you soon."), "success");
          setTimeout(function () {
            if (window.SpaRouter) window.SpaRouter.navigate("/thank-you/");
            else location.href = "/thank-you/";
          }, 1000);
        })
        .catch(function (err) {
          showError(form, err.message || _t("quote_submit_error", "Submission failed, please try again later."));
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = btnOrig;
          }
        });
    });
  }

  // Contact form init
  function initContactForm() {
    var form = document.querySelector("#contact-form-el");
    if (!form || form.dataset.contactFormBound) return;
    form.dataset.contactFormBound = "1";

    bindPhoneToAccount(form, "c-phone", "c-phone-code", "c-contact-account");

    // Pain point "other" toggle
    var pain6 = form.querySelector("#c-pain-6");
    var painOther = form.querySelector("#c-pain-other");
    if (pain6 && painOther) {
      pain6.addEventListener("change", function () {
        if (pain6.checked) {
          painOther.classList.remove("hidden");
          painOther.focus();
        } else {
          painOther.classList.add("hidden");
          painOther.value = "";
        }
      });
    }
  }

  // Bind on DOM ready + SPA navigation
  if (document.readyState !== "loading") {
    initQuoteForm();
    initContactForm();
  } else
    document.addEventListener("DOMContentLoaded", function () {
      initQuoteForm();
      initContactForm();
    });

  _spaOn(
    document,
    "spa:ready",
    function () {
      initQuoteForm();
      initContactForm();
    },
    "spa:ready"
  );
  _spaOn(
    document,
    "spa:load",
    function () {
      var qf = document.getElementById("quote-form") || document.getElementById("quote-form-mobile");
      if (qf && !qf._spaLoadInitialized) {
        qf._spaLoadInitialized = true;
        initQuoteForm();
      }
      var cf = document.querySelector("#contact-form-el");
      if (cf && !cf._spaLoadInitialized) {
        cf._spaLoadInitialized = true;
        initContactForm();
      }
    },
    "spa:load"
  );
})();
