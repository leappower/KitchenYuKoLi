/**
 * quote-form.js — Quote form validation + Google Sheets submission + WhatsApp redirect
 * Works with both direct page load and SPA navigation.
 */
(function () {
  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  var VERSION = "20260423b";

  // Record page load time for TimeOnPage calculation
  window._quotePageLoadTime = window._quotePageLoadTime || Date.now();

  // Required field IDs whose labels need * markers
  var REQUIRED_IDS = ["q-company", "q-contact", "q-phone", "q-email", "q-country", "q-equipment-type", "q-capacity"];
  var ASTERISK_HTML = ' <span class="text-red-500 font-bold text-base align-middle">*</span>';

  /**
   * Re-inject * markers into labels after i18n overwrites textContent.
   * Since translations.js now preserves non-data-i18n child elements,
   * this is only a safety net for edge cases.
   */
  function restoreAsterisks() {
    REQUIRED_IDS.forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      var container = input.parentElement;
      while (container && container.tagName !== "DIV") container = container.parentElement;
      if (!container) return;
      var label = container.querySelector("label");
      if (!label) return;
      if (!label.querySelector(".text-red-500")) {
        label.insertAdjacentHTML("beforeend", ASTERISK_HTML);
      }
    });
  }

  function ensureErrorBanner() {
    if (document.getElementById("quote-form-error")) return;
    var banner = document.createElement("div");
    banner.id = "quote-form-error";
    banner.style.cssText =
      "display:none;background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;font-weight:600;text-align:center;";
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

    // Restore * markers if needed (translations.js now preserves child spans, but safety net)
    restoreAsterisks();

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
        showError("Please agree to the privacy policy first");
        return;
      }

      if (!valid) {
        showError("Please fill in all required fields (marked with red border)");
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
      var quantity = document.getElementById("q-quantity").value || "Not specified";
      var capacity = document.getElementById("q-capacity");
      var capacityText = capacity.value ? capacity.options[capacity.selectedIndex].text : "Not specified";
      var budget = document.getElementById("q-budget");
      var budgetText = budget.value ? budget.options[budget.selectedIndex].text : "Not specified";
      var message = document.getElementById("q-message").value || "None";

      // Build rich message from all fields
      var richMsg = [
        "Equipment Type: " + equipText,
        "Quantity: " + quantity,
        "Kitchen Capacity: " + capacityText,
        "Budget: " + budgetText,
        "Requirements: " + message,
      ].join(" | ");

      var formData = {
        formType: "quote_form",
        name: contact,
        email: email,
        phone: phone,
        country: countryText,
        company: company,
        message: richMsg,
        language: (window.translationManager && window.translationManager.currentLang) || navigator.language,
        browserLanguage: navigator.language,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        pageUrl: location.href,
        timeOnPage: Math.round((Date.now() - (window._quotePageLoadTime || Date.now())) / 1000) + "s",
        userAgent: navigator.userAgent,
      };

      // Disable button + show loading
      var btn = document.getElementById("quote-submit-btn");
      var btnOrig = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Submitting...';
      }

      // Submit via server proxy (hides Google Apps Script URL)
      fetch("/api/quote-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
        .then(function (response) {
          if (!response.ok) {
            return response.json().then(function (err) {
              throw new Error(err.error || "Submission failed");
            });
          }
          return response.json();
        })
        .then(function () {
          if (typeof window.showNotification === "function") {
            window.showNotification("Submitted successfully! We'll contact you soon.", "success");
          }
          setTimeout(function () {
            if (window.SpaRouter) {
              window.SpaRouter.navigate("/thank-you/");
            } else {
              location.href = "/thank-you/";
            }
          }, 1000);
        })
        .catch(function (err) {
          showError(err.message || "Submission failed. Please try again later.");
          // Re-enable button on error
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = btnOrig;
          }
        });
    });
  }

  // Bind on DOM ready + SPA navigation
  if (document.readyState !== "loading") initQuoteForm();
  else document.addEventListener("DOMContentLoaded", initQuoteForm);
  _spaOn(
    document,
    "spa:ready",
    function () {
      initQuoteForm();
    },
    "spa:ready"
  );
  _spaOn(
    document,
    "spa:load",
    function initQuoteFormSPA() {
      var form = document.getElementById("quote-form") || document.getElementById("quote-calc-form");
      if (!form || form._spaLoadInitialized) return;
      form._spaLoadInitialized = true;
      initQuoteForm();
    },
    "spa:load"
  );
})();
