/**
 * floating-actions.js — Yukoli Floating Actions Component
 *
 * 功能：
 * - 回到顶部按钮（滚动 > threshold 时显示）
 * - WhatsApp 按钮（所有设备显示，Mobile 在 Tab Bar 中也有）
 * - LINE 按钮（所有设备显示）
 * - 定时闪烁动画：页面停止滚动 10s 后触发，滚动时取消
 * - 初次显示时触发一次闪烁动画
 *
 * 改为直接注入 DOM（不依赖占位符），SPA 导航后自动保活。
 */

(function (global) {
  "use strict";

  /* ─────────────────────────────────────────────
   * 0. CONFIG
   * ───────────────────────────────────────────── */

  var WHATSAPP_HREF = "https://wa.me/8613163756465";
  var LINE_HREF = "https://line.me/R/ti/p/@yourlineid";
  var SCROLL_THRESHOLD = 300;

  // 可通过 window 覆盖
  if (global.FLOATING_ACTIONS_CONFIG) {
    if (global.FLOATING_ACTIONS_CONFIG.whatsapp) WHATSAPP_HREF = global.FLOATING_ACTIONS_CONFIG.whatsapp;
    if (global.FLOATING_ACTIONS_CONFIG.line) LINE_HREF = global.FLOATING_ACTIONS_CONFIG.line;
    if (global.FLOATING_ACTIONS_CONFIG.threshold) SCROLL_THRESHOLD = global.FLOATING_ACTIONS_CONFIG.threshold;
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

  var SVG_LINE =
    '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M19.365 9.863c.349 0 .63.285.63.631' +
    " 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63" +
    " 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108" +
    "c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63" +
    " 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016" +
    "c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031" +
    "-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94" +
    "c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108" +
    "c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033" +
    ".195 0 .375.104.495.254l2.462 3.33V8.108" +
    "c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0" +
    "c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108" +
    "c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917" +
    "c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63" +
    ".348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63" +
    " 0 .344-.281.629-.629.629M24 10.314" +
    "C24 4.943 18.615.572 12 .572S0 4.943 0 10.314" +
    "c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59" +
    ".12.301.079.766.038 1.08l-.164 1.02" +
    "c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975" +
    'C23.176 14.393 24 12.458 24 10.314"></path>' +
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
      "  z-index: var(--z-fab, 1100);",
      "  display: flex;",
      "  flex-direction: column;",
      "  align-items: center;",
      "  gap: 0.75rem;",
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

      "#fab-line {",
      "  background: #06C755;",
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

      /* Pulse animation */
      "@keyframes fab-pulse {",
      "  0%   { transform: scale(1);    box-shadow: 0 4px 20px rgba(0,0,0,.25), 0 0 0 0 rgba(37,211,102,.7); }",
      "  25%  { transform: scale(1.28); box-shadow: 0 8px 32px rgba(0,0,0,.3),  0 0 0 10px rgba(37,211,102,.3); }",
      "  50%  { transform: scale(1.05); box-shadow: 0 4px 20px rgba(0,0,0,.25), 0 0 0 18px rgba(37,211,102,.1); }",
      "  75%  { transform: scale(1.22); box-shadow: 0 8px 28px rgba(0,0,0,.28), 0 0 0 8px rgba(37,211,102,.25); }",
      "  100% { transform: scale(1);    box-shadow: 0 4px 20px rgba(0,0,0,.25), 0 0 0 0 rgba(37,211,102,0); }",
      "}",

      ".fab-pulsing {",
      "  animation: fab-pulse 1s cubic-bezier(.36,.07,.19,.97) 3 !important;",
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
    this._btnLine = null;
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
    wa.href = WHATSAPP_HREF;
    wa.setAttribute("aria-label", "WhatsApp");
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    wa.innerHTML = SVG_WHATSAPP;

    // LINE
    var line = document.createElement("a");
    line.id = "fab-line";
    line.className = "fab-btn";
    line.href = LINE_HREF;
    line.setAttribute("aria-label", "LINE");
    line.target = "_blank";
    line.rel = "noopener noreferrer";
    line.innerHTML = SVG_LINE;

    // Back to top
    var btt = document.createElement("button");
    btt.id = "fab-backtotop";
    btt.className = "fab-btn";
    btt.setAttribute("aria-label", "Back to top");
    btt.innerHTML = SVG_BACKTOTOP;

    container.appendChild(btt);
    container.appendChild(line);
    container.appendChild(wa);

    document.body.appendChild(container);

    this._container = container;
    this._btnBtt = btt;
    this._btnWa = wa;
    this._btnLine = line;
  };

  FloatingActionsController.prototype._bindButtons = function () {
    var _self = this;

    // Back to top click
    if (this._btnBtt) {
      this._btnBtt.addEventListener("click", function () {
        global.scrollTo({ top: 0, behavior: "smooth" });
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

    global.addEventListener("scroll", onScroll, { passive: true });

    // 初始检查
    this._updateBackToTop();
  };

  FloatingActionsController.prototype._updateBackToTop = function () {
    var visible = global.scrollY > SCROLL_THRESHOLD;
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
    if (!this._btnWa && !this._btnLine) return;

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

    pulse(this._btnWa);
    // LINE 稍微错开 1s
    setTimeout(function () {
      pulse(_self._btnLine);
    }, 1000);

    // 之后每 30s 重复一次（如果不在滚动中）
    _self._pulseTimer = setTimeout(function () {
      if (!_self._isScrolling) _self._triggerPulse();
    }, 30000);
  };

  FloatingActionsController.prototype._cancelPulse = function () {
    clearTimeout(this._pulseTimer);
    this._pulseTimer = null;
    if (this._btnWa) this._btnWa.classList.remove("fab-pulsing");
    if (this._btnLine) this._btnLine.classList.remove("fab-pulsing");
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
  document.addEventListener("spa:load", function () {
    mount();
  });

  // bfcache 恢复
  global.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      mount();
    }
  });

  global.FloatingActions = { mount: mount };
})(window);
