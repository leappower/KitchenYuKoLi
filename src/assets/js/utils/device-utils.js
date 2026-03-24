/**
 * device-utils.js — 统一的设备判断工具类
 *
 * 功能：
 * - 统一的屏幕尺寸判断（基于视口宽度 window.innerWidth）
 * - 统一的设备类型判断（Mobile / Tablet / PC）
 * - 统一的断点管理（<768 / 768-1279 / >=1280）
 * - 设备特定页面路径生成
 * - 响应式重定向判断
 *
 * 使用方式：
 *   // 判断设备类型
 *   if (DeviceUtils.isMobile()) { ... }
 *   if (DeviceUtils.isTablet()) { ... }
 *   if (DeviceUtils.isPC()) { ... }
 *
 *   // 获取设备类型
 *   var deviceType = DeviceUtils.getDeviceType();
 *   console.log(deviceType); // 'mobile' | 'tablet' | 'pc'
 *
 *   // 获取设备特定页面路径
 *   var devicePath = DeviceUtils.getDevicePagePath('/pages/home/index.html');
 *   console.log(devicePath); // '/pages/home/index-mobile.html' (tablet)
 *
 *   // 判断是否需要重定向
 *   if (DeviceUtils.shouldRedirect('index.html')) {
 *     // 重定向到设备特定页面
 *   }
 *
 * 注意：
 * - 使用 window.innerWidth（视口宽度）而非 screen.width（物理屏幕宽度）
 * - 视口宽度更符合响应式设计，随窗口大小变化
 * - 物理屏幕宽度不随窗口大小变化
 *
 * 依赖：无（纯工具类）
 */

