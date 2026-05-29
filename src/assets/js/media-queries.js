/**
 * media-queries.js — Responsive breakpoint cache
 *
 * 所有三档断点 (mobile/tablet/pc) 统一委托给 DeviceUtils 的 matchMedia 实例，
 * 避免维护两套 matchMedia 导致的不一致。
 *
 * 额外的 mqMobileSmall (max-width: 640px) 用于手机竖屏轮播等特殊场景。
 *
 * Usage: <script src="../../assets/js/media-queries.js"></script>
 * Then: window.MediaQueries.mqMobile  (boolean)
 */
(function (_global) {
  "use strict";

  var _mq640 = window.matchMedia("(max-width: 640px)");

  // ─── Getter helpers ──────────────────────────────────────────────

  /** 视口宽度 ≤ 640px（手机竖屏轮播） */
  var mqMobileSmall = _mq640.matches;

  /** 委托到 DeviceUtils 的 matchMedia 实例获取当前设备类型 */
  var mqMobile = false;
  var mqDesktop = false;
  var mqTablet = false;

  function syncFromDeviceUtils() {
    if (typeof DeviceUtils !== "undefined" && DeviceUtils && DeviceUtils.getMqBreakpoints) {
      var bps = DeviceUtils.getMqBreakpoints();
      mqMobile = bps.mobile.matches;
      mqTablet = bps.tablet.matches;
      mqDesktop = bps.pc.matches;
    } else {
      // fallback: 独立 matchMedia
      mqMobile = window.matchMedia("(max-width: 767px)").matches;
      mqTablet = window.matchMedia("(min-width: 768px) and (max-width: 1279px)").matches;
      mqDesktop = window.matchMedia("(min-width: 1280px)").matches;
    }
  }

  // ─── 监听来自 DeviceUtils 的设备变化 ──────────────────────────

  if (typeof DeviceUtils !== "undefined" && DeviceUtils && typeof DeviceUtils.onDeviceChange === "function") {
    DeviceUtils.onDeviceChange(function () {
      syncFromDeviceUtils();
      window.MediaQueries.mqMobile = mqMobile;
      window.MediaQueries.mqMobileSmall = mqMobileSmall;
      window.MediaQueries.mqDesktop = mqDesktop;
      window.MediaQueries.mqTablet = mqTablet;
    });
  }

  // 640 监听保留（独立断点，不在 DeviceUtils 体系内）
  _mq640.addEventListener("change", function (e) {
    mqMobileSmall = e.matches;
    window.MediaQueries.mqMobileSmall = e.matches;
  });

  // 初始同步
  syncFromDeviceUtils();

  window.MediaQueries = {
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
    /** 返回当前是否为移动端（<768px）。等同于 mqMobile，语义更直观。 */
    isMobile: function () {
      return mqMobile;
    },
  };
})(window);
