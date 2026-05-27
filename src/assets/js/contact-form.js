/**
 * Contact Form — 提交到 /api/form-submit → Google Sheets
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

      // 收集痛点多选
      var painCheckboxes = form.querySelectorAll('input[type="checkbox"][value]');
      var pains = [];
      painCheckboxes.forEach(function (cb) {
        if (cb.checked) pains.push(cb.value);
      });
      var painOther = document.getElementById("c-pain-other");
      if (painOther && painOther.value.trim()) pains.push(painOther.value.trim());

      // 收集所有字段
      var formData = {
        source: "联系我们",
        country: (function () {
          var sel = document.getElementById("c-country");
          if (!sel || !sel.value) return "";
          var opt = sel.options[sel.selectedIndex];
          return opt ? opt.text : sel.value;
        })(),
        contact: document.getElementById("c-contact")?.value || "",
        restaurantType: (function () {
          var sel = document.getElementById("c-restaurant-type");
          if (!sel || !sel.value) return "";
          var opt = sel.options[sel.selectedIndex];
          return opt ? opt.text : sel.value;
        })(),
        phoneCode: document.getElementById("c-phone-code")?.value || "",
        phone: document.getElementById("c-phone")?.value || "",
        contactChannel: document.getElementById("c-contact-channel")?.value || "",
        contactAccount: document.getElementById("c-contact-account")?.value || "",
        email: document.getElementById("c-email")?.value || "",
        painPoints: pains.join(", "),
        painOther: painOther ? painOther.value.trim() : "",
      };

      var btn = form.querySelector('button[type="submit"]');
      var origText = btn.textContent;
      btn.disabled = true;
      btn.textContent =
        typeof window.uiText === "function" ? window.uiText("quote_submitting") || "Submitting..." : "Submitting...";

      fetch("/api/form-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (data.ok) {
            window.location.href = "/thank-you/?from=contact";
          } else {
            alert(
              typeof window.uiText === "function"
                ? window.uiText("contact_submit_error") || "Submission failed, please try again."
                : "Submission failed, please try again."
            );
            btn.disabled = false;
            btn.textContent = origText;
          }
        })
        .catch(function () {
          alert(
            typeof window.uiText === "function"
              ? window.uiText("contact_network_error") || "Network error, please try again."
              : "Network error, please try again."
          );
          btn.disabled = false;
          btn.textContent = origText;
        });
    });
  });
})();
