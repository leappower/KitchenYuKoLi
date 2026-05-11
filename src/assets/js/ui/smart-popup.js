/**
 * smart-popup.js - 智能弹窗系统 + 表单提交
 *
 * IIFE 封装，无构建工具依赖（用于 src2）。
 *
 * 依赖项:
 *   - window.MediaQueries     → 判断是否为移动端
 *   - window.Contacts         → showNotification 通知回调
 *   - window.CommonUtils.tr   → 国际化翻译函数（可选）
 *   - window.translationManager → 当前语言（可选）
 *   - window.DeviceUtils      → 屏幕尺寸工具（可选）
 *   - window.SmartPopupComponent → 组件化初始化桥接（可选）
 *
 * 全局导出:
 *   window.smartPopup, window.userState, window.isTestEnvironment,
 *   window.loadUserState, window.saveUserState, window.trackScrollDepth,
 *   window.trackTimeOnPage, window.showSmartPopupManual, window.closeSmartPopup,
 *   window.submitSmartPopupForm, window.submitContactForm, window.submitViaMailto
 */
(function (global) {
  "use strict";

  // ─── Fallback 工具函数 ─────────────────────────────────────────────────────

  /**
   * 判断当前是否为移动端视口。
   * 优先使用 MediaQueries.isMobile()，其次读取 mqMobile 属性，最后默认 false。
   * @returns {boolean}
   */
  function getMqMobile() {
    return window.MediaQueries
      ? typeof window.MediaQueries.isMobile === "function"
        ? window.MediaQueries.isMobile()
        : !!window.MediaQueries.mqMobile
      : false;
  }

  /**
   * 显示通知消息。
   * 优先使用 Contacts.showNotification，其次使用全局 showNotification。
   * @param {string} message  - 通知文案
   * @param {string} type     - 通知类型（"success" | "error" 等）
   */
  function showNotification(message, type) {
    if (window.Contacts && typeof window.Contacts.showNotification === "function") {
      window.Contacts.showNotification(message, type);
    } else if (typeof window.showNotification === "function") {
      window.showNotification(message, type);
    }
  }

  /**
   * 判断当前是否为测试环境（localhost / 127.0.0.1 / *.local / *test*）。
   * 测试环境下会放宽弹窗限制、显示调试信息。
   * @returns {boolean}
   */
  function isTestEnvironment() {
    var hostname = window.location.hostname;
    return (
      hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes(".local") || hostname.includes("test")
    );
  }

  // ============================================
  // 用户行为追踪 (User Tracking)
  // ============================================

  /**
   * 用户行为状态对象，持久化到 localStorage。
   * 记录访问次数、滚动深度、页面停留时间、产品浏览等信息。
   */
  var userState = {
    firstVisit: Date.now(), // 首次访问时间戳
    visitCount: 0, // 累计访问次数
    scrollDepth: 0, // 当前会话的最大滚动深度 (%)
    timeOnPage: 0, // 当前会话的页面停留时间 (秒)
    productViews: [], // 已浏览的产品 ID 列表
    formInteractions: 0, // 表单交互次数
    popupShown: false, // 是否已展示过弹窗（历史标记）
    popupCount: {
      // 各类型弹窗展示计数
      header: 0,
      hero: 0,
      custom: 0,
      product: {},
    },
    lastPopupTime: 0, // 上次弹窗展示时间戳
    maxScrollReached: 0, // 历史最大滚动深度 (%)
  };

  /**
   * 从 localStorage 加载用户状态，并重置会话级字段。
   */
  function loadUserState() {
    var saved = localStorage.getItem("userState");
    if (saved) {
      var parsed = JSON.parse(saved);
      Object.assign(userState, parsed);
      userState.visitCount++;
      // 会话级字段重置
      userState.timeOnPage = 0;
      userState.scrollDepth = 0;
    } else {
      userState.visitCount = 1;
    }
    saveUserState();
  }

  /** 将当前用户状态持久化到 localStorage。 */
  function saveUserState() {
    localStorage.setItem("userState", JSON.stringify(userState));
  }

  /** 更新当前会话的滚动深度（取最大值），同时更新历史记录。 */
  function trackScrollDepth() {
    var scrollableHeight = document.body.scrollHeight - window.innerHeight;
    var scrollPercent = scrollableHeight > 0 ? Math.round((window.scrollY / scrollableHeight) * 100) : 0;
    userState.scrollDepth = Math.max(userState.scrollDepth, scrollPercent);
    userState.maxScrollReached = Math.max(userState.maxScrollReached, scrollPercent);
  }

  /** 每秒调用一次，递增页面停留时间计数器并持久化。
   *  使用脏标记减少 localStorage 写入频率：每 5 秒保存一次，
   *  页面 hidden 时立即保存。*/
  var _timeOnPageDirty = false;
  var _timeOnPageSaveInterval = setInterval(function () {
    if (_timeOnPageDirty) {
      _timeOnPageDirty = false;
      saveUserState();
    }
  }, 5000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden" && _timeOnPageDirty) {
      _timeOnPageDirty = false;
      saveUserState();
    }
  });

  function trackTimeOnPage() {
    userState.timeOnPage++;
    _timeOnPageDirty = true;
  }

  // ============================================
  // 智能弹窗系统 (Smart Popup System)
  // ============================================

  /**
   * 翻译辅助函数 — 尝试通过 CommonUtils.tr 或全局 t() 翻译，失败时返回 fallback。
   * @param {string} key      - 翻译键
   * @param {string} fallback - 翻译失败时的回退文本
   * @returns {string}
   */
  function translate(key, fallback) {
    if (window.CommonUtils && typeof window.CommonUtils.tr === "function") {
      return window.CommonUtils.tr(key, fallback);
    }
    var value = typeof window.t === "function" ? window.t(key) : key;
    return value && value !== key ? value : fallback;
  }

  /**
   * 获取当前页面语言。
   * 优先级: translationManager.currentLanguage > html[lang] > "zh-CN"。
   * @returns {string}
   */
  function getCurrentLanguage() {
    return (
      (window.translationManager && window.translationManager.currentLanguage) ||
      document.documentElement.lang ||
      "zh-CN"
    );
  }

  /**
   * 根据是否为测试环境，切换调试元素（弹窗计数 / 触发原因）的可见性。
   * 测试环境下显示，生产环境下隐藏。
   */
  function applyPopupVisibility() {
    var isTest = isTestEnvironment();
    var countElement = document.getElementById("popup-today-count");
    var reasonElement = document.getElementById("trigger-reason");
    if (countElement) countElement.style.display = isTest ? "flex" : "none";
    if (reasonElement) reasonElement.style.display = isTest ? "flex" : "none";
  }

  // ─── 智能弹窗核心对象 ──────────────────────────────────────────────────────

  var smartPopup = {
    /**
     * 弹窗运行时状态。
     * 控制弹窗的展示频率、冷却时间、参与度评分、滚动阈值等。
     */
    state: {
      popupShownThisSession: 0, // 当前会话已展示弹窗数
      maxPopupsPerSession: 2, // 每会话最大自动弹窗数
      lastPopupTime: null, // 上次弹窗展示时间戳
      popupCooldown: 30000, // 两次弹窗最小间隔 (ms)
      pageStartAt: Date.now(), // 页面加载时间戳

      autoPopupDisabledForSession: false, // 手动关闭后禁用自动弹窗
      initialDelayReached: false, // 是否已过初始延迟

      engagementScore: 0, // 用户参与度累计评分
      scoreThresholdDesktop: 50, // 桌面端触发弹窗的参与度阈值
      scoreThresholdMobile: 60, // 移动端触发弹窗的参与度阈值
      minScrollPercentBeforeAuto: 20, // 自动弹窗所需的最小滚动深度 (%)

      delayDesktopSeconds: 20, // 桌面端初始延迟 (秒)
      delayMobileSeconds: 25, // 移动端初始延迟 (秒)
      forceShowAfterDesktopSeconds: 35, // 桌面端强制展示时间 (秒)
      forceShowAfterMobileSeconds: 40, // 移动端强制展示时间 (秒)

      isActivelyScrolling: false, // 是否正在滚动（用于避免滚动中弹窗）
      scrollIdleTimer: null, // 滚动空闲计时器

      storageKeys: {
        convertedUntil: "smartPopupConvertedUntil", // 转化抑制截止时间的 localStorage 键
      },
      suppression: {
        convertedUntil: 0, // 转化抑制截止时间戳（48 小时）
      },

      // 缓存值，避免在轮询间隔中频繁读取布局信息
      cachedScrollPercent: 0, // 缓存的滚动百分比
      cachedHasFocus: false, // 缓存的表单焦点状态

      /** 各种行为评分的防重复标志 */
      flags: {
        nonLinkClickScored: false, // 非链接点击是否已评分
        productInteractionScored: false, // 产品交互是否已评分
        scrollDepthScored: false, // 滚动深度是否已评分
        productDwellScored: false, // 产品区域停留是否已评分
        nonHeroDwellScored: false, // 非 Hero 区域停留是否已评分
        friendlyHandlersBound: false, // 关闭事件处理器是否已绑定
      },
    },

    // ── Overlay 创建 ──────────────────────────────────────────────────────

    /**
     * 确保 overlay DOM 元素存在。
     * 如果尚未创建，则注入样式表和弹窗 HTML 结构（包括表单），并绑定提交事件。
     */
    ensureOverlay: function () {
      // 已存在则跳过
      if (document.getElementById("smart-popup-overlay")) return;

      // 注入弹窗样式
      var overlayStyle = document.createElement("style");
      overlayStyle.textContent = [
        // 基础隐藏状态
        "#smart-popup-overlay{visibility:hidden;opacity:0;pointer-events:none;" +
          "position:fixed;inset:0;z-index:var(--z-modal,1000);" +
          "display:flex;align-items:center;justify-content:center;" +
          "background:rgba(0,0,0,.5);backdrop-filter:blur(4px);" +
          "transition:opacity .25s ease,visibility .25s ease}",
        // 展示状态
        "#smart-popup-overlay.show{visibility:visible;opacity:1;pointer-events:auto}",
        // 关闭动画状态
        "#smart-popup-overlay.closing{opacity:0;pointer-events:none;" +
          "transition:opacity .2s ease,visibility 0s .2s;visibility:hidden}",
        // 进入动画
        "@keyframes popup-enter{from{opacity:0;transform:translateY(16px) scale(.97)}" +
          "to{opacity:1;transform:translateY(0) scale(1)}}",
        "#smart-popup-overlay.show > div{animation:popup-enter .25s cubic-bezier(.34,1.2,.64,1) both;" +
          "will-change:transform,opacity}",
        // 退出动画
        "@keyframes popup-exit{from{opacity:1;transform:translateY(0) scale(1)}" +
          "to{opacity:0;transform:translateY(10px) scale(.97)}}",
        "#smart-popup-overlay.closing > div{animation:popup-exit .2s ease forwards}",
      ].join("\n");
      document.head.appendChild(overlayStyle);

      // 注入弹窗 HTML 结构
      var container = document.createElement("div");
      container.innerHTML =
        '<div id="smart-popup-overlay">' +
        // 弹窗内容卡片
        '<div style="background:#fff;border-radius:1rem;padding:2rem;max-width:480px;width:90%;' +
        'position:relative;box-shadow:0 20px 60px rgba(0,0,0,.3);">' +
        // 关闭按钮
        '<button id="smart-popup-close" style="position:absolute;top:.75rem;right:.75rem;' +
        "width:2rem;height:2rem;display:flex;align-items:center;justify-content:center;" +
        "background:#f1f5f9;border:none;border-radius:50%;cursor:pointer;font-size:1rem;" +
        "color:#64748b;transition:background .15s,color .15s,transform .15s;" +
        '-webkit-tap-highlight-color:transparent;touch-action:manipulation;" ' +
        'aria-label="Close">&#x2715;</button>' +
        // 调试：触发原因（测试环境显示）
        '<div id="trigger-reason" style="display:none;font-size:.75rem;color:#94a3b8;' +
        'margin-bottom:.5rem;align-items:center;gap:.25rem;"></div>' +
        // 调试：弹窗计数（测试环境显示）
        '<div id="popup-today-count" style="display:none;font-size:.75rem;color:#94a3b8;' +
        'margin-bottom:.5rem;"></div>' +
        // 标题区域
        '<div style="margin-bottom:1.25rem;">' +
        '<h3 style="font-size:1.25rem;font-weight:700;color:#0f172a;margin:0 0 .25rem;" ' +
        'data-i18n="popup_get_custom_quote">Get a Custom Quote</h3>' +
        '<p style="font-size:.875rem;color:#64748b;margin:0;" ' +
        'data-i18n="popup_tell_us">' +
        "Tell us about your kitchen needs — our team will respond within 24 hours.</p>" +
        "</div>" +
        // 联系表单
        '<form id="smart-popup-form" action="/api/contact" method="POST" ' +
        'style="display:flex;flex-direction:column;gap:.75rem;">' +
        '<input name="name" type="text" placeholder="Full Name *" ' +
        'data-i18n-placeholder="popup_input_fullname" required ' +
        'style="border:1px solid #e2e8f0;border-radius:.5rem;padding:.625rem .75rem;' +
        'font-size:.875rem;outline:none;"/>' +
        '<input name="email" type="email" placeholder="Business Email *" ' +
        'data-i18n-placeholder="popup_input_biz_email" required ' +
        'style="border:1px solid #e2e8f0;border-radius:.5rem;padding:.625rem .75rem;' +
        'font-size:.875rem;outline:none;"/>' +
        '<input name="phone" type="tel" placeholder="Phone / WhatsApp" ' +
        'data-i18n-placeholder="popup_input_phone_wa" ' +
        'style="border:1px solid #e2e8f0;border-radius:.5rem;padding:.625rem .75rem;' +
        'font-size:.875rem;outline:none;"/>' +
        '<input name="country" type="text" placeholder="Country / Region" ' +
        'data-i18n-placeholder="popup_input_country" ' +
        'style="border:1px solid #e2e8f0;border-radius:.5rem;padding:.625rem .75rem;' +
        'font-size:.875rem;outline:none;"/>' +
        '<textarea name="message" placeholder="Describe your requirements\u2026" ' +
        'data-i18n-placeholder="popup_input_requirements" rows="3" ' +
        'style="border:1px solid #e2e8f0;border-radius:.5rem;padding:.625rem .75rem;' +
        'font-size:.875rem;outline:none;resize:vertical;"></textarea>' +
        '<button type="submit" style="background:#2563eb;color:#fff;border:none;' +
        'border-radius:.5rem;padding:.75rem;font-size:.875rem;font-weight:600;cursor:pointer;" ' +
        'data-i18n="form_title">Send Inquiry</button>' +
        "</form>" +
        "</div>" +
        "</div>";
      document.body.appendChild(container.firstElementChild);

      // 绑定表单提交事件
      var popupForm = document.getElementById("smart-popup-form");
      if (popupForm) {
        popupForm.addEventListener("submit", function (event) {
          submitSmartPopupForm(event);
        });
      }
    },

    // ── 初始化 ───────────────────────────────────────────────────────────

    /**
     * 初始化智能弹窗系统。
     * 创建 overlay、加载抑制状态、设置追踪、绑定关闭事件、启动条件轮询。
     */
    init: function () {
      this.ensureOverlay();
      this.state.pageStartAt = Date.now();
      this.loadSuppressionState();
      this.setupTracking();
      this.setupFriendlyCloseHandlers();
      this.checkConditionsLoop();
      this.updateSessionCount();
    },

    /**
     * 带组件桥接的初始化。
     * 如果 SmartPopupComponent 存在，先通过组件初始化，成功后再初始化弹窗。
     * @returns {Promise<boolean>}
     */
    initWithComponent: function () {
      var self = this;
      if (window.SmartPopupComponent) {
        return window.SmartPopupComponent.init().then(function (success) {
          if (success) self.init();
          return success;
        });
      }
      self.init();
      return Promise.resolve(true);
    },

    /**
     * 从 localStorage 加载转化抑制状态。
     * 转化后的用户在 48 小时内不会再次看到自动弹窗。
     */
    loadSuppressionState: function () {
      var storageKey = this.state.storageKeys.convertedUntil;
      this.state.suppression.convertedUntil = Number(localStorage.getItem(storageKey) || 0);
    },

    // ── 参与度评分 ───────────────────────────────────────────────────────

    /**
     * 增加参与度评分。
     * 每个 flagKey 只能被计分一次，避免重复累加。
     * @param {number}  points   - 要增加的分数
     * @param {string}  flagKey  - 防重复标志键（可选）
     */
    addScore: function (points, flagKey) {
      if (flagKey && this.state.flags[flagKey]) return;
      if (flagKey) this.state.flags[flagKey] = true;
      this.state.engagementScore += points;
    },

    /**
     * 计算当前滚动百分比。
     * @returns {number} 0-100 的整数值
     */
    getScrollPercent: function () {
      var scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return 0;
      return Math.round((window.scrollY / scrollableHeight) * 100);
    },

    // ── 自动弹窗判断 ────────────────────────────────────────────────────

    /**
     * 检查转化抑制是否生效（用户已转化，48 小时内不再弹窗）。
     * 测试环境下始终返回 false，不做抑制。
     * @returns {boolean}
     */
    isSuppressedByStorage: function () {
      if (isTestEnvironment()) return false;
      return Date.now() < this.state.suppression.convertedUntil;
    },

    /**
     * 判断当前是否允许展示自动弹窗。
     * 需同时满足：页面可见、未手动禁用、未达上限、未在冷却期、已过初始延迟、
     * 表单无焦点、滚动深度足够。
     * @param {number}  scrollPercent  - 当前滚动百分比（可传入缓存值）
     * @param {boolean} hasFocus       - 是否有表单焦点（可传入缓存值）
     * @returns {boolean}
     */
    isAutoPopupAllowed: function (scrollPercent, hasFocus) {
      if (document.hidden) return false;
      if (this.state.autoPopupDisabledForSession) return false;
      if (this.state.popupShownThisSession >= this.state.maxPopupsPerSession) return false;
      if (this.isSuppressedByStorage()) return false;

      // 冷却期检查
      if (this.state.lastPopupTime && Date.now() - this.state.lastPopupTime < this.state.popupCooldown) {
        return false;
      }

      if (!this.state.initialDelayReached) return false;
      if (hasFocus) return false;
      if ((scrollPercent || 0) < this.state.minScrollPercentBeforeAuto) return false;

      return true;
    },

    // ── 追踪设置 ────────────────────────────────────────────────────────

    /**
     * 初始化所有用户行为追踪：全局点击、滚动、产品区域停留。
     */
    setupTracking: function () {
      this.setupGlobalClickTracking();
      this.setupScrollTracking();
      this.setupProductSectionObserver();
    },

    /**
     * 全局点击追踪：检测产品交互和非链接点击，累加参与度评分。
     */
    setupGlobalClickTracking: function () {
      var self = this;

      document.addEventListener("click", function (event) {
        var clickedElement = event.target;

        // 排除链接、按钮、表单元素
        var isLinkOrButton = clickedElement.closest('a, button, [role="button"]');
        var isFormInput = clickedElement.closest("input, textarea, select");

        // 检测产品相关交互（产品卡片、筛选、分页）
        var isProductInteraction = clickedElement.closest(
          "#products .product-card, " +
            "#product-filter-bar .filter-btn, " +
            "#pagination .pagination-btn, " +
            "#product-grid-mobile-controls button"
        );

        if (isProductInteraction) {
          self.addScore(35, "productInteractionScored");
        }
        if (!isLinkOrButton && !isFormInput) {
          self.addScore(10, "nonLinkClickScored");
        }
      });
    },

    /**
     * 滚动追踪：使用 rAF 节流，检测滚动深度、滚动空闲、非 Hero 区域停留。
     * Hero 高度只在需要时测量一次，避免重复布局计算。
     */
    setupScrollTracking: function () {
      var self = this;
      var nonHeroDwellSeconds = 0; // 非 Hero 区域停留秒数
      var nonHeroDwellInterval = null; // 非 Hero 停留计时器
      var heroSectionHeight = 0; // Hero 区域高度（缓存）
      var rafPending = false; // rAF 节流标志

      /**
       * 测量首个 section 元素的高度作为 Hero 区域高度。
       */
      function measureHeroHeight() {
        var heroSection = document.querySelector("section:first-of-type");
        heroSectionHeight = heroSection ? heroSection.offsetHeight : 0;
      }

      // 首次异步测量
      requestAnimationFrame(measureHeroHeight);

      // 使用 passive scroll 监听 + rAF 节流
      window.addEventListener(
        "scroll",
        function () {
          if (rafPending) return;
          rafPending = true;

          requestAnimationFrame(function () {
            rafPending = false;

            var currentScrollY = window.scrollY;
            var scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
            var scrollPercent = scrollableHeight > 0 ? Math.round((currentScrollY / scrollableHeight) * 100) : 0;

            // 更新缓存值供轮询使用
            self.state.cachedScrollPercent = scrollPercent;
            if (scrollPercent >= 50) {
              self.addScore(30, "scrollDepthScored");
            }

            // 滚动空闲检测 — 停止滚动 450ms 后标记为非活动状态
            self.state.isActivelyScrolling = true;
            if (self.state.scrollIdleTimer) clearTimeout(self.state.scrollIdleTimer);
            self.state.scrollIdleTimer = setTimeout(function () {
              self.state.isActivelyScrolling = false;
            }, 450);

            // 非 Hero 区域停留追踪
            if (!heroSectionHeight) measureHeroHeight();
            var isPastHero = currentScrollY > heroSectionHeight;

            if (isPastHero) {
              // 进入非 Hero 区域，开始计时（如尚未计分）
              if (!nonHeroDwellInterval && !self.state.flags.nonHeroDwellScored) {
                nonHeroDwellSeconds = 0;
                nonHeroDwellInterval = setInterval(function () {
                  nonHeroDwellSeconds++;
                  // 停留 20 秒后加分并停止计时
                  if (nonHeroDwellSeconds >= 20) {
                    self.addScore(20, "nonHeroDwellScored");
                    clearInterval(nonHeroDwellInterval);
                    nonHeroDwellInterval = null;
                  }
                }, 1000);
              }
            } else if (nonHeroDwellInterval) {
              // 回到 Hero 区域，暂停计时
              clearInterval(nonHeroDwellInterval);
              nonHeroDwellInterval = null;
            }
          });
        },
        { passive: true }
      );
    },

    /**
     * 使用 IntersectionObserver 追踪用户在产品区域的停留时间。
     * 产品区域进入视口 35% 以上时开始计时，停留 20 秒后加分。
     */
    setupProductSectionObserver: function () {
      var self = this;
      var productSection = document.getElementById("products");
      if (!productSection) return;

      var productDwellSeconds = 0; // 产品区域停留秒数
      var productDwellInterval = null; // 产品区域停留计时器

      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              // 产品区域可见，开始计时
              if (self.state.flags.productDwellScored) return;
              productDwellSeconds = 0;
              if (productDwellInterval) clearInterval(productDwellInterval);
              productDwellInterval = setInterval(function () {
                productDwellSeconds++;
                // 停留 20 秒后加分并停止计时
                if (productDwellSeconds >= 20) {
                  self.addScore(40, "productDwellScored");
                  clearInterval(productDwellInterval);
                  productDwellInterval = null;
                }
              }, 1000);
            } else if (productDwellInterval) {
              // 产品区域离开视口，暂停计时
              clearInterval(productDwellInterval);
              productDwellInterval = null;
            }
          });
        },
        { threshold: 0.35 }
      );

      observer.observe(productSection);
    },

    // ── 条件检测轮询 ─────────────────────────────────────────────────────

    /**
     * 启动弹窗条件检测循环。
     * 1. 通过 focusin/focusout 事件缓存焦点状态（避免轮询中读取 DOM）
     * 2. 等待初始延迟后首次评估
     * 3. 每秒轮询一次评估条件
     */
    checkConditionsLoop: function () {
      var self = this;
      var isMobile = getMqMobile();
      var initialDelaySeconds = isMobile ? this.state.delayMobileSeconds : this.state.delayDesktopSeconds;

      // 通过事件缓存焦点状态，避免在轮询中读取 document.activeElement
      document.addEventListener("focusin", function () {
        self.state.cachedHasFocus = true;
      });
      document.addEventListener("focusout", function () {
        self.state.cachedHasFocus = false;
      });

      // 初始延迟后首次评估
      setTimeout(function () {
        self.state.initialDelayReached = true;
        self.evaluateConditions();
      }, initialDelaySeconds * 1000);

      // 每秒轮询一次
      setInterval(function () {
        self.evaluateConditions();
      }, 1000);
    },

    /**
     * 评估当前是否满足弹窗展示条件。
     * 两种触发方式：
     *   1. 强制触发 — 超过 forceShowAfter 秒数后无条件展示
     *   2. 参与度触发 — engagementScore 达到阈值后展示
     */
    evaluateConditions: function () {
      if (!this.isAutoPopupAllowed(this.state.cachedScrollPercent, this.state.cachedHasFocus)) {
        return;
      }

      var isMobile = getMqMobile();
      var forceAfterSeconds = isMobile
        ? this.state.forceShowAfterMobileSeconds
        : this.state.forceShowAfterDesktopSeconds;
      var elapsedSeconds = Math.floor((Date.now() - this.state.pageStartAt) / 1000);

      // 强制触发：超过时间限制后无条件展示
      if (elapsedSeconds >= forceAfterSeconds) {
        this.showPopup("timed-fallback", { manual: false });
        return;
      }

      // 参与度触发：评分达到阈值后展示
      var scoreThreshold = isMobile ? this.state.scoreThresholdMobile : this.state.scoreThresholdDesktop;
      if (this.state.engagementScore >= scoreThreshold) {
        this.showPopup("engagement-score", { manual: false });
      }
    },

    // ── UI 更新 ──────────────────────────────────────────────────────────

    /**
     * 更新调试面板中的弹窗计数显示。
     */
    updateSessionCount: function () {
      var countElement = document.getElementById("today-popup-count");
      if (!countElement) return;
      countElement.textContent = this.state.popupShownThisSession + "/" + this.state.maxPopupsPerSession;
    },

    /**
     * 更新调试面板中的触发原因显示。
     * @param {string} triggerReason - 触发原因标识
     */
    updateTriggerReason: function (triggerReason) {
      var reasonElement = document.getElementById("trigger-reason");
      if (!reasonElement) return;

      var displayMessage;
      if (triggerReason === "manual-click") {
        displayMessage = translate("popup_trigger_manual_click", "You clicked the consultation button");
      } else {
        displayMessage = translate("popup_trigger_default", "We noticed your interest in our products");
      }

      reasonElement.innerHTML =
        '<span class="material-symbols-outlined">info</span>' + "<span>" + displayMessage + "</span>";
    },

    // ── 弹窗展示与关闭 ──────────────────────────────────────────────────

    /**
     * 展示智能弹窗。
     * @param {string} triggerReason - 触发原因标识（用于调试显示）
     * @param {Object} options
     * @param {boolean} options.manual - 是否为手动触发（手动触发不受限制）
     */
    showPopup: function (triggerReason, options) {
      var isManual = (options && options.manual) || false;
      var overlay = document.getElementById("smart-popup-overlay");

      // overlay 不存在或已展示则跳过
      if (!overlay || overlay.classList.contains("show")) return;

      if (!isManual) {
        // 自动弹窗：再次检查限制条件
        if (!this.isAutoPopupAllowed(this.state.cachedScrollPercent, this.state.cachedHasFocus)) {
          return;
        }
        this.state.popupShownThisSession++;
        this.state.lastPopupTime = Date.now();
        this.updateSessionCount();
      } else {
        // 手动弹窗：只记录时间
        this.state.lastPopupTime = Date.now();
      }

      this.updateTriggerReason(triggerReason);
      applyPopupVisibility();

      // 防止背景滚动：补偿滚动条宽度
      var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = scrollbarWidth + "px";
      document.body.style.overflow = "hidden";

      overlay.classList.add("show");
    },

    /**
     * 关闭智能弹窗。
     * @param {Object} options
     * @param {boolean} options.dismissed - 是否因用户主动关闭（禁用后续自动弹窗）
     * @param {boolean} options.converted - 是否因用户转化（设置 48 小时抑制）
     */
    closePopup: function (options) {
      var wasDismissed = (options && options.dismissed) || false;
      var wasConverted = (options && options.converted) || false;
      var overlay = document.getElementById("smart-popup-overlay");
      if (!overlay) return;

      this.state.lastPopupTime = Date.now();

      if (wasDismissed) {
        this.state.autoPopupDisabledForSession = true;
      }
      if (wasConverted) {
        this.state.autoPopupDisabledForSession = true;
        this.saveConversionSuppression();
      }

      // 播放关闭动画
      overlay.classList.remove("show");
      overlay.classList.add("closing");

      // 动画结束后恢复页面状态
      var cleanupCompleted = false;

      function cleanupAfterClose() {
        if (cleanupCompleted) return;
        cleanupCompleted = true;
        overlay.removeEventListener("transitionend", cleanupAfterClose);
        overlay.classList.remove("closing");
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }

      overlay.addEventListener("transitionend", cleanupAfterClose);

      // 兜底：350ms 后强制清理（防止 transitionend 不触发）
      setTimeout(cleanupAfterClose, 350);
    },

    /**
     * 保存转化抑制状态：设置 48 小时内不再展示自动弹窗。
     */
    saveConversionSuppression: function () {
      var suppressUntil = Date.now() + 48 * 60 * 60 * 1000; // 48 小时
      this.state.suppression.convertedUntil = suppressUntil;
      localStorage.setItem(this.state.storageKeys.convertedUntil, String(suppressUntil));
    },

    /**
     * 绑定"友好"关闭事件处理器（每种只绑定一次）：
     *   - 点击遮罩层关闭
     *   - 点击关闭按钮关闭（标记为 dismissed）
     *   - Escape 键关闭
     */
    setupFriendlyCloseHandlers: function () {
      var self = this;
      if (this.state.flags.friendlyHandlersBound) return;
      this.state.flags.friendlyHandlersBound = true;

      // 点击遮罩层关闭
      var overlay = document.getElementById("smart-popup-overlay");
      if (overlay) {
        overlay.addEventListener("click", function (event) {
          if (event.target === overlay) {
            self.closePopup();
          }
        });
      }

      // 点击关闭按钮关闭（标记为 dismissed，禁用后续自动弹窗）
      var closeButton = document.getElementById("smart-popup-close");
      if (closeButton) {
        closeButton.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          self.closePopup({ dismissed: true });
        });
      }

      // Escape 键关闭
      document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        var popupOverlay = document.getElementById("smart-popup-overlay");
        if (popupOverlay && popupOverlay.classList.contains("show")) {
          self.closePopup();
        }
      });
    },
  };

  // ─── 全局辅助函数 ────────────────────────────────────────────────────────

  /** 手动触发展示智能弹窗（不受自动弹窗限制）。 */
  function showSmartPopupManual() {
    smartPopup.showPopup("manual-click", { manual: true });
  }

  /** 关闭智能弹窗并标记为 dismissed（禁用后续自动弹窗）。 */
  function closeSmartPopup() {
    smartPopup.closePopup({ dismissed: true });
  }

  // ============================================
  // 表单提交 (Form Submission)
  // ============================================

  /**
   * Google Apps Script 表单提交端点。
   * 接收 JSON 格式的表单数据，通过服务端代理发送。
   * @constant {string}
   */
  var FORM_ENDPOINT = "/api/quote-submit";

  /**
   * 从表单元素中收集提交数据，附加用户环境信息。
   * @param {HTMLFormElement} form - 表单 DOM 元素
   * @param {string}          formType - 表单类型标识（"smart_popup" | "contact_page"）
   * @returns {Object} 表单数据对象
   */
  function collectFormData(form, formType) {
    return {
      formType: formType,
      name: (form.querySelector('input[name="name"]') || {}).value || "",
      company: (form.querySelector('input[name="company"]') || {}).value || "",
      email: (form.querySelector('input[name="email"]') || {}).value || "",
      phone: (form.querySelector('input[name="phone"]') || {}).value || "",
      country: (form.querySelector('input[name="country"]') || {}).value || "",
      message: (form.querySelector('textarea[name="message"]') || {}).value || "",
      language: getCurrentLanguage(),
      browserLanguage: navigator.language,
      screenWidth:
        window.DeviceUtils && window.DeviceUtils.getScreenSize
          ? window.DeviceUtils.getScreenSize()
          : window.screen.width,
      screenHeight: window.screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      pageUrl: window.location.href,
      timeOnPage: (userState && userState.timeOnPage) || 0,
      scrollDepth: (userState && userState.scrollDepth) || 0,
      userAgent: navigator.userAgent,
    };
  }

  /**
   * 通过 fetch 发送表单数据到 Google Apps Script 端点。
   * @param {Object}   formData      - 表单数据对象
   * @param {Function} onSuccess     - 提交成功回调
   * @param {Function} onFallback    - 提交失败时的降级回调
   * @param {string}   submittingMsg - 提交中提示文案（已翻译）
   */
  function sendFormData(formData, onSuccess, onFallback, submittingMsg) {
    showNotification(submittingMsg, "success");

    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then(function (response) {
        if (!response.ok) {
          return response.json().then(function (err) {
            throw new Error(err.error || "Submission failed");
          });
        }
        return response.json();
      })
      .then(function () {
        onSuccess();
      })
      .catch(function (error) {
        console.error("提交失败:", error);
        onFallback(error);
      });
  }

  /**
   * 处理智能弹窗表单的提交。
   * 提交成功后重置表单并关闭弹窗（标记为已转化）。
   * @param {Event} event - 表单提交事件
   */
  function submitSmartPopupForm(event) {
    event.preventDefault();

    var form = document.getElementById("smart-popup-form");
    if (!form) {
      showNotification(translate("notify_form_not_found", "Form not found"), "error");
      return;
    }

    var formData = collectFormData(form, "smart_popup");

    sendFormData(
      formData,
      // 成功回调
      function () {
        showNotification(translate("notify_submit_success", "Submitted successfully!"), "success");
        form.reset();
        setTimeout(function () {
          smartPopup.closePopup({ converted: true });
        }, 500);
      },
      // 失败降级回调
      function () {
        showNotification(
          translate("notify_submit_received", "Submitted successfully! We have received your information."),
          "success"
        );
        form.reset();
        setTimeout(function () {
          smartPopup.closePopup({ converted: true });
        }, 500);
      },
      translate("notify_submitting_info", "Submitting your information...")
    );
  }

  /**
   * 处理联系页表单的提交。
   * 提交成功后显示通知；失败时降级到 mailto 方案。
   * @param {Event} event - 表单提交事件
   */
  function submitContactForm(event) {
    event.preventDefault();

    var form = document.getElementById("contact-form");
    if (!form) {
      showNotification(translate("notify_form_not_found", "Form not found"), "error");
      return;
    }

    var formData = collectFormData(form, "contact_page");

    sendFormData(
      formData,
      // 成功回调
      function () {
        showNotification(translate("notify_submit_success", "Submitted successfully!"), "success");
      },
      // 失败降级回调：切换到 mailto 方案
      function (error) {
        console.warn("Fetch 失败，降级到 mailto 备用方案", error);
        submitViaMailto(formData, "contact_page");
      },
      translate("notify_sending_inquiry", "Sending your inquiry...")
    );
  }

  /**
   * 通过 mailto: 协议降级提交表单数据。
   * 构建包含所有表单字段和用户环境信息的邮件内容。
   * @param {Object} formData - 表单数据对象
   * @param {string} formType - 表单类型标识
   */
  function submitViaMailto(formData, formType) {
    var screenWidth =
      window.DeviceUtils && window.DeviceUtils.getScreenSize ? window.DeviceUtils.getScreenSize() : window.screen.width;

    // 构建邮件主题
    var subjectPrefix =
      formType === "smart_popup"
        ? translate("mailto_subject_smart_popup", "Smart Popup")
        : translate("mailto_subject_contact_form", "Contact Form");
    var mailSubject = encodeURIComponent(
      subjectPrefix + " " + translate("mailto_subject_inquiry", "Inquiry") + " - " + formData.name
    );

    // 构建邮件正文
    var mailBody = encodeURIComponent(
      [
        translate("mailto_label_name", "Name") + ": " + formData.name,
        translate("mailto_label_email", "Email") + ": " + formData.email,
        translate("mailto_label_phone", "Phone") + ": " + formData.phone,
        translate("mailto_label_company", "Company") +
          ": " +
          (formData.company || translate("mailto_not_provided", "Not provided")),
        translate("mailto_label_country", "Country") +
          ": " +
          (formData.country || translate("mailto_not_provided", "Not provided")),
        translate("mailto_label_message", "Message") + ": " + formData.message,
        "",
        // 用户环境信息分隔线
        "------------ " + translate("mailto_section_user_info", "User Information") + " ------------",
        translate("mailto_label_user_language", "User Language") + ": " + getCurrentLanguage(),
        translate("mailto_label_browser_language", "Browser Language") + ": " + navigator.language,
        translate("mailto_label_screen_resolution", "Screen Resolution") +
          ": " +
          screenWidth +
          "x" +
          window.screen.height,
        translate("mailto_label_timezone", "Timezone") + ": " + Intl.DateTimeFormat().resolvedOptions().timeZone,
        translate("mailto_label_page_url", "Page URL") + ": " + window.location.href,
        translate("mailto_label_submit_time", "Submit Time") + ": " + new Date().toLocaleString(),
        translate("mailto_label_time_on_page", "Time on Page") +
          ": " +
          (userState.timeOnPage || 0) +
          translate("mailto_unit_seconds", "s"),
        translate("mailto_label_scroll_depth", "Scroll Depth") + ": " + (userState.scrollDepth || 0) + "%",
        // 浏览器信息分隔线
        "------------ " + translate("mailto_section_browser_info", "Browser Information") + " ------------",
        translate("mailto_label_user_agent", "User Agent") + ": " + navigator.userAgent,
      ].join("\n")
    );

    window.location.href = "mailto:179564128@qq.com?subject=" + mailSubject + "&body=" + mailBody;
  }

  // ─── 全局导出 ─────────────────────────────────────────────────────────────
  // 保持与原始代码完全一致的公开 API，确保所有调用方不受影响。

  window.smartPopup = smartPopup; // 弹窗核心对象
  window.userState = userState; // 用户行为状态
  window.isTestEnvironment = isTestEnvironment; // 测试环境判断
  window.loadUserState = loadUserState; // 加载用户状态
  window.saveUserState = saveUserState; // 保存用户状态
  window.trackScrollDepth = trackScrollDepth; // 追踪滚动深度
  window.trackTimeOnPage = trackTimeOnPage; // 追踪页面停留时间
  window.showSmartPopupManual = showSmartPopupManual; // 手动触发弹窗
  window.closeSmartPopup = closeSmartPopup; // 关闭弹窗
  window.submitSmartPopupForm = submitSmartPopupForm; // 弹窗表单提交
  window.submitContactForm = submitContactForm; // 联系页表单提交
  window.submitViaMailto = submitViaMailto; // mailto 降级提交
})(window);
