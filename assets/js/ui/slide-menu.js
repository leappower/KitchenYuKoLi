/**
 * SlideMenu - 移动端滑出导航菜单组件
 *
 * 提供从左侧滑入的导航面板，支持多级菜单展开/折叠、
 * 底部 CTA 栏、智能头部隐藏、以及移动端搜索覆盖层。
 *
 * 公开 API (window.SlideMenu):
 *   - open()              打开滑出菜单
 *   - close()             关闭滑出菜单
 *   - initToggle()        初始化汉堡按钮 & 搜索按钮的事件绑定
 *   - 搜索已迁移到 search-engine.js（统一搜索系统）
 *
 * @module SlideMenu
 */
/* global SlideMenu */
(function (_global) {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (key == null) key = evt + ":" + (++_spaRegs.__k || (_spaRegs.__k = 1));
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  /* ================================================================
   *  工具函数
   * ================================================================ */

  /**
   * HTML 特殊字符转义，防止 XSS 注入
   * @param {*} value - 任意值，会被转为字符串处理
   * @returns {string} 转义后的安全字符串
   */
  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ================================================================
   *  样式注入
   * ================================================================ */

  /**
   * 注入移动端菜单所需的全部 CSS 样式（仅注入一次）
   * 创建 <style id="mobile-menu-styles"> 并追加到 <head>
   */

  /* ================================================================
   *  菜单数据构建
   * ================================================================ */

  /** @type {Array|null} 缓存的菜单项，避免重复构建 */
  var cachedMenuItems = null;

  function getL1Icon(navId) {
    var map = (window.NAV_CONFIG && window.NAV_CONFIG.l1IconMap) || {};
    return map[navId] || "menu";
  }

  /**
   * 构建导航菜单项数组（从共享 NAV_CONFIG 读取）
   * @returns {Array<{key, href, id, icon, children}>} 菜单项列表
   */
  function getMenuItems() {
    if (cachedMenuItems) return cachedMenuItems;

    var cfg = window.NAV_CONFIG;
    if (!cfg) {
      // Fallback: produce empty items if nav-config hasn't loaded yet
      cachedMenuItems = [];
      return [];
    }

    function childEntries(sectionKey) {
      return (cfg[sectionKey] || []).slice(); // shallow copy to preserve original
    }

    var items = cfg.items.map(function (navItem) {
      var children = [];
      if (navItem.hasDropdown && cfg[navItem.id] && cfg[navItem.id].length > 0) {
        children = childEntries(navItem.id);
      }
      return {
        key: navItem.key,
        label: window.uiText(navItem.key, navItem.key),
        href: navItem.path,
        id: navItem.id,
        icon: getL1Icon(navItem.id),
        children: children,
      };
    });

    cachedMenuItems = items;
    return items;
  }

  /* ================================================================
   *  HTML 渲染辅助
   * ================================================================ */

  /**
   * 在当前 URL 上下文中，找出与某个一级菜单下最匹配的子项 href
   * 用于给当前激活的子菜单项添加 .is-active 高亮
   *
   * @param {Array} children - 子菜单项数组
   * @returns {string|undefined} 匹配的子项 href（去掉尾部斜杠后比较）
   */
  function findActiveChildHref(children) {
    var currentPath = location.pathname.replace(/\/$/, "");
    var matchedHref = "";
    var matchedLength = 0;

    children.forEach(function (child) {
      // Skip separator items (no href)
      if (!child.href) return;
      var childPath = child.href.replace(/\/$/, "");

      // 精确匹配优先
      if (currentPath === childPath) {
        matchedHref = child.href;
        matchedLength = childPath.length;
      }
      // 前缀匹配（当前路径以子项路径 + "/" 开头），取最长匹配
      else if (currentPath.indexOf(childPath + "/") === 0 && childPath.length > matchedLength) {
        matchedHref = child.href;
        matchedLength = childPath.length;
      }
    });

    return matchedHref;
  }

  /**
   * 渲染单个子菜单项的 HTML
   * @param {Object} child    - 子菜单项数据
   * @param {string} activeHref - 当前激活项的 href
   * @returns {string} HTML 字符串
   */
  function renderChildItem(child, activeHref) {
    var whatsappClass = child.isWhatsApp ? " is-whatsapp" : "";
    var badgeHtml = child.badge ? '<span class="mobile-menu-badge" data-i18n="nav_roi_badge">HOT</span>' : "";
    var targetAttr = child.isWhatsApp ? ' target="_blank" rel="noopener noreferrer"' : "";

    // 分隔线（applications 分类的第 6 项之后）
    if (child._separator) {
      return '<div class="mobile-menu-l2-separator"></div>';
    }

    var isActive = child.href === activeHref ? " is-active" : "";

    return (
      '<a href="' +
      escapeHtml(child.href) +
      '"' +
      ' class="mobile-menu-l2-item' +
      whatsappClass +
      isActive +
      '"' +
      targetAttr +
      ">" +
      '<span class="mobile-menu-l2-icon">' +
      '<span class="material-symbols-outlined">' +
      escapeHtml(child.icon) +
      "</span>" +
      "</span>" +
      '<span class="mobile-menu-l2-label" data-i18n="' +
      escapeHtml(child.key) +
      '">' +
      escapeHtml(child.key) +
      "</span>" +
      (child.emoji ? '<span class="mobile-menu-l2-emoji">' + escapeHtml(child.emoji) + "</span>" : "") +
      badgeHtml +
      "</a>"
    );
  }

  /**
   * 渲染一级菜单项（包含其子菜单容器）
   * @param {Object} item - 一级菜单项数据
   * @returns {string} HTML 字符串
   */
  function renderMenuItem(item) {
    var subMenuHtml = "";
    var l1ActiveClass = "";

    if (item.children && item.children.length > 0) {
      var activeHref = findActiveChildHref(item.children);

      var childItemsHtml = item.children
        .map(function (child) {
          return renderChildItem(child, activeHref);
        })
        .join("\n");

      subMenuHtml =
        '<div class="mobile-menu-l2' +
        (activeHref ? " is-open" : "") +
        '" data-menu-l2="' +
        escapeHtml(item.id) +
        '">' +
        childItemsHtml;

      /* 有子项匹配当前路径：高亮 + 自动展开 */
      if (activeHref) {
        l1ActiveClass = " is-active is-expanded";
      }

      // products 分类末尾追加「查看全部产品」链接
      if (item.id === "products") {
        subMenuHtml +=
          '<a class="mobile-menu-l2-item mobile-menu-l2-viewall" href="/products/all/">' +
          '<span class="mobile-menu-l2-icon">' +
          '<span class="material-symbols-outlined">grid_view</span>' +
          "</span>" +
          '<span class="mobile-menu-l2-label" data-i18n="nav_mega_view_all">查看全部产品</span>' +
          "</a>";
      }

      subMenuHtml += "</div>";
    } else {
      /* 无子菜单的一级项：匹配自身 href */
      if (item.href) {
        var _cleanCurrent = location.pathname.replace(/\/$/, "");
        var _cleanItemHref = item.href.replace(/\/$/, "");
        if (_cleanCurrent === _cleanItemHref) {
          l1ActiveClass = " is-active";
        }
      }
    }

    /* 有子菜单 → button 含箭头；无子菜单 → a 链接无箭头 */
    if (item.children && item.children.length > 0) {
      return (
        '<div class="mobile-menu-l1-wrap">' +
        '<button class="mobile-menu-l1' +
        l1ActiveClass +
        '" data-menu-toggle="' +
        escapeHtml(item.id) +
        '" type="button">' +
        '<span class="mobile-menu-l1-icon">' +
        '<span class="material-symbols-outlined">' +
        escapeHtml(item.icon) +
        "</span>" +
        "</span>" +
        '<span class="mobile-menu-l1-label" data-i18n="' +
        escapeHtml(item.key) +
        '">' +
        escapeHtml(item.label || item.key) +
        "</span>" +
        '<span class="material-symbols-outlined mobile-menu-l1-arrow">chevron_right</span>' +
        "</button>" +
        subMenuHtml +
        "</div>"
      );
    } else {
      return (
        '<div class="mobile-menu-l1-wrap">' +
        '<a class="mobile-menu-l1' +
        l1ActiveClass +
        '" href="' +
        escapeHtml(item.href || "#") +
        '">' +
        '<span class="mobile-menu-l1-icon">' +
        '<span class="material-symbols-outlined">' +
        escapeHtml(item.icon) +
        "</span>" +
        "</span>" +
        '<span class="mobile-menu-l1-label" data-i18n="' +
        escapeHtml(item.key) +
        '">' +
        escapeHtml(item.label || item.key) +
        "</span>" +
        "</a>" +
        "</div>"
      );
    }
  }

  /**
   * 生成完整的菜单面板内部 HTML
   * @returns {string}
   */
  function renderMenuPanelContent() {
    var basePath = window.BASE_PATH || "";

    var headerHtml =
      '<div class="mobile-menu-header">' +
      '<a class="mobile-menu-logo" href="' +
      basePath +
      '/home/">' +
      '<img src="' +
      basePath +
      '/assets/images/logo/logo.webp" alt="Yukoli" width="32" height="32" />' +
      "</a>" +
      '<button id="mobile-menu-close" type="button" class="mobile-menu-close" aria-label="Close menu">' +
      '<span class="material-symbols-outlined">close</span>' +
      "</button>" +
      "</div>";

    var menuItemsHtml = getMenuItems()
      .map(function (item) {
        return renderMenuItem(item);
      })
      .join("\n");

    var ctaBarHtml =
      '<div class="mobile-menu-cta-bar">' +
      '<a class="mobile-menu-cta-btn secondary" href="/contact/" data-nav="/contact/">' +
      '<span class="material-symbols-outlined">mail</span>' +
      '<span data-i18n="btn_contact_us">Contact Us</span>' +
      "</a>" +
      '<a class="mobile-menu-cta-btn primary" href="/quote/" data-nav="/quote/">' +
      '<span class="material-symbols-outlined">request_quote</span>' +
      '<span data-i18n="nav_get_quote">Get Quote</span>' +
      "</a>" +
      "</div>";

    return headerHtml + '<div class="mobile-menu-scroll">' + menuItemsHtml + "</div>" + ctaBarHtml;
  }

  /* ================================================================
   *  菜单打开 / 关闭
   * ================================================================ */

  /** @type {HTMLElement|null} 遮罩层 DOM 引用 */
  var overlayEl = null;

  /** @type {HTMLElement|null} 菜单面板 DOM 引用 */
  var panelEl = null;

  /**
   * 打开移动端滑出菜单
   * - 动态创建遮罩层和面板并插入 DOM
   * - 绑定所有交互事件（关闭、折叠、导航）
   * - 支持翻译管理器自动翻译 data-i18n 元素
   */
  function openMenu() {
    if (panelEl) return; // 已打开，忽略重复调用

    // 创建遮罩层
    overlayEl = document.createElement("div");
    overlayEl.className = "mobile-menu-overlay";
    overlayEl.id = "mobile-menu-overlay";

    // 创建面板
    panelEl = document.createElement("div");
    panelEl.className = "mobile-menu-panel";
    panelEl.id = "mobile-menu-panel";
    panelEl.innerHTML = renderMenuPanelContent();

    // 应用翻译
    if (window.translationManager) {
      panelEl.querySelectorAll("[data-i18n]").forEach(function (el) {
        var key = el.getAttribute("data-i18n");
        var translated = window.translationManager.translate(key);
        if (translated && translated !== key) {
          el.textContent = translated;
        }
      });
    }

    // 插入 DOM 并锁定滚动
    document.body.appendChild(overlayEl);
    document.body.appendChild(panelEl);
    document.body.style.overflow = "hidden";

    // 触发入场动画（下一帧添加 is-open class）
    requestAnimationFrame(function () {
      overlayEl.classList.add("is-open");
      panelEl.classList.add("is-open");
      if (navigator.vibrate) navigator.vibrate(10);
    });

    // 绑定交互事件
    bindMenuEvents();

    // 菜单 DOM 已就绪，应用当前 URL 的导航高亮
    if (typeof SlideMenu !== "undefined" && SlideMenu.updateActive) {
      SlideMenu.updateActive();
    }
  }

  /**
   * 关闭移动端滑出菜单
   * - 移除 is-open 动画类
   * - 动画完成后销毁 DOM 元素并恢复滚动
   */
  function closeMenu() {
    if (!panelEl) return;

    overlayEl.classList.remove("is-open");
    panelEl.classList.remove("is-open");

    // 等待 transitionend 后移除 DOM
    var _menuCloseDone = false;
    function _cleanupMenuDOM() {
      if (_menuCloseDone) return;
      _menuCloseDone = true;
      if (overlayEl && overlayEl.parentNode) {
        overlayEl.parentNode.removeChild(overlayEl);
      }
      if (panelEl && panelEl.parentNode) {
        panelEl.parentNode.removeChild(panelEl);
      }
      overlayEl = null;
      panelEl = null;
      document.body.style.overflow = "";
    }
    overlayEl.addEventListener("transitionend", function onOverlayEnd(e) {
      if (e.propertyName === "opacity") {
        if (overlayEl) overlayEl.removeEventListener("transitionend", onOverlayEnd);
        _cleanupMenuDOM();
      }
    });
    panelEl.addEventListener("transitionend", function onPanelEnd(e) {
      if (e.propertyName === "transform") {
        if (panelEl) panelEl.removeEventListener("transitionend", onPanelEnd);
        _cleanupMenuDOM();
      }
    });
    // Safety net: if transitionend never fires (reduced-motion, etc.)
    setTimeout(_cleanupMenuDOM, 400);
  }

  /* ================================================================
   *  菜单事件绑定
   * ================================================================ */

  /**
   * 为菜单面板内的所有交互元素绑定事件
   * 包括：关闭按钮、遮罩层点击、Logo 点击、子菜单折叠、CTA 按钮导航
   */
  function bindMenuEvents() {
    var closeBtn = document.getElementById("mobile-menu-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (evt) {
        evt.preventDefault();
        closeMenu();
      });
    }

    // 点击遮罩层关闭
    overlayEl.addEventListener("click", closeMenu);

    // 点击 Logo 也关闭菜单
    var logoEl = panelEl.querySelector(".mobile-menu-logo");
    if (logoEl) {
      logoEl.addEventListener("click", function () {
        closeMenu();
      });
    }

    // 一级菜单折叠/展开切换
    var toggleButtons = panelEl.querySelectorAll("[data-menu-toggle]");
    for (var i = 0; i < toggleButtons.length; i++) {
      toggleButtons[i].addEventListener("click", function (_evt) {
        var menuId = this.getAttribute("data-menu-toggle");
        var subMenu = panelEl.querySelector('[data-menu-l2="' + menuId + '"]');
        if (!subMenu) return;

        var isExpanded = this.classList.contains("is-expanded");

        // 关闭其他已展开的子菜单（手风琴行为）
        var expandedButtons = panelEl.querySelectorAll("[data-menu-toggle].is-expanded");
        for (var j = 0; j < expandedButtons.length; j++) {
          if (expandedButtons[j] !== this) {
            expandedButtons[j].classList.remove("is-expanded");
            var otherId = expandedButtons[j].getAttribute("data-menu-toggle");
            var otherSubMenu = panelEl.querySelector('[data-menu-l2="' + otherId + '"]');
            if (otherSubMenu) {
              otherSubMenu.classList.remove("is-open");
            }
          }
        }

        // 切换当前子菜单
        if (isExpanded) {
          this.classList.remove("is-expanded");
          subMenu.classList.remove("is-open");
        } else {
          this.classList.add("is-expanded");
          subMenu.classList.add("is-open");
        }

        if (navigator.vibrate) navigator.vibrate(8);
      });
    }

    // 二级菜单项点击
    var subItems = panelEl.querySelectorAll(".mobile-menu-l2-item");
    for (var k = 0; k < subItems.length; k++) {
      subItems[k].addEventListener("click", function (_evt) {
        // WhatsApp 链接不在 SPA 内处理，关闭菜单后让默认行为生效
        if (this.classList.contains("is-whatsapp")) {
          closeMenu();
          return;
        }

        // 常规链接：关闭菜单，navigate 由全局 click handler 处理
        closeMenu();
      });
    }

    // 一级菜单项点击 —— 若无子菜单则关闭面板（作为普通链接处理）
    var l1Buttons = panelEl.querySelectorAll(".mobile-menu-l1");
    for (var m = 0; m < l1Buttons.length; m++) {
      l1Buttons[m].addEventListener("click", function (_evt) {
        var menuId = this.getAttribute("data-menu-toggle");
        var subMenu = menuId ? panelEl.querySelector('[data-menu-l2="' + menuId + '"]') : null;

        // 如果子菜单存在且不为空，折叠逻辑由上面的 toggleButtons 处理
        // 如果子菜单为空或不存在，则关闭整个菜单并导航
        if (!subMenu || subMenu.children.length === 0) {
          closeMenu();

          // <a> 元素使用自身的 href 导航（默认行为）
          var tagName = this.tagName.toLowerCase();
          if (tagName === "a") {
            return; // 让浏览器默认行为导航
          }

          var _href = this.getAttribute("data-menu-toggle");
          // Find href from menu items data
          var navItems = getMenuItems();
          var targetItem = null;
          for (var idx = 0; idx < navItems.length; idx++) {
            if (navItems[idx].id === menuId) {
              targetItem = navItems[idx];
              break;
            }
          }
          if (targetItem && targetItem.href) {
            if (window.SpaRouter) {
              try {
                window.SpaRouter.navigate(targetItem.href);
              } catch (e) {
                location.href = targetItem.href;
              }
            } else {
              location.href = targetItem.href;
            }
          }
        }
      });
    }

    // 底部 CTA 按钮
    var ctaButtons = panelEl.querySelectorAll(".mobile-menu-cta-btn[data-nav]");
    for (var n = 0; n < ctaButtons.length; n++) {
      ctaButtons[n].addEventListener("click", function (_evt) {
        closeMenu();
        // Navigate 由全局 click handler (spa-router.js) 统一处理
      });
    }
  }

  /* ================================================================
   *  智能头部隐藏（滚动方向检测）
   * ================================================================ */

  /** @type {number} 上一帧的滚动位置 */
  var lastScrollY = 0;

  /** @type {HTMLElement|null} 移动端头部 DOM 引用 */
  var mobileHeaderEl = null;

  /** @type {boolean} 滚动事件 RAF 节流锁 */
  var scrollFramePending = false;

  /**
   * 初始化智能头部行为
   * - 检测是否处于平板模式（禁用隐藏逻辑，头部始终可见）
   * - 仅在移动模式下绑定滚动监听
   */
  function initSmartHeader() {
    lastScrollY = 0;
    mobileHeaderEl = document.getElementById("mobile-header");

    if (!mobileHeaderEl) return;

    // 判断是否为平板模式：innerWidth 768–1280px
    // Note: navigator.js replaces <navigator> placeholder with <header> element,
    // so document.querySelector('navigator[data-variant]') always returns null.
    // We rely solely on innerWidth for tablet detection.
    var isTablet = window.DeviceUtils
      ? window.DeviceUtils.getDeviceType() === "tablet"
      : window.innerWidth >= 768 && window.innerWidth < 1280;

    if (isTablet) {
      mobileHeaderEl.classList.remove("header-hidden");
      return;
    }

    // 移动模式：绑定滚动监听
    window.removeEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    mobileHeaderEl.classList.remove("header-hidden");
  }

  /**
   * 滚动事件处理函数（使用 requestAnimationFrame 节流）
   * - 向下滚动超过 50px 时隐藏头部
   * - 向上滚动时显示头部
   */
  function onScroll() {
    if (scrollFramePending) return;
    scrollFramePending = true;

    requestAnimationFrame(function () {
      var currentY = window.pageYOffset || document.documentElement.scrollTop;

      if (currentY > 50 && currentY > lastScrollY) {
        // 向下滚动：隐藏头部
        mobileHeaderEl.classList.add("header-hidden");
      } else {
        // 向上滚动：显示头部
        mobileHeaderEl.classList.remove("header-hidden");
      }

      lastScrollY = currentY;
      scrollFramePending = false;
    });
  }

  /* ================================================================
   *  汉堡按钮 & 搜索按钮初始化
   * ================================================================ */

  /** @type {boolean} 汉堡按钮事件是否已绑定 */
  var toggleBound = false;

  /** @type {boolean} 搜索按钮事件是否已绑定 */
  // 搜索已迁移到 search-engine.js，不再需要 searchBound 和 searchClickHandler

  /** @type {Function|null} 汉堡按钮点击处理函数引用（用于解绑旧按钮） */
  var toggleClickHandler = null;

  /** @type {HTMLElement|null} 上一次绑定的汉堡按钮 DOM 引用 */
  var lastToggleBtn = null;

  /**
   * 初始化汉堡按钮和搜索按钮的事件绑定
   * - 若按钮已更换（SPA 路由后 DOM 重建），会自动解绑旧按钮、绑定新按钮
   */
  function initToggle() {
    var toggleBtn = document.getElementById("mobile-menu-toggle");

    // PC 视图下无 mobile toggle 按钮，静默跳过
    if (!toggleBtn) return;

    if (toggleBound && toggleBtn === lastToggleBtn) return;

    // 如果按钮已被替换，解绑旧按钮
    if (toggleBound && toggleClickHandler && lastToggleBtn && lastToggleBtn !== toggleBtn) {
      try {
        lastToggleBtn.removeEventListener("click", toggleClickHandler);
      } catch (err) {
        /* 忽略解绑失败 */
      }
    }

    // 绑定汉堡按钮
    toggleBound = true;
    lastToggleBtn = toggleBtn;
    toggleClickHandler = function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      openMenu();
    };
    toggleBtn.addEventListener("click", toggleClickHandler);

    // 搜索按钮：已迁移到 search-engine.js（统一搜索系统），此处不再绑定
  }

  /* ================================================================
   *  搜索已迁移到 search-engine.js（统一搜索系统），此处不再维护
   * ================================================================ */

  /* ================================================================
   *  初始化 & 生命周期事件
   * ================================================================ */

  /**
   * SPA 路由切换后的清理
   * - 关闭已打开的菜单
   * - 重置按钮绑定状态
   * - 重新初始化按钮和智能头部
   */
  _spaOn(
    document,
    "spa:load",
    function () {
      closeMenu();
      lastToggleBtn = null;
      toggleBound = false;
      initToggle();
      initSmartHeader();
      if (typeof SlideMenu !== "undefined" && SlideMenu.updateActive) SlideMenu.updateActive();
    },
    "spa:load:cleanup"
  );

  // 初始样式注入（立即执行）

  // DOM 就绪后初始化
  function tryInit() {
    initToggle();
    initSmartHeader();
  }

  function tryInitWithTranslation() {
    tryInit();
    // Also retry once translations are ready (menu items may update)
    if (window.translationManager && window.translationManager.ready && !window.translationManager.isInitialized) {
      window.translationManager.ready.then(function () {
        tryInit();
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryInitWithTranslation);
  } else {
    tryInitWithTranslation();
  }

  // bfcache（前进/后退缓存）恢复时重新初始化
  window.addEventListener("pageshow", function (evt) {
    if (evt.persisted) {
      closeMenu();
      initToggle();
      initSmartHeader();
    }
  });

  /* ================================================================
   *  公开 API
   * ================================================================ */

  /**
   * @namespace SlideMenu
   * @global
   */
  window.SlideMenu = {
    /** 打开移动端滑出菜单 */
    open: openMenu,

    /** 关闭移动端滑出菜单 */
    close: closeMenu,

    /** 初始化汉堡按钮 & 搜索按钮的事件绑定 */
    initToggle: initToggle,

    // 搜索 API 已迁移到 search-engine.js，此处不再提供

    /** 更新子菜单项的 is-active 高亮（SPA 导航后调用） */
    updateActive: function () {
      var menuItems = getMenuItems();
      var _currentPath = location.pathname.replace(/\/$/, "");
      menuItems.forEach(function (item) {
        /* 更新一级菜单 L1 的 is-active */
        var l1Button = document.querySelector('.mobile-menu-l1[data-menu-toggle="' + item.id + '"]');
        var hasActiveChild = false;

        if (item.children && item.children.length > 0) {
          var activeHref = findActiveChildHref(item.children);
          hasActiveChild = !!activeHref;

          var panel = document.querySelector('[data-menu-l2="' + item.id + '"]');
          if (panel) {
            var items = panel.querySelectorAll(".mobile-menu-l2-item");
            for (var i = 0; i < items.length; i++) {
              var href = items[i].getAttribute("href") || "";
              if (href.replace(/\/$/, "") === activeHref.replace(/\/$/, "")) {
                items[i].classList.add("is-active");
              } else {
                items[i].classList.remove("is-active");
              }
            }
          }
        }

        /* 更新 L1 按钮的 is-active */
        if (l1Button) {
          if (hasActiveChild) {
            l1Button.classList.add("is-active");
          } else if (item.href && _currentPath === item.href.replace(/\/$/, "")) {
            l1Button.classList.add("is-active");
          } else {
            l1Button.classList.remove("is-active");
          }
        } else if (item.href && _currentPath === item.href.replace(/\/$/, "")) {
          /* 无子菜单的 L1（<a> 无 data-menu-toggle），用 href 匹配 */
          var l1Fallback = document.querySelector(
            ".mobile-menu-l1-wrap .mobile-menu-l1[href='" + escapeHtml(item.href) + "']"
          );
          if (l1Fallback) l1Fallback.classList.add("is-active");
        }
      });
    },
  };
  /* i18n: re-render on language change */
  document.addEventListener("languageChanged", function () {
    cachedMenuItems = null;
    var panel = document.getElementById("slide-menu-panel");
    if (panel) {
      panel.innerHTML = renderMenuPanelContent();
    }
  });
})(window);
