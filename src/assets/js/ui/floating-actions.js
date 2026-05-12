/**
 * floating-actions.js — Yukoli Floating Actions Component
 *
 * 功能：
 * - 回到顶部按钮（滚动 > threshold 时显示）
 * - WhatsApp 按钮（所有设备显示，Mobile 在 Tab Bar 中也有）
 * - 定时闪烁动画：页面停止滚动 10s 后触发，滚动时取消
 * - 初次显示时触发一次闪烁动画
 *
 * 改为直接注入 DOM（不依赖占位符），SPA 导航后自动保活。
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

  /* ─────────────────────────────────────────────
   * 0. CONFIG
   * ───────────────────────────────────────────── */

  var WHATSAPP_HREF = "https://wa.me/" + (window.Contacts ? window.Contacts.whatsapp : "8613163756465");
  var SCROLL_THRESHOLD = 300;

  // 可通过 window 覆盖
  if (window.FLOATING_ACTIONS_CONFIG) {
    if (window.FLOATING_ACTIONS_CONFIG.whatsapp) WHATSAPP_HREF = window.FLOATING_ACTIONS_CONFIG.whatsapp;
    if (window.FLOATING_ACTIONS_CONFIG.threshold) SCROLL_THRESHOLD = window.FLOATING_ACTIONS_CONFIG.threshold;
  }

  /** Build tracked WhatsApp URL via Contacts module (or fallback to static) */
  function buildWhatsAppUrl() {
    if (window.Contacts && typeof window.Contacts.contactsWhatsApp === "function") {
      return window.Contacts.contactsWhatsApp({ source: "悬浮按钮" });
    }
    return WHATSAPP_HREF;
  }

  /* ─────────────────────────────────────────────
   * 1. SVG ICONS
   * ───────────────────────────────────────────── */

  var SVG_WHATSAPP =
    '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15' +
    "-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475" +
    "-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52" +
    ".149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207" +
    "-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372" +
    "-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487" +
    ".709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413" +
    ".248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" +
    "m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648" +
    "-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898" +
    "a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" +
    "m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945" +
    "L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893" +
    'a11.821 11.821 0 00-3.48-8.413Z"></path>' +
    "</svg>";

  var SVG_BACKTOTOP =
    '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M5 15l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>' +
    "</svg>";

  /* ─────────────────────────────────────────────
   * 2. STYLES
   * ───────────────────────────────────────────── */

  function injectStyles() {
    if (document.getElementById("floating-actions-styles")) return;
    var style = document.createElement("style");
    style.id = "floating-actions-styles";
    style.textContent = [
      "#floating-actions-container {",
      "  position: fixed;",
      "  right: 1rem;",
      "  bottom: 5rem;",
      "  @media (max-width: 767px) { right: 1.25rem; }",
      "  z-index: var(--z-fab, 1100);",
      "  display: flex;",
      "  flex-direction: column;",
      "  align-items: center;",
      "  gap: 0.75rem;",
      "}",
      "@media (max-width: 767px) {",
      "  #floating-actions-container { bottom: 7.5rem; }",
      "}",

      "#floating-actions-container .fab-btn {",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  width: 3.5rem;",
      "  height: 3.5rem;",
      "  border-radius: 9999px;",
      "  box-shadow: 0 4px 20px rgba(0,0,0,.25);",
      "  transition: transform .2s ease, box-shadow .2s ease;",
      "  flex-shrink: 0;",
      "  text-decoration: none;",
      "}",

      "#floating-actions-container .fab-btn:hover {",
      "  transform: scale(1.15);",
      "}",

      "#floating-actions-container .fab-btn:active {",
      "  transform: scale(0.93);",
      "}",

      "#fab-whatsapp {",
      "  background: #25D366;",
      "  color: #fff;",
      "}",

      "#fab-backtotop {",
      "  background: #fff;",
      "  color: #1e293b;",
      "  box-shadow: 0 4px 20px rgba(0,0,0,.18);",
      "  border: none;",
      "  cursor: pointer;",
      "  opacity: 0;",
      "  pointer-events: none;",
      "  transform: scale(0) translateY(8px);",
      "  transition: opacity .3s ease, transform .3s ease, box-shadow .2s ease;",
      "}",

      "#fab-backtotop.visible {",
      "  opacity: 1;",
      "  pointer-events: auto;",
      "  transform: scale(1) translateY(0);",
      "}",

      "#fab-backtotop:hover {",
      "  box-shadow: 0 6px 24px rgba(0,0,0,.22);",
      "}",

      /* Pulse animation — gentle, single pulse */
      "@keyframes fab-pulse {",
      "  0%   { transform: scale(1);    box-shadow: 0 4px 20px rgba(0,0,0,.25), 0 0 0 0 rgba(37,211,102,.6); }",
      "  40%  { transform: scale(1.12); box-shadow: 0 6px 24px rgba(0,0,0,.28), 0 0 0 10px rgba(37,211,102,.2); }",
      "  100% { transform: scale(1);    box-shadow: 0 4px 20px rgba(0,0,0,.25), 0 0 0 16px rgba(37,211,102,0); }",
      "}",

      ".fab-pulsing {",
      "  animation: fab-pulse 1.2s cubic-bezier(.36,.07,.19,.97) 1 !important;",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────────
   * 3. HELPERS
   * ───────────────────────────────────────────── */

  function debounce(func, wait) {
    var timeout;
    return function () {
      var ctx = this,
        args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        func.apply(ctx, args);
      }, wait);
    };
  }

  /* ─────────────────────────────────────────────
   * 4. CONTROLLER
   * ───────────────────────────────────────────── */

  function FloatingActionsController() {
    this.backToTopVisible = false;
    this._pulseTimer = null;
    this._scrollIdleTimer = null;
    this._firstPulseDone = false;
    this._isScrolling = false;
    this._container = null;
    this._btnBtt = null;
    this._btnWa = null;
  }

  FloatingActionsController.prototype.init = function () {
    injectStyles();
    this._createDOM();
    this._bindButtons();
    this._bindScroll();
    this._scheduleFirstPulse();
  };

  FloatingActionsController.prototype._createDOM = function () {
    if (document.getElementById("floating-actions-container")) return;

    var container = document.createElement("div");
    container.id = "floating-actions-container";

    // WhatsApp
    var wa = document.createElement("a");
    wa.id = "fab-whatsapp";
    wa.className = "fab-btn";
    wa.href = buildWhatsAppUrl();
    wa.setAttribute("aria-label", "WhatsApp");
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    wa.innerHTML = SVG_WHATSAPP;

    // Back to top
    var btt = document.createElement("button");
    btt.id = "fab-backtotop";
    btt.className = "fab-btn";
    btt.setAttribute("aria-label", "Back to top");
    btt.innerHTML = SVG_BACKTOTOP;

    container.appendChild(btt);
    container.appendChild(wa);

    document.body.appendChild(container);

    this._container = container;
    this._btnBtt = btt;
    this._btnWa = wa;
  };

  FloatingActionsController.prototype._bindButtons = function () {
    var _self = this;

    // Back to top click
    if (this._btnBtt) {
      this._btnBtt.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
    // WhatsApp click — build tracked URL dynamically (captures current page)
    if (this._btnWa) {
      this._btnWa.addEventListener("click", function (e) {
        e.preventDefault();
        var url = buildWhatsAppUrl();
        window.open(url, "_blank", "noopener,noreferrer");
      });
    }
  };

  FloatingActionsController.prototype._bindScroll = function () {
    var _self = this;

    var onScroll = debounce(function () {
      _self._isScrolling = true;
      _self._cancelPulse();
      _self._clearScrollIdleTimer();
      _self._updateBackToTop();

      // 停止滚动后 10s 触发闪烁
      _self._scrollIdleTimer = setTimeout(function () {
        _self._isScrolling = false;
        _self._triggerPulse();
      }, 10000);
    }, 50);

    window.addEventListener("scroll", onScroll, { passive: true });

    // 初始检查
    this._updateBackToTop();
  };

  FloatingActionsController.prototype._updateBackToTop = function () {
    var visible = window.scrollY > SCROLL_THRESHOLD;
    if (visible === this.backToTopVisible) return;
    this.backToTopVisible = visible;
    this._animateBackToTop(visible);
  };

  FloatingActionsController.prototype._animateBackToTop = function (show) {
    if (!this._btnBtt) return;

    if (show) {
      this._btnBtt.classList.add("visible");
    } else {
      this._btnBtt.classList.remove("visible");
    }
  };

  FloatingActionsController.prototype._triggerPulse = function () {
    var _self = this;
    if (!this._btnWa) return;

    function pulse(el) {
      if (!el) return;
      el.classList.remove("fab-pulsing");
      // force reflow
      void el.offsetWidth;
      el.classList.add("fab-pulsing");
      el.addEventListener("animationend", function onEnd() {
        el.removeEventListener("animationend", onEnd);
        el.classList.remove("fab-pulsing");
      });
    }

    // Only pulse WhatsApp (primary conversion entry)
    pulse(this._btnWa);

    // Repeat after 30s if not scrolling
    _self._pulseTimer = setTimeout(function () {
      if (!_self._isScrolling) _self._triggerPulse();
    }, 30000);
  };

  FloatingActionsController.prototype._cancelPulse = function () {
    clearTimeout(this._pulseTimer);
    this._pulseTimer = null;
    if (this._btnWa) this._btnWa.classList.remove("fab-pulsing");
  };

  FloatingActionsController.prototype._clearScrollIdleTimer = function () {
    clearTimeout(this._scrollIdleTimer);
    this._scrollIdleTimer = null;
  };

  // 初次显示时触发一次闪烁（延迟 2s，让页面先稳定）
  FloatingActionsController.prototype._scheduleFirstPulse = function () {
    var self = this;
    if (this._firstPulseDone) return;
    setTimeout(function () {
      self._firstPulseDone = true;
      if (!self._isScrolling) self._triggerPulse();
    }, 2000);
  };

  /* ─────────────────────────────────────────────
   * 5. SINGLETON
   * ───────────────────────────────────────────── */

  var _ctrl = null;

  function mount() {
    // Ensure container exists (SPA navigation safety)
    if (!document.getElementById("floating-actions-container")) {
      if (!_ctrl) {
        _ctrl = new FloatingActionsController();
      }
      _ctrl.init();
    }

    // Also handle legacy placeholder-based mount
    var placeholders = document.querySelectorAll('[data-component="floating-actions"]');
    for (var i = 0; i < placeholders.length; i++) {
      var el = placeholders[i];
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
  }

  /* ─────────────────────────────────────────────
   * 6. BOOT
   * ───────────────────────────────────────────── */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  // SPA 导航后保活
  _spaOn(
    document,
    "spa:load",
    function () {
      mount();
    },
    "spa:load:mount"
  );

  // bfcache 恢复
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      mount();
    }
  });

  window.FloatingActions = { mount: mount };
})(window);