(function (global) {
  "use strict";

  /**
   * 设备类型枚举
   */
  var DeviceType = {
    MOBILE: "mobile",
    TABLET: "tablet",
    PC: "pc",
  };

  /**
   * 断点配置
   * 与 Tailwind 默认断点保持一致
   */
  var Breakpoints = {
    MOBILE_MAX: 767, // < 768px
    TABLET_MIN: 768, // >= 768px
    TABLET_MAX: 1279, // < 1280px
    PC_MIN: 1280, // >= 1280px
  };

  /**
   * 获取当前屏幕宽度（视口宽度）
   * 使用 window.innerWidth 而非 screen.width，因为：
   * - window.innerWidth 是视口宽度（不包括滚动条）
   * - screen.width 是物理屏幕宽度（不随窗口大小变化）
   * - 响应式布局应该基于视口宽度
   *
   * @returns {number} 视口宽度（px）
   */
  function getScreenSize() {
    return window.innerWidth;
  }

  /**
   * 判断当前设备类型
   *
   * @returns {string} DeviceType.MOBILE | DeviceType.TABLET | DeviceType.PC
   */
  function getDeviceType() {
    var width = getScreenSize();

    if (width < Breakpoints.TABLET_MIN) {
      return DeviceType.MOBILE;
    } else if (width < Breakpoints.PC_MIN) {
      return DeviceType.TABLET;
    } else {
      return DeviceType.PC;
    }
  }

  /**
   * 判断是否为 Mobile
   *
   * @returns {boolean} 是否为 Mobile
   */
  function isMobile() {
    return getDeviceType() === DeviceType.MOBILE;
  }

  /**
   * 判断是否为 Tablet
   *
   * @returns {boolean} 是否为 Tablet
   */
  function isTablet() {
    return getDeviceType() === DeviceType.TABLET;
  }

  /**
   * 判断是否为 PC
   *
   * @returns {boolean} 是否为 PC
   */
  function isPC() {
    return getDeviceType() === DeviceType.PC;
  }

  /**
   * 获取设备特定页面文件名
   *
   * @param {string} basePath - 基础路径，如 '/pages/home/index.html'
   * @returns {string} 设备特定路径，如 '/pages/home/index-mobile.html'
   */
  function getDevicePagePath(basePath) {
    // 如果不是标准的 index.html 路径，返回原值
    if (!basePath || !basePath.endsWith("/index.html")) {
      return basePath;
    }

    var deviceType = getDeviceType();
    var suffix;

    switch (deviceType) {
      case DeviceType.MOBILE:
        suffix = "index-mobile.html";
        break;
      case DeviceType.TABLET:
        suffix = "index-tablet.html";
        break;
      case DeviceType.PC:
        suffix = "index-pc.html";
        break;
      default:
        suffix = "index.html";
    }

    return basePath.replace("index.html", suffix);
  }

  /**
   * 判断是否需要重定向到设备特定页面
   *
   * @param {string} currentFile - 当前文件名，如 'index.html' 或 'index-mobile.html'
   * @returns {boolean} 是否需要重定向
   */
  function shouldRedirect(currentFile) {
    // 如果当前文件名为空（目录 URL），不需要重定向
    if (!currentFile || currentFile === "") {
      return false;
    }

    var deviceType = getDeviceType();
    var targetFile;

    switch (deviceType) {
      case DeviceType.MOBILE:
        targetFile = "index-mobile.html";
        break;
      case DeviceType.TABLET:
        targetFile = "index-tablet.html";
        break;
      case DeviceType.PC:
        targetFile = "index-pc.html";
        break;
      default:
        targetFile = "index.html";
    }

    // 特殊情况：PC 访问 index.html 不需要重定向（保持干净 URL）
    if (deviceType === DeviceType.PC && currentFile === "index.html") {
      return false;
    }

    // 如果当前文件不是目标文件，需要重定向
    return currentFile !== targetFile;
  }

  /**
   * 判断是否为目录 URL（SPA 导航使用）
   * 目录 URL 以 '/' 结尾，如 '/products/'
   *
   * @returns {boolean} 是否为目录 URL
   */
  function isDirectoryURL() {
    var pathname = window.location.pathname;
    return pathname.endsWith("/") || pathname === "" || pathname === window.location.pathname;
  }

  // 设备类型变化检测
  var lastDeviceType = getDeviceType();
  var deviceChangeCallbacks = [];

  /**
   * 监听设备类型变化
   * @param {Function} callback - 设备类型变化时的回调函数
   */
  function onDeviceChange(callback) {
    if (typeof callback === "function") {
      deviceChangeCallbacks.push(callback);
    }
  }

  /**
   * 检查设备类型是否变化
   */
  function checkDeviceChange() {
    var currentDeviceType = getDeviceType();
    if (currentDeviceType !== lastDeviceType) {
      lastDeviceType = currentDeviceType;

      // 触发所有回调
      deviceChangeCallbacks.forEach(function (callback) {
        try {
          callback(currentDeviceType, lastDeviceType);
        } catch (e) {
          console.error("[DeviceUtils] Error in device change callback:", e);
        }
      });
    }
  }

  /**
   * 初始化窗口大小变化监听
   */
  function initResizeListener() {
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkDeviceChange, 250); // 防抖250ms
    });

    // 初始检查
    setTimeout(checkDeviceChange, 100);
  }

  // 公开 API
  global.DeviceUtils = {
    DeviceType: DeviceType,
    Breakpoints: Breakpoints,
    getScreenSize: getScreenSize,
    getDeviceType: getDeviceType,
    isMobile: isMobile,
    isTablet: isTablet,
    isPC: isPC,
    getDevicePagePath: getDevicePagePath,
    shouldRedirect: shouldRedirect,
    isDirectoryURL: isDirectoryURL,
    onDeviceChange: onDeviceChange,
    initResizeListener: initResizeListener,
    getLastDeviceType: function () {
      return lastDeviceType;
    },
  };

  // 初始化窗口大小变化监听
  if (typeof window !== "undefined") {
    setTimeout(initResizeListener, 0);
  }
})(typeof window !== "undefined" ? window : global);
