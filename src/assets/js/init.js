// init.js - Initialization and user tracking code
// IIFE wrapper for src2 (no build tools)
// This code runs immediately and doesn't wait for DOM ready
// Outputs: window.userActivity

(function (global) {
  "use strict";

  // ============================================
  // User Activity Tracking for Smart Popup System
  // ============================================
  var userActivity = {
    timeOnPage: 0,
    timeOnProductSection: 0,
    inProductSection: false,
    lastActivityTime: Date.now(),
    nonLinkClickCount: 0,
    hasScrolled: false,
    scrollDepth: 0,
    popupShownCount: 0,
    maxPopupsPerSession: 4,
    popupTriggers: {
      timeOnPage: false,
      inProductSection: false,
      nonLinkClick: false,
      manual: false,
    },
  };

  var _activityInterval = null;
  var _activityAbortCtrl = new AbortController();

  function startActivityTracking() {
    // Clear previous interval if any (SPA re-entry)
    if (_activityInterval) clearInterval(_activityInterval);
    _activityInterval = setInterval(function () {
      userActivity.timeOnPage++;
      if (userActivity.inProductSection) userActivity.timeOnProductSection++;
    }, 1000);

    // Abort previous global listeners and create new ones
    _activityAbortCtrl.abort();
    _activityAbortCtrl = new AbortController();
    var opts = { signal: _activityAbortCtrl.signal };

    document.addEventListener(
      "mousemove",
      function () {
        userActivity.lastActivityTime = Date.now();
      },
      opts
    );

    document.addEventListener(
      "scroll",
      function () {
        userActivity.lastActivityTime = Date.now();
        userActivity.hasScrolled = true;
        var winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        userActivity.scrollDepth = (winScroll / height) * 100;
      },
      opts
    );

    document.addEventListener(
      "click",
      function (e) {
        userActivity.lastActivityTime = Date.now();
        var isLink = e.target.closest('a, button, [role="button"]');
        var isInput = e.target.closest("input, textarea, select");
        var isInteractive = e.target.closest(".product-card, .certificate-card, nav, header, .floating-sidebar");
        if (!isLink && !isInput && !isInteractive && userActivity.inProductSection) {
          userActivity.nonLinkClickCount++;
        }
      },
      opts
    );
  }

  // Initial start
  startActivityTracking();

  function setupProductSectionTracking() {
    var productSection = document.getElementById("products");
    if (!productSection) return;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          userActivity.inProductSection = entry.isIntersecting;
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(productSection);
  }

  window.userActivity = userActivity;

  // ============================================
  // IoT Pulse — breathing light on sensor nodes (§3.1)
  // ============================================
  /**
   * Finds elements that look like IoT sensor/node indicators (small dots, icons
   * with keywords in class or aria-label) and adds .iot-pulse so the CSS
   * iot-breathe animation plays automatically.
   *
   * Selectors are intentionally conservative to avoid tagging unrelated elements.
   */
  function initIoTPulse() {
    var selectors = [
      "[data-iot-node]",
      "[data-sensor]",
      ".iot-node",
      ".sensor-dot",
      ".node-indicator",
      '[aria-label*="sensor"]',
      '[aria-label*="node"]',
    ];
    var _count = 0;
    selectors.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (el) {
          if (!el.classList.contains("iot-pulse")) {
            el.classList.add("iot-pulse");
            _count++;
          }
        });
      } catch (e) {
        /* ignore */
      }
    });
  }

  // ============================================
  // GEO Dynamic Hero Content (§2.2)
  // ============================================
  /**
   * Uses navigator.language as a lightweight proxy for geographic region.
   * Southeast-Asian locales → show "8-Month Payback" + WhatsApp hint badge.
   * All other locales      → show "ESG Compliance" + "Energy Star" badge.
   *
   * Looks for a hero section with [data-geo-hero] attribute or the first
   * <section> element, and injects a small badge div if none exists.
   */
  var SEA_LOCALES = ["id", "ms", "th", "vi", "tl", "my", "km", "lo"];

  function getRegionType() {
    var lang = (navigator.language || navigator.userLanguage || "en").toLowerCase();
    var primary = lang.split("-")[0];
    if (SEA_LOCALES.indexOf(primary) !== -1) return "sea";
    // zh-SG, zh-MY → SEA
    if (primary === "zh" && (lang.indexOf("sg") !== -1 || lang.indexOf("my") !== -1)) return "sea";
    return "global";
  }

  function injectGeoBadge(hero, region) {
    if (!hero || hero.querySelector(".geo-badge")) return; // already injected

    var badge = document.createElement("div");
    badge.className = "geo-badge";
    badge.style.cssText = [
      "display:inline-flex",
      "align-items:center",
      "gap:0.5rem",
      "padding:0.35rem 0.875rem",
      "border-radius:9999px",
      "font-size:0.8rem",
      "font-weight:700",
      "letter-spacing:0.01em",
      "margin-top:0.75rem",
      "width:fit-content",
    ].join(";");

    if (region === "sea") {
      badge.style.background = "rgba(236,91,19,0.12)";
      badge.style.color = "#ec5b13";
      badge.style.border = "1px solid rgba(236,91,19,0.3)";
      badge.innerHTML = [
        '<span style="font-size:1rem;">💬</span>',
        "<span>8-Month Payback · WhatsApp Direct Support</span>",
      ].join("");
    } else {
      badge.style.background = "rgba(34,197,94,0.1)";
      badge.style.color = "#16a34a";
      badge.style.border = "1px solid rgba(34,197,94,0.25)";
      badge.innerHTML = [
        '<span style="font-size:1rem;">🌿</span>',
        "<span>ESG Compliant · Energy Star Certified</span>",
      ].join("");
    }

    // Try to insert after the first <h1> or at the beginning of hero
    var h1 = hero.querySelector("h1, h2");
    if (h1 && h1.parentElement) {
      h1.parentElement.insertBefore(badge, h1.nextSibling);
    } else {
      hero.insertBefore(badge, hero.firstChild);
    }
  }

  function initGeoHero() {
    var hero =
      document.querySelector("[data-geo-hero]") ||
      document.querySelector("section:first-of-type") ||
      document.querySelector("header + section") ||
      document.querySelector(".hero") ||
      document.querySelector("#hero");
    if (!hero) return;
    var region = getRegionType();
    injectGeoBadge(hero, region);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupProductSectionTracking();
    initIoTPulse();
    initGeoHero();
  });

  // Re-start tracking on SPA navigation
  document.addEventListener("spa:load", function () {
    startActivityTracking();
    setupProductSectionTracking();
    initIoTPulse();
  });
})(window);
