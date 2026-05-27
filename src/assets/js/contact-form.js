/**
 * Contact Form — 提交到 Google Forms
 * 数据来源: /contact/ 页面表单 (contact-form-el)
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

  _spaOn(document, "DOMContentLoaded", function () {
    var form = document.getElementById("contact-form-el");
    if (!form) return;

    _spaOn(form, "submit", function (e) {
      e.preventDefault();

      // ── 基础校验：所有 [required] 字段 ──
      var requiredEls = form.querySelectorAll('[required]');
      var firstInvalid = null;
      var allValid = true;
      requiredEls.forEach(function (el) {
        if (el.closest && el.closest('.hidden')) return;
        if (!el.value || !el.value.toString().trim()) {
          el.classList.add("border-red-500", "ring-2", "ring-red-300");
          allValid = false;
          if (!firstInvalid) firstInvalid = el;
        } else {
          el.classList.remove("border-red-500", "ring-2", "ring-red-300");
        }
      });

      // email 格式校验
      var emailEl = form.querySelector('#c-email');
      if (emailEl && emailEl.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
        emailEl.classList.add("border-red-500", "ring-2", "ring-red-300");
        if (!firstInvalid) firstInvalid = emailEl;
        allValid = false;
      }

      if (!allValid) {
        var label = typeof window.uiText === "function"
          ? window.uiText("quote_fill_required", "Please fill in required fields")
          : "Please fill in required fields";
        if (typeof window.showNotification === "function") window.showNotification(label, "error");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      var origText = btn.textContent;
      btn.disabled = true;
      btn.textContent =
        typeof window.uiText === "function" ? window.uiText("quote_submitting") || "Submitting..." : "Submitting...";

      // 收集联系人表单数据
      var country = form.querySelector("#c-country");
      var contact = form.querySelector("#c-contact");
      var restaurantType = form.querySelector("#c-restaurant-type");
      var phoneCode = form.querySelector("#c-phone-code");
      var phone = form.querySelector("#c-phone");
      var contactChannel = form.querySelector("#c-contact-channel");
      var contactAccount = form.querySelector("#c-contact-account");
      var email = form.querySelector("#c-email");

      var countryText = country && country.value ? country.options[country.selectedIndex].text : "";
      var restaurantText =
        restaurantType && restaurantType.value ? restaurantType.options[restaurantType.selectedIndex].text : "";

      var pains = [];
      form.querySelectorAll('#contact-form-el input[type="checkbox"]').forEach(function (cb) {
        if (cb.checked) pains.push(cb.value);
      });
      var painOther = form.querySelector("#c-pain-other");
      var painChecked = form.querySelector("#c-pain-6");
      var painOtherText = "";
      if (painChecked && painChecked.checked && painOther && painOther.value.trim()) {
        painOtherText = painOther.value.trim();
      }

      var formData = {
        source: "联系我们",
        country: countryText,
        contact: contact ? contact.value : "",
        restaurantType: restaurantText,
        phoneCode: phoneCode && phoneCode.value !== "+other" ? phoneCode.value : "",
        phone: phone ? phone.value : "",
        contactChannel: contactChannel ? contactChannel.value : "",
        contactAccount: contactAccount ? contactAccount.value : "",
        email: email ? email.value : "",
        painPoints: pains.join(", "),
        painOther: painOtherText,
        language: (window.translationManager && window.translationManager.currentLang) || navigator.language,
        pageUrl: location.href,
        userAgent: navigator.userAgent,
      };

      // 提交到 Google Sheets (via GAS Web App)
      // GAS 不支持 CORS preflight → no-cors + 不设 Content-Type（避开 preflight）
      var GAS_URL =
        "https://script.google.com/macros/s/AKfycbyUy-DdV0eqNfbzHWXhf5XbSMtyJMIL--Hx_AfMOrBqUYl7PgVD7vX7uhIhXy_DZIXr/exec";

      var controller = new AbortController();
      var timeout = setTimeout(function () {
        controller.abort();
      }, 15000);

      // JSON body 但 no-cors + 无自定义 Content-Type = simple request
      fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(formData),
        signal: controller.signal,
      })
        .catch(function (err) {
          clearTimeout(timeout);
          if (err.name === "AbortError") console.error("[ContactForm] Request timeout");
          else console.error("[ContactForm] Submit error:", err.message);
        })
        .finally(function () {
          clearTimeout(timeout);
          // 跳转到感谢页（无论成败）
          setTimeout(function () {
            window.location.href = "/thank-you/?from=contact";
          }, 500);
        });
    });
  });
})();
