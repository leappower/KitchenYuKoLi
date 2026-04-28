/**
 * page-interactions.js — Unified page button & form interaction layer
 * IIFE build for src/ static HTML (no build tools)
 *
 * Depends on (load before this file):
 *   contacts.js    → window.Contacts, window.startWhatsApp, window.startEmail, etc.
 *   smart-popup.js → window.showSmartPopupManual, window.submitContactForm
 *
 * Features:
 *   1. CTA button bindings (Get a Quote, WhatsApp, Download, etc.)
 *   2. Form submission wiring (catalog, quote, landing, case-studies download)
 *   3. Interactive component logic (ROI calculator, case-study filter, calendar slot)
 *   4. console.log placeholders for unimplemented features
 *
 * Usage:
 *   <script src="../../assets/js/page-interactions.js"></script>
 *   Called automatically on DOMContentLoaded.
 */
(function (global) {
  "use strict";

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Safely call a function if it exists on window */
  function safeCall(fnName, args) {
    if (typeof global[fnName] === "function") {
      return global[fnName].apply(null, args || []);
    }
    console.warn("[PageInteractions] " + fnName + " not found — make sure contacts.js / smart-popup.js is loaded.");
  }

  /** Attach click listener to all elements matching selector, only if found */
  // helper removed: was previously unused

  /**
   * Collect only the direct Text-node content of an element, ignoring child
   * elements such as <span class="material-symbols-outlined"> icons.
   * This prevents icon text (e.g. "calculate", "arrow_forward") from
   * polluting the label match and causing bindByText() to miss buttons.
   */
  function directText(el) {
    var text = "";
    el.childNodes.forEach(function (node) {
      if (node.nodeType === 3 /* TEXT_NODE */) {
        text += node.nodeValue;
      }
    });
    return text.trim();
  }

  /** Find buttons/links by their visible text content (case-insensitive, trimmed).
   *  Matches against direct text nodes only, so icon <span> children are ignored. */
  function findByText(tag, text) {
    var els = document.querySelectorAll(tag);
    var results = [];
    var lower = text.toLowerCase();
    els.forEach(function (el) {
      if (directText(el).toLowerCase().indexOf(lower) !== -1) {
        results.push(el);
      }
    });
    return results;
  }

  /** Attach click to buttons/links whose text matches a keyword */
  function bindByText(tag, text, handler) {
    var matched = findByText(tag, text);
    matched.forEach(function (el) {
      el.addEventListener("click", handler);
    });
    return matched.length;
  }

  // ─── 1. Get a Quote / Request a Quote CTA ────────────────────────────────────
  function bindQuoteButtons() {
    var _count = 0;
    _count += bindByText("button", "get a quote", function (e) {
      e.preventDefault();
      safeCall("showSmartPopupManual");
    });
    _count += bindByText("button", "request a quote", function (e) {
      e.preventDefault();
      safeCall("showSmartPopupManual");
    });
    _count += bindByText("button", "get quote", function (e) {
      e.preventDefault();
      safeCall("showSmartPopupManual");
    });
    _count += bindByText("button", "speak with an expert", function (e) {
      e.preventDefault();
      safeCall("showSmartPopupManual");
    });
    _count += bindByText("button", "request full audit data", function (e) {
      e.preventDefault();
      safeCall("showSmartPopupManual");
    });
    _count += bindByText("button", "request a physical copy", function (e) {
      e.preventDefault();
      safeCall("showSmartPopupManual");
    });
  }

  // ─── WhatsApp deep-link with source tracking ─────────────────────────────────
  /** Open WhatsApp with source tracking + optional preset message.
   *  @param {string} [msg] - Custom message to append after source info.
   *  @param {string} [source] - Location description (e.g. "contact-card", "cta").
   */
  function openWhatsAppWithPreset(msg, source) {
    if (global.Contacts && typeof global.Contacts.contactsWhatsApp === "function") {
      var url = global.Contacts.contactsWhatsApp({ source: source || "", message: msg || "" });
      global.open(url, "_blank");
      return;
    }
    // Fallback if Contacts not loaded yet
    var phone = global.Contacts && global.Contacts.whatsapp ? global.Contacts.whatsapp : "";
    var text = encodeURIComponent(msg || "Hi YuKoLi");
    var url = phone ? "https://wa.me/" + phone.replace(/\D/g, "") + "?text=" + text : "https://wa.me/?text=" + text;
    global.open(url, "_blank");
  }

  // ─── 2. WhatsApp / Contact channel buttons ────────────────────────────────────
  function bindContactButtons() {
    var _count = 0;

    // WhatsApp buttons / links — with source tracking (handled by contacts.js initWhatsAppLinks for <a> tags,
    // here we handle <button> elements only)
    _count += bindByText("button", "whatsapp", function (e) {
      e.preventDefault();
      openWhatsAppWithPreset("", "quote-btn");
    });
    _count += bindByText("button", "consult an engineer", function (e) {
      e.preventDefault();
      openWhatsAppWithPreset("", "consult-btn");
    });
    // Contact Sales → WhatsApp
    _count += bindByText("button", "contact sales", function (e) {
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
        _count++;
      } else if (iconName === "contact_support" || iconName === "share") {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          openWhatsAppWithPreset("", "footer-icon");
        });
        _count++;
      } else if (iconName === "public") {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          global.location.href = "/";
        });
        _count++;
      }
    });
  }

  // ─── 3. Navigation CTA buttons ────────────────────────────────────────────────
  function bindNavCTAs() {
    var _count = 0;

    // "Get Blueprint" on landing pages → scroll to form section
    _count += bindByText("button", "get blueprint", function (e) {
      e.preventDefault();
      var formSection = document.getElementById("download-form") || document.querySelector("form");
      if (formSection) {
        formSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        safeCall("showSmartPopupManual");
      }
    });

    // "Get the Free Blueprint" hero CTA → scroll to form
    _count += bindByText("button", "get the free blueprint", function (e) {
      e.preventDefault();
      var formSection = document.querySelector("form");
      if (formSection) {
        formSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    // "Download Now" anchor link already has href="#download-form" — no JS needed for PC
    // "View Summary" → page-internal scroll to strategy preview section
    _count += bindByText("button", "view summary", function () {
      var section = document.querySelector("section:nth-of-type(2)") || document.querySelector(".bg-slate-100");
      if (section) section.scrollIntoView({ behavior: "smooth" });
    });

    // "Explore All Stories" → scroll down to case study grid
    _count += bindByText("button", "explore all stories", function (e) {
      e.preventDefault();
      var grid =
        document.querySelector("#case-grid") ||
        document.querySelector(".grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3");
      if (grid) grid.scrollIntoView({ behavior: "smooth" });
    });
  }

  // ─── 4. Page-jump buttons ─────────────────────────────────────────────────────
  // 暂时未被使用 — 页面中无匹配按钮 (Start ROI Calculator / View Hardware Stack 等)
  function bindPageJumps() {
    var _count = 0;

    _count += bindByText("button", "start roi calculator", function (e) {
      e.preventDefault();
      global.location.href = "/internal/strategy/roi-calculator-pc.html";
    });
    _count += bindByText("button", "launch roi calculator", function (e) {
      e.preventDefault();
      global.location.href = "/internal/strategy/roi-calculator-pc.html";
    });
    _count += bindByText("button", "custom roi analysis", function (e) {
      e.preventDefault();
      global.location.href = "/internal/strategy/roi-calculator-pc.html";
    });

    _count += bindByText("button", "view hardware stack", function (e) {
      e.preventDefault();
      global.location.href = "/products/";
    });
    _count += bindByText("a", "view full inventory", function (e) {
      e.preventDefault();
      global.location.href = "/products/";
    });

    _count += bindByText("button", "view full blueprint", function (e) {
      e.preventDefault();
      global.location.href = "/landing/";
    });
    _count += bindByText("button", "read case study", function (e) {
      e.preventDefault();
      global.location.href = "/landing/";
    });

    _count += bindByText("button", "schedule live demo", function (e) {
      e.preventDefault();
      global.location.href = "/thank-you/";
    });

    _count += bindByText("button", "technical specs", function (e) {
      e.preventDefault();
      global.location.href = "/products/";
    });
  }

  // ─── A. CTA Hover class — auto-tag primary orange buttons ────────────────────
  /**
   * Finds all buttons / <a> elements that have an orange/primary background
   * (bg-primary, bg-[#ec5b13], or inline style) and adds .btn-cta
   * so the CSS hover rule kicks in.
   * Note: bg-[#f26522] selector kept for backward compatibility with legacy markup.
   */
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

  // ─── D. Number counter animation (§3.2) ──────────────────────────────────────
  // 暂时未被使用 — 仅 ROI Calculator 使用，已提取到 ui/pi-roi.js
  // function animateNumber(
  function _unused_animateNumber(el, target, duration, suffix) {
    if (!el) return;
    var start = parseFloat(el.textContent) || 0;
    var startTs = null;
    var suf = suffix || "";
    var isFloat = String(target).indexOf(".") !== -1;
    var frameCount = 0;

    function step(ts) {
      if (!startTs) startTs = ts;
      var progress = Math.min((ts - startTs) / duration, 1);
      // Ease-out cubic
      var ease = 1 - Math.pow(1 - progress, 3);
      var current = start + (target - start) * ease;

      // ✅ Only update DOM every 2 frames (reduces reflow by 50%)
      if (frameCount % 2 === 0) {
        el.textContent = isFloat ? current.toFixed(1) + suf : Math.round(current) + suf;
      }
      frameCount++;

      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ─── 6. Download / Export buttons ─────────────────────────────────────────────
  // 暂时未被使用 — 页面中无 Manual Download / Share with Team / Download PDF 等按钮
  function bindDownloadButtons() {
    // "Manual Download" on thank-you page
    bindByText("button", "manual download", function () {
      safeCall("showNotification", ["Preparing your download…", "success"]);
      // Uncomment when PDF is ready:
    });

    // "Share with Team"
    bindByText("button", "share with team", function () {
      if (navigator.share) {
        navigator
          .share({
            title: "Yukoli 2026 Smart Kitchen Solutions",
            text: "Check out the Yukoli 2026 Catalog — commercial kitchen automation.",
            url: global.location.href,
          })
          .catch(function () {});
      } else {
        // Fallback: copy URL to clipboard
        navigator.clipboard
          .writeText(global.location.href)
          .then(function () {
            safeCall("showNotification", ["Link copied to clipboard!", "success"]);
          })
          .catch(function () {
            safeCall("showNotification", ["Copy link: " + global.location.href, "success"]);
          });
      }
    });

    // "Download PDF" (ESG page)
    bindByText("button", "download pdf", function () {
      safeCall("showNotification", ["ESG Report download coming soon.", "success"]);
    });

    // "Export PDF Report" (ROI Calculator)
    bindByText("button", "export pdf report", function () {
      global.print();
    });

    // "Read the OS Whitepaper"
    bindByText("button", "read the os whitepaper", function () {
      global.location.href = "/support/";
    });
  }

  // ─── 8. Case-study category filter ───────────────────────────────────────────
  // 暂时未被使用 — 页面中无 case-study 筛选按钮
  function initCaseStudyFilter() {
    var filterBar = document.querySelector(".flex.flex-wrap.gap-3");
    if (!filterBar) return;

    var filterBtns = filterBar.querySelectorAll("button");
    if (filterBtns.length < 2) return;

    var cards = document.querySelectorAll(".grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3 > div");
    if (cards.length === 0) return;

    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        // Visual active state
        filterBtns.forEach(function (b) {
          b.classList.remove("bg-primary", "text-white");
          b.classList.add("bg-slate-200", "dark:bg-slate-800");
        });
        btn.classList.add("bg-primary", "text-white");
        btn.classList.remove("bg-slate-200", "dark:bg-slate-800");

        var filterText = btn.textContent.trim().toLowerCase();
        cards.forEach(function (card, idx) {
          if (filterText === "all cases") {
            card.style.display = "";
          } else {
            // Assign categories by index (matches 5:3:2 strategy — first 50% hw, next 30% solutions, last 20% IoT)
            var ratio = idx / cards.length;
            var category = ratio < 0.5 ? "smart hardware" : ratio < 0.8 ? "integrated solutions" : "iot intelligence";
            card.style.display = category === filterText ? "" : "none";
          }
        });
      });
    });
  }

  // ─── 9. Thank-you page: calendar slot selection + Confirm Slot ───────────────
  // 暂时未被使用 — 页面中无 grid-cols-7 日历或 Confirm Slot 按钮
  function initCalendarWidget() {
    var calendarBtns = document.querySelectorAll(".grid.grid-cols-7 button");
    var timeBtns = document.querySelectorAll(".w-full.md\\:w-48 button:not(.font-black)");
    var confirmBtn = findByText("button", "confirm slot")[0];

    if (calendarBtns.length === 0 && !confirmBtn) return;
    // calendar selection values removed (were unused)

    calendarBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        calendarBtns.forEach(function (b) {
          b.classList.remove("bg-primary", "text-white", "font-bold");
        });
        btn.classList.add("bg-primary", "text-white", "font-bold");
        // date selected — value not used elsewhere currently
        // selectedDate intentionally not stored to avoid unused globals
      });
    });

    timeBtns.forEach(function (btn) {
      if (btn.textContent.trim() === "Confirm Slot") return;
      btn.addEventListener("click", function () {
        timeBtns.forEach(function (b) {
          if (b.textContent.trim() === "Confirm Slot") return;
          b.classList.remove("border-primary", "bg-primary\\/5", "text-primary", "font-bold");
          b.classList.add("border-slate-200", "dark:border-slate-700", "font-medium");
        });
        btn.classList.add("border-primary", "bg-primary/5", "text-primary", "font-bold");
        btn.classList.remove("border-slate-200", "font-medium");
        // time selected — value not used elsewhere currently
        // selectedTime intentionally not stored to avoid unused globals
      });
    });

    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        // TODO: Replace with Calendly API call when integration is ready
        safeCall("showNotification", ["Slot request submitted! Our team will confirm via email.", "success"]);
      });
    }
  }

  // ─── 10. ESG chart toggle (Monthly / Quarterly) ───────────────────────────────
  // 暂时未被使用 — 页面中无 Monthly/Quarterly 切换按钮
  function initESGChartToggle() {
    var toggleBtns = document.querySelectorAll(".flex.gap-2 button");
    if (toggleBtns.length < 2) return;

    // Check if this looks like the ESG chart toggle
    var isESGPage = toggleBtns[0] && toggleBtns[0].textContent.trim() === "Monthly";
    if (!isESGPage) return;

    var chartBars = document.querySelectorAll(".flex-1.bg-slate-200, .flex-1.bg-primary");

    // Monthly heights
    var monthlyHeights = ["90%", "82%", "75%", "65%", "60%", "52%", "48%", "40%"];
    // Quarterly heights (aggregated)
    var quarterlyHeights = ["88%", "72%", "56%", "40%"];

    toggleBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        toggleBtns.forEach(function (b) {
          b.classList.remove("bg-primary", "text-white");
          b.classList.add("bg-slate-100", "dark:bg-slate-800");
        });
        btn.classList.add("bg-primary", "text-white");
        btn.classList.remove("bg-slate-100", "dark:bg-slate-800");

        var isQuarterly = btn.textContent.trim() === "Quarterly";
        var heights = isQuarterly ? quarterlyHeights : monthlyHeights;

        chartBars.forEach(function (bar, idx) {
          bar.style.height = heights[idx % heights.length] || "50%";
          if (isQuarterly && idx >= 4) {
            bar.style.display = "none";
          } else {
            bar.style.display = "";
          }
        });
      });
    });
  }

  // ─── 12. "Request Technical Blueprint" (PDP) ──────────────────────────────────
  // 暂时未被使用 — 页面中无 "Request Technical Blueprint" 按钮
  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║  NOT-YET-IMPLEMENTABLE FEATURES (yukoli_2026 spec §2.2 / §2.3)             ║
  // ║  These require external assets, services, or libraries not yet integrated. ║
  // ╠══════════════════════════════════════════════════════════════════════════════╣
  // ║  [N1] PDP 3D Hero — requires three.js + GLTF/GLB assets                    ║
  // ║  [N2] PDP Hotspot Spec Pop-overs — requires HTML hotspot markup             ║
  // ║  [N3] PDP IoT Layer Toggle — requires WebSocket/SSE backend                 ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  function bindTechnicalBlueprint() {
    bindByText("button", "request technical blueprint", function (e) {
      e.preventDefault();
      safeCall("showSmartPopupManual");
    });
  }

  // ─── 13. "Watch Video Tour" link ──────────────────────────────────────────────
  // 暂时未被使用 — 页面中无 "Watch Video Tour" 链接
  function bindVideoTour() {
    bindByText("a", "watch video tour", function (e) {
      e.preventDefault();
      safeCall("showNotification", ["Video tour coming soon. Check our LinkedIn page for demos.", "success"]);
    });
  }

  // ─── 14. "Schedule Demo" (IoT support page CTA) ───────────────────────────────
  // 暂时未被使用 — 页面中无 "Schedule Demo" 按钮
  function bindScheduleDemo() {
    bindByText("button", "schedule demo", function (e) {
      e.preventDefault();
      safeCall("showSmartPopupManual");
    });
  }

  // ─── 15. PDP "Schedule Live Demo" → thank-you calendar (already in bindPageJumps)

  // ─── Bootstrap ────────────────────────────────────────────────────────────────
  function init() {
    addCTAHoverClass();
    bindQuoteButtons();
    bindContactButtons();
    bindNavCTAs();
    bindPageJumps();
    bindDownloadButtons();
    bindTechnicalBlueprint();
    bindVideoTour();
    bindScheduleDemo();

    // Page-specific modules
    // ROI Calculator: extracted to pi-roi.js (self-init on DOMContentLoaded)
    initCaseStudyFilter();
    initCalendarWidget();
    initESGChartToggle();
    // IoT Support / Maps: extracted to pi-maps.js (self-init on DOMContentLoaded)

    // Bind smart-popup close button (onclick was removed for CSP compliance)
    var popupCloseBtn = document.getElementById("smart-popup-close");
    if (popupCloseBtn) {
      popupCloseBtn.addEventListener("click", function () {
        safeCall("closeSmartPopup");
      });
    }

    // Initialise smart-popup engagement tracking (auto-popup system)
    if (global.smartPopup && typeof global.smartPopup.init === "function") {
      global.smartPopup.init();
    }
  }

  if (global.CommonUtils && typeof global.CommonUtils.ready === "function") {
    global.CommonUtils.ready(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ─── Dark Mode ────────────────────────────────────────────────────────────
  /**
   * toggleDarkMode() — Toggle dark/light mode and persist preference.
   *
   * Usage (HTML button):
   *   <button onclick="toggleDarkMode()" aria-label="Toggle dark mode">
   *     <span class="material-symbols-outlined">dark_mode</span>
   *   </button>
   *
   * The anti-FOSC inline script in <head> reads localStorage on page load
   * before first paint, so there is no flash when the user returns to the page.
   */
  function toggleDarkMode() {
    var html = document.documentElement;
    var isDark = html.classList.toggle("dark");
    localStorage.setItem("darkMode", isDark ? "true" : "false");

    // Update any toggle button icons (data-dark-toggle attribute)
    document.querySelectorAll("[data-dark-toggle]").forEach(function (el) {
      el.textContent = isDark ? "light_mode" : "dark_mode";
    });

    return isDark;
  }

  // Expose for manual re-init if needed
  global.PageInteractions = { init: init, toggleDarkMode: toggleDarkMode };
  global.toggleDarkMode = toggleDarkMode;

})(window);
