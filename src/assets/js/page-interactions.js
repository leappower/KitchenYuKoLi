/**
 * page-interactions.js — Core CTA, contact, navigation & dark mode
 * IIFE build for src/ static HTML (no build tools)
 *
 * Depends on (load before this file):
 *   contacts.js    → window.Contacts, window.startWhatsApp, window.startEmail, etc.
 *
 * Companion scripts (load before this file via <script defer>):
 *   ui/page-effects.js      → scroll animation, sticky CTA, toast, disclosure, page transition
 *   ui/form-interactions.js → form validation, submission, success state
 *   ui/pi-maps.js           → Google Maps + IoT Support (self-init on support page only)
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

  // ─── Helpers (from PiHelpers — fallback if helpers.js not loaded) ──────
  var _h = window.PiHelpers || {};
  var safeCall =
    _h.safeCall ||
    function (fnName, args) {
      if (typeof global[fnName] === "function") {
        return global[fnName].apply(null, args || []);
      }
      console.warn("[PageInteractions] " + fnName + " not found — make sure contacts.js is loaded.");
    };
  var directText =
    _h.directText ||
    function (el) {
      var text = "";
      el.childNodes.forEach(function (node) {
        if (node.nodeType === 3) text += node.nodeValue;
      });
      return text.trim();
    };
  var findByText =
    _h.findByText ||
    function (tag, text) {
      var els = document.querySelectorAll(tag);
      var results = [];
      var lower = text.toLowerCase();
      els.forEach(function (el) {
        if (directText(el).toLowerCase().indexOf(lower) !== -1) results.push(el);
      });
      return results;
    };

  /** Attach click to buttons/links whose text matches a keyword */
  function bindByText(tag, text, handler) {
    var matched = findByText(tag, text);
    matched.forEach(function (el) {
      el.addEventListener("click", handler);
    });
    return matched.length;
  }

  // ─── 1. Get a Quote CTA → navigate to /quote page ─────────────────────────
  function bindQuoteButtons() {
    bindByText("button", "get a quote", function (e) {
      e.preventDefault();
      if (window.SpaRouter) {
        window.SpaRouter.navigate("/quote/");
      } else {
        window.location.href = "/quote";
      }
    });
    bindByText("button", "request a quote", function (e) {
      e.preventDefault();
      if (window.SpaRouter) {
        window.SpaRouter.navigate("/quote/");
      } else {
        window.location.href = "/quote";
      }
    });
    bindByText("button", "get quote", function (e) {
      e.preventDefault();
      if (window.SpaRouter) {
        window.SpaRouter.navigate("/quote/");
      } else {
        window.location.href = "/quote";
      }
    });
  }

  // ─── WhatsApp deep-link with source tracking ─────────────────────────────────
  function openWhatsAppWithPreset(msg, source) {
    if (window.Contacts && typeof window.Contacts.contactsWhatsApp === "function") {
      var url = window.Contacts.contactsWhatsApp({ source: source || "", message: msg || "" });
      window.open(url, "_blank");
      return;
    }
    var phone = window.Contacts && window.Contacts.whatsapp ? window.Contacts.whatsapp : "";
    var prefix = source ? " [" + source + "]" : "";
    var text = encodeURIComponent((msg || "Hi YuKoLi") + prefix);
    var url = phone ? "https://wa.me/" + phone.replace(/\D/g, "") + "?text=" + text : "https://wa.me/?text=" + text;
    window.open(url, "_blank");
  }

  // ─── 2. WhatsApp / Contact channel buttons ────────────────────────────────────
  function bindContactButtons() {
    bindByText("button", "whatsapp", function (e) {
      e.preventDefault();
      openWhatsAppWithPreset("", "quote-btn");
    });
    bindByText("button", "consult an engineer", function (e) {
      e.preventDefault();
      openWhatsAppWithPreset("", "consult-btn");
    });
    bindByText("button", "contact sales", function (e) {
      e.preventDefault();
      openWhatsAppWithPreset("", "sales-btn");
    });

    // Footer icon links (public=home, mail=email, contact_support=whatsapp)
    var iconLinks = document.querySelectorAll('a[href="#"]');
    iconLinks.forEach(function (link) {
      var icon = link.querySelector(".material-symbols-outlined");
      if (!icon) return;
      var iconName = icon.textContent.trim();
      if (iconName === "mail" || iconName === "alternate_email") {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          safeCall("startEmail");
        });
      } else if (iconName === "contact_support" || iconName === "share") {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          openWhatsAppWithPreset("", "footer-icon");
        });
      } else if (iconName === "public") {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          if (window.SpaRouter) {
            window.SpaRouter.navigate("/home/");
          } else {
            window.location.href = "/";
          }
        });
      }
    });
  }

  // ─── 3. Navigation CTA buttons ────────────────────────────────────────────────
  function bindNavCTAs() {
    bindByText("button", "get blueprint", function (e) {
      e.preventDefault();
      var formSection = document.getElementById("download-form") || document.querySelector("form");
      if (formSection) {
        formSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    bindByText("button", "get the free blueprint", function (e) {
      e.preventDefault();
      var formSection = document.querySelector("form");
      if (formSection) {
        formSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    bindByText("button", "view summary", function () {
      var section = document.querySelector("section:nth-of-type(2)") || document.querySelector(".bg-slate-100");
      if (section) section.scrollIntoView({ behavior: "smooth" });
    });

    bindByText("button", "explore all stories", function (e) {
      e.preventDefault();
      var grid =
        document.querySelector("#case-grid") ||
        document.querySelector(".grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3");
      if (grid) grid.scrollIntoView({ behavior: "smooth" });
    });
  }

  // ─── A. CTA Hover class — auto-tag primary orange buttons ────────────────────
  function addCTAHoverClass() {
    var selectors = [
      "button.bg-primary",
      "a.bg-primary",
      'button[class*="bg-primary"]',
      'a[class*="bg-primary"]',
      'button[class*="bg-\\[#ec5b13\\]"]',
      'button[class*="bg-\\[#f26522\\]"]',
      'button[class*="bg-orange"]',
    ];
    selectors.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (el) {
          if (!el.classList.contains("btn-cta")) {
            el.classList.add("btn-cta");
          }
        });
      } catch (e) {
        /* ignore invalid selector on older engines */
      }
    });
  }

  // ─── Bootstrap ────────────────────────────────────────────────────────────────
  function init() {
    addCTAHoverClass();
    bindQuoteButtons();
    bindContactButtons();
    bindNavCTAs();

    // Update budget options after translations are applied
    _spaOn(
      document,
      "spa:ready",
      function () {
        if (typeof window.updateBudgetOptions === "function") {
          window.updateBudgetOptions();
        }
      },
      "spa:ready"
    );

    bindAboutVideo();
  }

  function bindAboutVideo() {
    var v = document.getElementById("about-story-video");
    if (!v || v._visBound) return;
    v._visBound = true;

    // Pause when tab is hidden
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) v.pause();
      else if (v._wasInViewport) v.play().catch(function () {});
    });

    // Pause when scrolled out of viewport
    if ("IntersectionObserver" in window) {
      v._wasInViewport = false;
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            var vid = e.target;
            if (e.isIntersecting) {
              vid._wasInViewport = true;
              if (!document.hidden) vid.play().catch(function () {});
            } else {
              vid.pause();
            }
          });
        },
        { threshold: 0.25 }
      ).observe(v);
    }
  }

  // Re-bind on SPA navigation
  _spaOn(document, "spa:load", function () {
    addCTAHoverClass();
    bindAboutVideo();
  });

  if (window.CommonUtils && typeof window.CommonUtils.ready === "function") {
    window.CommonUtils.ready(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ─── Dark Mode ────────────────────────────────────────────────────────────
  /**
   * toggleDarkMode() — Toggle dark/light mode and persist preference.
   * The anti-FOSC inline script in <head> reads localStorage on page load
   * before first paint, so there is no flash when the user returns to the page.
   */
  function toggleDarkMode() {
    var html = document.documentElement;
    var isDark = html.classList.toggle("dark");
    localStorage.setItem("darkMode", isDark ? "true" : "false");

    document.querySelectorAll("[data-dark-toggle]").forEach(function (el) {
      el.textContent = isDark ? "light_mode" : "dark_mode";
    });

    return isDark;
  }

  window.PageInteractions = { init: init, toggleDarkMode: toggleDarkMode };
  window.toggleDarkMode = toggleDarkMode;
})(window);
