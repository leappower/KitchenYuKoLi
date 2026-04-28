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

  // ─── B. On-blur inline validation (§4) ───────────────────────────────────────
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

  // ─── C. Form success — collapse + green checkmark (§4) ───────────────────────
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
          } else if (typeof global.submitContactForm === "function") {
            // Call submitContactForm immediately (keeps test compatibility),
            // then show the visual success overlay
            global.submitContactForm(e);
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

  // ─── F1. Scroll-in Animation — IntersectionObserver fade-in-up ──────────────
  /**
   * 为页面内带有 [data-animate] 属性、或常见 section / .card / .grid > div 元素
   * 添加 fade-in-up 进入动画。
   * 依赖 styles.css 中已有的 .animate-hidden / .animate-visible 类（若无则动态注入）。
   */
  function initScrollAnimation() {
    // Inject keyframe + utility classes if not already present
    if (!document.getElementById("pi-scroll-anim-style")) {
      var style = document.createElement("style");
      style.id = "pi-scroll-anim-style";
      style.textContent = [
        ".animate-hidden{opacity:0;transform:translate3d(0,28px,0);transition:opacity .4s cubic-bezier(0.4,0,0.2,1),transform .4s cubic-bezier(0.4,0,0.2,1);}",
        ".animate-visible{opacity:1!important;transform:translate3d(0,0,0)!important;}",
        ".animate-delay-1{transition-delay:.1s;}",
        ".animate-delay-2{transition-delay:.2s;}",
        ".animate-delay-3{transition-delay:.3s;}",
      ].join("");
      document.head.appendChild(style);
    }

    if (!("IntersectionObserver" in global)) return; // graceful degradation

    var targets = [].slice.call(
      document.querySelectorAll(
        "[data-animate], section, .feature-card, article, " +
          ".grid > div, .flex.flex-col.gap-8 > div, .flex.flex-col.gap-6 > div"
      )
    );

    // Avoid marking tiny utility wrappers (< 60px tall)
    targets = targets.filter(function (el) {
      return el.offsetHeight > 60;
    });

    targets.forEach(function (el, idx) {
      if (!el.classList.contains("animate-hidden")) {
        el.classList.add("animate-hidden");
        if (idx % 3 === 1) el.classList.add("animate-delay-1");
        if (idx % 3 === 2) el.classList.add("animate-delay-2");
      }
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  // ─── F2. Sticky CTA Bar ───────────────────────────────────────────────────────
  /**
   * 向下滚动 200 px 后，底部出现一个悬浮 CTA 条（"Get a Quote" + 联系按钮）。
   * 仅在没有 #smart-popup-overlay 打开的情况下显示，且在表单页或感谢页上隐藏。
   */
  function initStickyCTA() {
    // Skip on form-heavy pages (thank-you / quote) and email-only pages
    var path = global.location.pathname;
    var skipPages = ["thank-you", "quote", "emails", "linkedin"];
    for (var i = 0; i < skipPages.length; i++) {
      if (path.indexOf(skipPages[i]) !== -1) return;
    }

    // Inject styles
    if (!document.getElementById("pi-sticky-cta-style")) {
      var s = document.createElement("style");
      s.id = "pi-sticky-cta-style";
      s.textContent = [
        "#yukoli-sticky-cta{position:fixed;bottom:0;left:0;right:0;z-index:var(--z-fab, 50);",
        "background:#fff;border-top:2px solid #ec5b13;padding:10px 24px;",
        "display:flex;align-items:center;justify-content:space-between;",
        "box-shadow:0 -4px 24px rgba(0,0,0,.12);",
        "transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);}",
        "#yukoli-sticky-cta.visible{transform:translateY(0);}",
        "#yukoli-sticky-cta .sc-title{font-weight:700;font-size:.95rem;color:#0f172a;}",
        "#yukoli-sticky-cta .sc-sub{font-size:.78rem;color:#64748b;}",
        "#yukoli-sticky-cta .sc-btn{background:#ec5b13;color:#fff;border:none;",
        "padding:9px 20px;border-radius:6px;font-weight:700;font-size:.85rem;",
        "cursor:pointer;white-space:nowrap;}",
        "#yukoli-sticky-cta .sc-btn:hover{opacity:.88;}",
        "#yukoli-sticky-cta .sc-close{background:none;border:none;cursor:pointer;",
        "color:#94a3b8;font-size:18px;padding:4px 8px;line-height:1;}",
      ].join("");
      document.head.appendChild(s);
    }

    var bar = document.getElementById("yukoli-sticky-cta");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "yukoli-sticky-cta";
      bar.setAttribute("role", "complementary");
      bar.setAttribute("aria-label", "Quick contact bar");
      bar.innerHTML = [
        "<div>",
        '<div class="sc-title">Ready to upgrade your kitchen?</div>',
        '<div class="sc-sub">Speak with a Yukoli specialist today</div>',
        "</div>",
        '<div style="display:flex;align-items:center;gap:12px;">',
        '<button class="sc-btn" id="sc-quote-btn">Get a Quote</button>',
        '<button class="sc-close" id="sc-close-btn" aria-label="Close bar">&times;</button>',
        "</div>",
      ].join("");
      document.body.appendChild(bar);
    }

    var dismissed = false;
    var shown = false;

    function showBar() {
      if (dismissed) return;
      var overlay = document.getElementById("smart-popup-overlay");
      if (overlay && overlay.style.display !== "none") return;
      bar.classList.add("visible");
      shown = true;
    }
    function hideBar() {
      bar.classList.remove("visible");
      shown = false;
    }

    var lastScrollTime = 0;
    var scrollThrottle = 100; // 每 100ms 最多检查一次（10 times/sec）

    global.addEventListener(
      "scroll",
      function () {
        if (dismissed) return;
        var now = Date.now();
        if (now - lastScrollTime < scrollThrottle) return;
        lastScrollTime = now;

        if (global.scrollY > 200 && !shown) showBar();
        if (global.scrollY <= 200 && shown) hideBar();
      },
      { passive: true }
    );

    document.getElementById("sc-quote-btn").addEventListener("click", function () {
      safeCall("showSmartPopupManual");
    });
    document.getElementById("sc-close-btn").addEventListener("click", function () {
      dismissed = true;
      hideBar();
    });
  }

  // ─── F3. Progressive Disclosure ──────────────────────────────────────────────
  /**
   * 为带有 [data-expand] 属性（或 "Show More" / "Read More" 文本）的按钮
   * 实现展开/收起逻辑。目标内容由 data-expand-target 指向，或紧跟的 .expandable 容器。
   */
  function initProgressiveDisclosure() {
    // Inject collapse styles
    if (!document.getElementById("pi-expand-style")) {
      var s = document.createElement("style");
      s.id = "pi-expand-style";
      s.textContent = [
        ".expandable{max-height:0;overflow:hidden;",
        "transition:max-height .45s ease,opacity .35s ease;opacity:0;}",
        ".expandable.expanded{max-height:2000px;opacity:1;}",
      ].join("");
      document.head.appendChild(s);
    }

    // 1. Buttons with data-expand attribute
    document.querySelectorAll("[data-expand]").forEach(function (btn) {
      wireExpandBtn(btn);
    });

    // 2. Buttons whose text contains "show more" / "read more" / "view more"
    var textMatches = ["show more", "read more", "view more", "learn more", "see more"];
    document.querySelectorAll("button, a").forEach(function (el) {
      var txt = el.textContent.trim().toLowerCase();
      for (var i = 0; i < textMatches.length; i++) {
        if (txt.indexOf(textMatches[i]) !== -1 && !el.dataset.expandBound) {
          wireExpandBtn(el);
          break;
        }
      }
    });

    function wireExpandBtn(btn) {
      if (btn.dataset.expandBound) return;
      btn.dataset.expandBound = "1";

      // Find target: data-expand-target id → nextElementSibling → parent's next sibling
      var targetId = btn.dataset.expandTarget || btn.getAttribute("data-expand");
      var target = targetId ? document.getElementById(targetId) : null;
      if (!target) target = btn.nextElementSibling;
      if (!target) return;

      if (!target.classList.contains("expandable")) {
        target.classList.add("expandable");
      }

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var isExpanded = target.classList.contains("expanded");
        target.classList.toggle("expanded", !isExpanded);
        btn.setAttribute("aria-expanded", String(!isExpanded));
        var origText = btn.dataset.origText || btn.textContent.trim();
        if (!btn.dataset.origText) btn.dataset.origText = origText;
        btn.textContent = isExpanded ? origText : "Show Less";
      });
    }
  }

  // ─── F6. Toast / Notification System ─────────────────────────────────────────
  /**
   * 轻量级 Toast 通知系统，覆盖 window.showNotification。
   * 支持 type: 'success' | 'error' | 'info'（默认 success）。
   * 自动 3 s 后消失，最多同时显示 3 条。
   */
  function initToastSystem() {
    if (!document.getElementById("pi-toast-style")) {
      var s = document.createElement("style");
      s.id = "pi-toast-style";
      s.textContent = [
        "#yukoli-toast-container{position:fixed;top:80px;right:24px;z-index:var(--z-toast, 400);",
        "display:flex;flex-direction:column;gap:10px;pointer-events:none;}",
        ".yukoli-toast{padding:12px 18px 12px 14px;border-radius:8px;",
        'font-family:"Public Sans",sans-serif;font-size:.875rem;font-weight:600;',
        "display:flex;align-items:center;gap:10px;max-width:340px;",
        "box-shadow:0 8px 24px rgba(0,0,0,.14);pointer-events:auto;",
        "animation:toastIn .3s ease,toastOut .3s ease 2.7s forwards;}",
        ".yukoli-toast.success{background:#16a34a;color:#fff;}",
        ".yukoli-toast.error{background:#dc2626;color:#fff;}",
        ".yukoli-toast.info{background:#0ea5e9;color:#fff;}",
        "@keyframes toastIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:none}}",
        "@keyframes toastOut{from{opacity:1}to{opacity:0;transform:translateX(60px)}}",
      ].join("");
      document.head.appendChild(s);
    }

    var container = document.getElementById("yukoli-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "yukoli-toast-container";
      container.setAttribute("role", "status");
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }

    var ICON_MAP = { success: "check_circle", error: "error", info: "info" };

    function showToast(message, type) {
      type = type || "success";
      // Cap at 3 toasts
      while (container.children.length >= 3) {
        container.removeChild(container.firstChild);
      }
      var toast = document.createElement("div");
      toast.className = "yukoli-toast " + type;
      toast.innerHTML =
        '<span class="material-symbols-outlined" style="font-size:18px;">' +
        (ICON_MAP[type] || "check_circle") +
        "</span>" +
        message;
      container.appendChild(toast);
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 3100);
    }

    // Override / set window.showNotification
    global.showNotification = showToast;
  }

  // ─── F7. Page Transition (fade between pages) ─────────────────────────────────
  /**
   * 点击站内链接时，先触发页面 fade-out，再跳转，实现过渡动画。
   * 限于同源内部链接（.html），避免影响外部跳转。
   */
  function initPageTransition() {
    if (!document.getElementById("pi-transition-style")) {
      var s = document.createElement("style");
      s.id = "pi-transition-style";
      s.textContent = [
        "@keyframes pageFadeOut{from{opacity:1}to{opacity:0}}",
        "@keyframes pageFadeIn{from{opacity:0}to{opacity:1}}",
        ".page-fade-in{animation:pageFadeIn .25s ease;}",
        ".page-fade-out{animation:pageFadeOut .2s ease forwards;}",
      ].join("");
      document.head.appendChild(s);
    }

    // Fade in on load
    document.body.classList.add("page-fade-in");

    // SPA routes — these are handled by SpaRouter, skip fade+redirect
    var SPA_ROUTES = [
      "/",
      "/home/",
      "/products/",
      "/roi/",
      "/quote/",
      "/support/",
      "/products/",
      "/solutions/",
      "/thank-you/",
      "/landing/",
    ];

    document.addEventListener("click", function (e) {
      var link = e.target.closest("a[href]");
      if (!link) return;
      var href = link.getAttribute("href");
      if (
        !href ||
        href.charAt(0) === "#" ||
        href.indexOf("://") !== -1 ||
        href.indexOf("mailto:") === 0 ||
        href.indexOf("tel:") === 0
      )
        return;
      if (link.target === "_blank") return;

      // Normalize path to match SPA route format
      var normalized = href.startsWith("/") ? href : "/" + href;
      if (!normalized.endsWith("/")) {
        // Strip filename to get directory path
        if (normalized.endsWith(".html")) {
          var idx = normalized.lastIndexOf("/");
          normalized = normalized.substring(0, idx + 1);
        } else {
          normalized = normalized + "/";
        }
      }

      // Skip SPA routes — let SpaRouter handle them (no fade, no location.href)
      if (SPA_ROUTES.indexOf(normalized) !== -1) return;

      e.preventDefault();
      document.body.classList.add("page-fade-out");
      setTimeout(function () {
        global.location.href = href;
      }, 200);
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
    bindInlineValidation();
    bindQuoteButtons();
    bindContactButtons();
    bindNavCTAs();
    bindPageJumps();
    bindForms();
    bindDownloadButtons();
    bindTechnicalBlueprint();
    bindVideoTour();
    bindScheduleDemo();

    // ── F1-F8 新功能 ──────────────────────────────────────────────────────────
    initToastSystem(); // F6: Toast notifications (must be first so others can use it)
    initScrollAnimation(); // F1: Scroll-in fade-up animation
    initStickyCTA(); // F2: Sticky bottom CTA bar
    initProgressiveDisclosure(); // F3: Progressive disclosure (show more/less)
    // F4 image lazy loading: handled by main.js LazyLoadingModule (avoids double-observer)
    initPageTransition(); // F7/F8: Page transition fade

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
