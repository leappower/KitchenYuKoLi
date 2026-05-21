/**
 * page-effects.js — Scroll animation, sticky CTA, progressive disclosure, toast, page transition
 * Extracted from page-interactions.js; self-initializes on DOMContentLoaded.
 *
 * Depends on (may be loaded after this file):
 *   contacts.js → used via safeCall() at runtime
 */
(function (global) {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (key == null) key = evt + ":" + (++_spaRegs.__k || (_spaRegs.__k = 1));
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
      console.warn("[PageEffects] " + fnName + " not found.");
    };
  var directText =
    _h.directText ||
    function (el) {
      var t = "";
      el.childNodes.forEach(function (n) {
        if (n.nodeType === 3) t += n.nodeValue;
      });
      return t.trim();
    };
  var findByText =
    _h.findByText ||
    function (tag, text) {
      var els = document.querySelectorAll(tag),
        r = [],
        l = text.toLowerCase();
      els.forEach(function (el) {
        if (directText(el).toLowerCase().indexOf(l) !== -1) r.push(el);
      });
      return r;
    };

  // ─── F1. Scroll-in Animation — IntersectionObserver fade-in-up ──────────────
  /**
   * 为页面内带有 [data-animate] 属性、或常见 section / .card / .grid > div 元素
   * 添加 fade-in-up 进入动画。
   * 依赖 styles.css 中已有的 .animate-hidden / .animate-visible 类（若无则动态注入）。
   */
  function initScrollAnimation() {
    // Inject keyframe + utility classes if not already present
    if (!document.getElementById("pi-scroll-anim-style")) {
      // [style in components.css]
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
  /* function initStickyCTA() { DISABLED */
  /*
    // Skip on form-heavy pages (thank-you / quote) and email-only pages
    var path = window.location.pathname;
    var skipPages = ["thank-you", "quote", "emails", "linkedin"];
    for (var i = 0; i < skipPages.length; i++) {
      if (path.indexOf(skipPages[i]) !== -1) return;
    }

    // Inject styles
    if (!document.getElementById("pi-sticky-cta-style")) {
    // [style in components.css]
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

    // If footer nav bar exists, offset sticky-cta above it
    var footerBar = document.querySelector('footer[data-component="footer"] .fixed');
    if (footerBar) {
      var updateOffset = function () {
        var h = footerBar.offsetHeight;
        bar.style.bottom = h + 'px';
      };
      updateOffset();
      new ResizeObserver(updateOffset).observe(footerBar);
    }

    var dismissed = false;
    var shown = false;

    function showBar() {
      if (dismissed) return;
      bar.classList.add("visible");
      shown = true;
    }
    function hideBar() {
      bar.classList.remove("visible");
      shown = false;
    }

    var lastScrollTime = 0;
    var scrollThrottle = 100; // 每 100ms 最多检查一次（10 times/sec）

    window.addEventListener(
      "scroll",
      function () {
        if (dismissed) return;
        var now = Date.now();
        if (now - lastScrollTime < scrollThrottle) return;
        lastScrollTime = now;

        if (window.scrollY > 200 && !shown) showBar();
        if (window.scrollY <= 200 && shown) hideBar();
      },
      { passive: true }
    );

    document.getElementById("sc-quote-btn").addEventListener("click", function () {
      if (window.SpaRouter) {
        window.SpaRouter.navigate("/quote/");
      } else {
        window.location.href = "/quote";
      }
    });
    document.getElementById("sc-close-btn").addEventListener("click", function () {
      dismissed = true;
      hideBar();
    });
  }
  */

  // ─── F3. Progressive Disclosure ──────────────────────────────────────────────
  /**
   * 为带有 [data-expand] 属性（或 "Show More" / "Read More" 文本）的按钮
   * 实现展开/收起逻辑。目标内容由 data-expand-target 指向，或紧跟的 .expandable 容器。
   */
  function initProgressiveDisclosure() {
    // Inject collapse styles
    if (!document.getElementById("pi-expand-style")) {
      // [style in components.css]
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
      // [style in components.css]
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
    window.showNotification = showToast;
  }

  // ─── F7. Page Transition (fade between pages) ─────────────────────────────────
  /**
   * 点击站内链接时，先触发页面 fade-out，再跳转，实现过渡动画。
   * 限于同源内部链接（.html），避免影响外部跳转。
   */
  function initPageTransition() {
    // Inject fade animation CSS
    if (!document.getElementById("pi-transition-style")) {
      // [style in components.css]
    }

    // Fade in on load
    document.body.classList.add("page-fade-in");

    // Navigation is handled entirely by SpaRouter.
    // When SpaRouter is present, do NOT register a document click handler —
    // doing so creates two systems fighting over the same navigation event.
    // If SpaRouter is absent (e.g. legacy page), fall back to fade+redirect.
    if (window.SpaRouter) return;

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

      // If another handler (e.g. SpaRouter) already handled this click,
      // don't interfere with a second redirect.
      if (e.defaultPrevented) return;

      e.preventDefault();
      document.body.classList.add("page-fade-out");
      setTimeout(function () {
        window.location.href = href;
      }, 200);
    });
  }

  // ─── Bootstrap ────────────────────────────────────────────────────────────────
  function init() {
    initToastSystem(); // must be first — others use it
    initScrollAnimation();
    // initStickyCTA(); // disabled
    initProgressiveDisclosure();
    initPageTransition();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  _spaOn(document, "spa:load", init, "spa:load:init");
})(window);
