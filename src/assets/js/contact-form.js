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

      // 直接跳转到感谢页，不再依赖后端 API
      window.location.href = "/thank-you/?from=contact";
    });
  });
})();
