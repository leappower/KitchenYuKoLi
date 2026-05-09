/**
 * form-interactions.js — Inline validation, form submission, success state
 * Extracted from page-interactions.js; self-initializes on DOMContentLoaded.
 *
 * Depends on (may be loaded after this file):
 *   smart-popup.js → window.submitContactForm (optional, graceful fallback)
 */
(function (global) {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  // ─── Helpers (from PiHelpers) ─────────────────────────────────────────
  var _h = window.PiHelpers || {};
  var safeCall =
    _h.safeCall ||
    function (fnName, args) {
      if (typeof global[fnName] === "function") return global[fnName].apply(null, args || []);
      console.warn("[FormInteractions] " + fnName + " not found.");
    };

  // ─── B. On-blur inline validation ────────────────────────────────────────────
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_RE = /^[\d\s\-+().]{7,20}$/;

  function validateField(input) {
    var type = (input.type || "").toLowerCase();
    var name = (input.name || input.id || "").toLowerCase();
    var val = input.value.trim();
    var error = "";

    if (input.required && val === "") {
      error = "This field is required.";
    } else if (val !== "") {
      if (type === "email" || name.indexOf("email") !== -1) {
        if (!EMAIL_RE.test(val)) error = "Please enter a valid email address.";
      } else if (type === "tel" || name.indexOf("phone") !== -1 || name.indexOf("tel") !== -1) {
        if (!PHONE_RE.test(val)) error = "Please enter a valid phone number.";
      }
    }

    // Show / hide error
    var wrapper = input.parentElement;
    var msgEl = wrapper ? wrapper.querySelector(".field-error-msg") : null;

    if (error) {
      input.classList.add("field-error");
      // Add shake — remove first so re-triggering works
      input.classList.remove("shake");
      void input.offsetWidth; // reflow
      input.classList.add("shake");
      if (!msgEl) {
        msgEl = document.createElement("span");
        msgEl.className = "field-error-msg";
        if (wrapper) wrapper.appendChild(msgEl);
      }
      msgEl.textContent = error;
    } else {
      input.classList.remove("field-error", "shake");
      if (msgEl) msgEl.remove();
    }
    return !error;
  }

  function bindInlineValidation() {
    var forms = document.querySelectorAll("form");
    forms.forEach(function (form) {
      var fields = form.querySelectorAll("input, textarea, select");
      fields.forEach(function (input) {
        if (!input.dataset.blurBound) {
          input.dataset.blurBound = "1";
          input.addEventListener("blur", function () {
            validateField(input);
          });
          input.addEventListener("input", function () {
            // Clear error once user starts typing again
            if (input.classList.contains("field-error")) {
              input.classList.remove("field-error", "shake");
              var msgEl = input.parentElement && input.parentElement.querySelector(".field-error-msg");
              if (msgEl) msgEl.remove();
            }
          });
        }
      });
    });
  }

  // ─── C. Form success — collapse + green checkmark ────────────────────────────
  var CHECKMARK_SVG = [
    '<svg class="checkmark-svg" width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">',
    '  <circle cx="32" cy="32" r="30" stroke-width="2"/>',
    '  <path d="M20 33 l9 9 l16-18" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    "</svg>",
  ].join("");

  function showFormSuccess(form, onDone) {
    var wrapper = form.parentElement || form;

    // 1. Collapse the form
    form.classList.add("form-collapsing");

    // 2. After collapse animation, replace with success overlay
    setTimeout(function () {
      form.style.display = "none";
      form.classList.remove("form-collapsing");

      var overlay = document.createElement("div");
      overlay.className = "form-success-overlay";
      overlay.innerHTML = [
        CHECKMARK_SVG,
        '<p style="font-weight:700;font-size:1.125rem;color:#16a34a;">Submitted Successfully!</p>',
        '<p style="color:#64748b;font-size:0.875rem;">Our team will reach out within 24 hours.</p>',
      ].join("");
      wrapper.appendChild(overlay);

      // 3. After 1.5 s, call onDone (e.g. scroll to calendar / navigate)
      setTimeout(function () {
        if (typeof onDone === "function") onDone();
      }, 1500);
    }, 420);
  }

  // ─── 5. Form submission wiring ────────────────────────────────────────────────
  function bindForms() {
    var forms = document.querySelectorAll("form");
    forms.forEach(function (form) {
      // Assign id="contact-form" if form has no id (so submitContactForm can find it)
      if (!form.id) {
        form.id = "contact-form";
      }
      // Only add onsubmit handler if not already handled
      if (!form.dataset.interactionBound) {
        form.dataset.interactionBound = "1";
        form.addEventListener("submit", function (e) {
          e.preventDefault();

          // Run inline validation before submitting
          var fields = form.querySelectorAll("input, textarea, select");
          var allValid = true;
          fields.forEach(function (f) {
            if (!validateField(f)) allValid = false;
          });
          if (!allValid) return;

          // Determine post-animation action
          var calSection =
            document.querySelector(".grid.grid-cols-7") ||
            document.getElementById("booking") ||
            document.getElementById("calendar");

          if (calSection) {
            // Show success animation, then scroll to calendar
            showFormSuccess(form, function () {
              calSection.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          } else if (typeof window.submitContactForm === "function") {
            // Call submitContactForm immediately (keeps test compatibility),
            // then show the visual success overlay
            window.submitContactForm(e);
            showFormSuccess(form, null);
          } else {
            showFormSuccess(form, function () {
              safeCall("showNotification", ["Form submitted successfully!", "success"]);
            });
          }
        });
      }
    });
  }

  // ─── Bootstrap ────────────────────────────────────────────────────────────────
  function init() {
    bindInlineValidation();
    bindForms();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  _spaOn(document, "spa:load", init, "spa:load:init");
})(window);
