/**
 * media-queries.js — Responsive breakpoint cache (IIFE build for src/ static HTML)
 * Synced from: src/assets/media-queries.js
 * Global: window.MediaQueries
 *
 * Usage: <script src="../../assets/js/media-queries.js"></script>
 * Then: window.MediaQueries.mqMobile  (boolean)
 */
(function (global) {
  "use strict";

  // ─── matchMedia 缓存 ──────────────────────────────────────────────────────────
  // 将 window.matchMedia 结果缓存为布尔变量，避免在每次渲染 / 事件回调里重复触发
  // 布局计算。通过 'change' 事件保持与实际视口同步。
  var _mq768 = global.matchMedia("(max-width: 768px)");
  var _mq640 = global.matchMedia("(max-width: 640px)");
  var _mq1024 = global.matchMedia("(min-width: 1024px)");
  var _mq768min = global.matchMedia("(min-width: 768px)");

  /** 视口宽度 ≤ 768px */
  var mqMobile = _mq768.matches;
  /** 视口宽度 ≤ 640px（手机竖屏轮播） */
  var mqMobileSmall = _mq640.matches;
  /** 视口宽度 ≥ 1024px */
  var mqDesktop = _mq1024.matches;
  /** 视口宽度 ≥ 768px（平板以上） */
  var mqTablet = _mq768min.matches;

  _mq768.addEventListener("change", function (e) {
    mqMobile = e.matches;
    global.MediaQueries.mqMobile = e.matches;
  });
  _mq640.addEventListener("change", function (e) {
    mqMobileSmall = e.matches;
    global.MediaQueries.mqMobileSmall = e.matches;
  });
  _mq1024.addEventListener("change", function (e) {
    mqDesktop = e.matches;
    global.MediaQueries.mqDesktop = e.matches;
  });
  _mq768min.addEventListener("change", function (e) {
    mqTablet = e.matches;
    global.MediaQueries.mqTablet = e.matches;
  });

  global.MediaQueries = {
    get mqMobile() {
      return mqMobile;
    },
    get mqMobileSmall() {
      return mqMobileSmall;
    },
    get mqDesktop() {
      return mqDesktop;
    },
    get mqTablet() {
      return mqTablet;
    },
    /** 返回当前是否为移动端（≤768px）。等同于 mqMobile，语义更直观。 */
    isMobile: function () {
      return mqMobile;
    },
  };
})(window);
