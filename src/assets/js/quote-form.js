/**
 * quote-form.js — Quote form validation + Google Sheets submission + WhatsApp redirect
 * Works with both direct page load and SPA navigation.
 */
(function () {
  var VERSION = "20260423b";

  // Record page load time for TimeOnPage calculation
  window._quotePageLoadTime = window._quotePageLoadTime || Date.now();

  // Required field IDs whose labels need * markers
  var REQUIRED_IDS = ["q-company", "q-contact", "q-phone", "q-email", "q-country", "q-equipment-type", "q-capacity"];
  var ASTERISK_HTML = ' <span class="text-red-500 font-bold text-base align-middle">*</span>';

  /**
   * Re-inject * markers into labels after i18n overwrites textContent.
   * The translation system uses textContent which destroys child <span> elements.
   */
  function restoreAsterisks() {
    REQUIRED_IDS.forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      var label = input.closest('div') ? input.closest('div').querySelector('label') : null;
      if (!label) {
        // Fallback: find label by for attribute or sibling relationship
        label = document.querySelector('label[for="' + id + '"]');
        if (!label) return;
      }
      // Only restore if * is missing
      if (!label.querySelector('.text-red-500')) {
        label.insertAdjacentHTML('beforeend', ASTERISK_HTML);
      }
    });
  }

  function ensureErrorBanner() {
    if (document.getElementById("quote-form-error")) return;
    var banner = document.createElement("div");
    banner.id = "quote-form-error";
    banner.style.cssText = "display:none;background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;font-weight:600;text-align:center;";
    banner.textContent = "";
    var form = document.getElementById("quote-form");
    if (form) form.insertBefore(banner, form.firstChild);
    return banner;
  }

  function showError(msg) {
    // Try toast notification first
    if (typeof window.showNotification === "function") {
      window.showNotification(msg, "error");
    }
    // Always show inline banner as fallback
    var banner = ensureErrorBanner();
    if (banner) {
      banner.textContent = "⚠ " + msg;
      banner.style.display = "block";
      banner.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Also try alert as last resort
    setTimeout(function () {
      if (banner && banner.style.display !== "none") return;
      alert(msg);
    }, 300);
  }

  function clearError() {
    var banner = document.getElementById("quote-form-error");
    if (banner) banner.style.display = "none";
  }

  function initQuoteForm() {
    var form = document.getElementById("quote-form");
    if (!form || form.dataset.quoteFormBound) return;
    form.dataset.quoteFormBound = "1";

    console.log("[QuoteForm] Initialized (v" + VERSION + ")");

    // Restore * markers after i18n (which uses textContent, destroying <span> children)
    restoreAsterisks();
    document.addEventListener("translationsApplied", restoreAsterisks);
    document.addEventListener("languageChanged", restoreAsterisks);

    // Clear errors on input
    form.addEventListener("input", clearError);
    form.addEventListener("change", clearError);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();

      // Required fields
      var required = ["q-company", "q-contact", "q-phone", "q-email", "q-country", "q-equipment-type", "q-capacity"];
      var valid = true;
      var firstInvalid = null;
      required.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (!el.value.trim()) {
          el.classList.add("border-red-500");
          el.classList.add("ring-2", "ring-red-300");
          valid = false;
          if (!firstInvalid) firstInvalid = el;
        } else {
          el.classList.remove("border-red-500");
          el.classList.remove("ring-2", "ring-red-300");
        }
      });

      // Email validation
      var emailEl = document.getElementById("q-email");
      if (emailEl && emailEl.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
        emailEl.classList.add("border-red-500", "ring-2", "ring-red-300");
        valid = false;
        if (!firstInvalid) firstInvalid = emailEl;
      }

      // Consent validation
      var consentEl = document.getElementById("q-consent");
      if (consentEl && !consentEl.checked) {
        showError("请先同意隐私政策");
        return;
      }

      if (!valid) {
        showError("请填写所有必填项（红色边框的字段为必填）");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Build WhatsApp message
      var company = document.getElementById("q-company").value;
      var contact = document.getElementById("q-contact").value;
      var phone = document.getElementById("q-phone").value;
      var email = document.getElementById("q-email").value;
      var country = document.getElementById("q-country");
      var countryText = country.options[country.selectedIndex].text;
      var equipType = document.getElementById("q-equipment-type");
      var equipText = equipType.options[equipType.selectedIndex].text;
      var quantity = document.getElementById("q-quantity").value || "未指定";
      var capacity = document.getElementById("q-capacity");
      var capacityText = capacity.value ? capacity.options[capacity.selectedIndex].text : "未指定";
      var budget = document.getElementById("q-budget");
      var budgetText = budget.value ? budget.options[budget.selectedIndex].text : "未指定";
      var message = document.getElementById("q-message").value || "无";

      // Build rich message from all fields
      var richMsg = [
        "设备类型: " + equipText,
        "数量: " + quantity,
        "厨房规模: " + capacityText,
        "预算: " + budgetText,
        "需求: " + message
      ].join(" | ");

      var formData = {
        Timestamp: new Date().toISOString(),
        FormType: "quote_form",
        Name: contact,
        Email: email,
        Phone: phone,
        Country: countryText,
        Company: company,
        Message: richMsg,
        Language: (window.translationManager && window.translationManager.currentLang) || navigator.language,
        BrowserLanguage: navigator.language,
        ScreenWidth: window.screen.width,
        ScreenHeight: window.screen.height,
        Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        PageUrl: location.href,
        TimeOnPage: Math.round((Date.now() - (window._quotePageLoadTime || Date.now())) / 1000) + "s",
        ScrollDepth: Math.round((document.documentElement.scrollTop || document.body.scrollTop) / (document.documentElement.scrollHeight - document.documentElement.clientHeight) * 100) + "%",
        UserAgent: navigator.userAgent
      };

      // Disable button + show loading
      var btn = document.getElementById("quote-submit-btn");
      var btnOrig = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> 提交中...';
      }

      // Submit to Google Sheets
      fetch("https://script.google.com/macros/s/AKfycbyikM1ArEFhJhQUSAp6l4DHJcGzDDK1cckL-KOrVbjipoMGSKsOOlhFWJGTPB6qOys/exec", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      }).then(function () {
        if (typeof window.showNotification === "function") {
          window.showNotification("提交成功！我们将尽快与您联系", "success");
        }
        setTimeout(function () { location.href = "/thank-you/"; }, 1000);
      }).catch(function () {
        // no-cors returns opaque response, treat as success
        if (typeof window.showNotification === "function") {
          window.showNotification("提交成功！我们将尽快与您联系", "success");
        }
        setTimeout(function () { location.href = "/thank-you/"; }, 1000);
      });
    });
  }

  // Bind on DOM ready + SPA navigation
  if (document.readyState !== "loading") initQuoteForm();
  else document.addEventListener("DOMContentLoaded", initQuoteForm);
  document.addEventListener("spa:load", function () {
    setTimeout(initQuoteForm, 100);
  });
})();
