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
      var GAS_URL =
        "https://script.google.com/macros/s/AKfycbyUy-DdV0eqNfbzHWXhf5XbSMtyJMIL--Hx_AfMOrBqUYl7PgVD7vX7uhIhXy_DZIXr/exec";
      fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      }).catch(function () {
        // no-cors 静默处理
      });

      // 跳转到感谢页
      window.location.href = "/thank-you/?from=contact";
    });
  });
})();
