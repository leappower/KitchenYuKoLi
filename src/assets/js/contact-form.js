/**
 * Contact Form — 提交到 /api/form-submit → Google Sheets
 * 数据来源: /contact/ 页面表单 (contact-form-el)
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("contact-form-el");
    if (!form) return;

    form.addEventListener("submit", function (e) {
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
        country: document.getElementById("c-country")?.value || "",
        contact: document.getElementById("c-contact")?.value || "",
        restaurantType: document.getElementById("c-restaurant-type")?.value || "",
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
      btn.textContent = "提交中...";

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
            alert("提交失败，请稍后重试");
            btn.disabled = false;
            btn.textContent = origText;
          }
        })
        .catch(function () {
          alert("网络错误，请稍后重试");
          btn.disabled = false;
          btn.textContent = origText;
        });
    });
  });
})();
