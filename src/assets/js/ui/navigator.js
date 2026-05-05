/**
 * navigator.js — 主导航组件
 *
 * 负责渲染桌面端、平板端、移动端三种布局的顶部导航栏，
 * 协调各 dropdown 子模块的样式注入与点击事件绑定，
 * 并提供 updateActive / highlightCategory 等公开 API 供 SPA 路由调用。
 *
 * 依赖：
 *   - window.NAV_CONFIG             (nav-config.js)
 *   - window.ProductsDropdown       (dropdown/products-dropdown.js)
 *   - window.ApplicationsDropdown   (dropdown/applications-dropdown.js)
 *   - window.SupportDropdown        (dropdown/support-dropdown.js)
 *   - window.AboutDropdown          (dropdown/about-dropdown.js)
 *   - window.SlideMenu              (slide-menu.js)
 *   - window.MobileBottomBar        (mobile-bottom-bar.js)
 *   - window.DropdownBaseStyles     (dropdown-styles.js)
 */
(function (global) {
  "use strict";

  /* ================================================================
   *  常量 & 配置
   * ================================================================ */

  /**
   * 默认主导航项（当 NAV_CONFIG.mainNav 不可用时兜底）
   * @type {Array<{key:string, label:string, path:string, id:string, hasDropdown:boolean}>}
   */
  var DEFAULT_NAV_ITEMS = [
    { key: "nav_products",      label: "产品中心", path: "/products/",      id: "products",     hasDropdown: true },
    { key: "nav_applications",  label: "场景应用", path: "/applications/",  id: "applications", hasDropdown: true },
    { key: "nav_service",       label: "服务支持", path: "/support/",       id: "support",      hasDropdown: true },
    { key: "nav_about",         label: "关于我们", path: "/about/",         id: "about",        hasDropdown: true }
  ];

  /** @type {Array} 当前生效的导航项 */
  var navItems =
    typeof NAV_CONFIG !== "undefined" && NAV_CONFIG.mainNav
      ? NAV_CONFIG.mainNav
      : DEFAULT_NAV_ITEMS;

  /**
   * 所有 dropdown 容器的 CSS 类名（用于互斥开关）
   * @type {string[]}
   */
  var DROPDOWN_WRAP_SELECTORS = [
    ".prod-dropdown-wrap",
    ".app-dropdown-wrap",
    ".sup-dropdown-wrap",
    ".abt-dropdown-wrap"
  ];

  /**
   * 特殊路径 → 导航 active id 的映射
   * 用于将非标准路径（如 case-studies）映射到对应主导航项
   * @type {Object<string, string>}
   */
  var PATH_TO_ACTIVE_MAP = {
    "case-studies": "applications",
    "roi":          "profit-calculator",
    "news":         "contact",
    "quote":        "contact",
    "thank-you":    "contact"
  };

  /* Sections whose nav item id differs from the activeSectionId (version drift) */
  var ID_ALIASES = {
    "profit-calculator": ["profit", "profit-calculator"],
    "profit":            ["profit", "profit-calculator"]
  };

  /**
   * 导航 id → dropdown item 前缀的映射
   * @type {Object<string, string>}
   */
  var ACTIVE_TO_PREFIX_MAP = {
    products:     "prod",
    applications: "app",
    support:      "sup",
    about:        "abt",
    contact:      "cnt",
    "case-studies": "app",
    roi:          "sol",
    news:         "cnt",
    quote:        "cnt",
    "thank-you":  "cnt"
  };

  /** @type {string} 当前检测到的设备变体（mobile / tablet / pc） */
  var currentVariant = "pc";

  /** @type {number|null} resize 防抖定时器 */
  var resizeTimer = null;

  /* ================================================================
   *  工具函数
   * ================================================================ */

  /**
   * 对字符串做 HTML 实体转义，防止 XSS
   * @param {string} str - 原始字符串
   * @returns {string} 转义后的安全字符串
   */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * 解析 HTML data-* 属性为布尔值
   *   - null / "" / "false" → fallback
   *   - 其它任何值 → true
   * @param {string|null|undefined} attrVal - data 属性的原始值
   * @param {boolean} fallback - 默认值
   * @returns {boolean}
   */
  function parseBooleanAttr(attrVal, fallback) {
    return attrVal == null || attrVal === "" ? fallback : attrVal !== "false";
  }

  /* ================================================================
   *  Header 渲染
   * ================================================================ */

  /**
   * 构建 PC / 移动端搜索栏 HTML
   * @param {string} placeholderI18nKey - i18n placeholder key
   * @returns {string} HTML 字符串
   */
  function buildSearchBarHtml(placeholderI18nKey) {
    return (
      '<div class="ios-search-wrapper flex-1 flex justify-center mx-1" ' +
      'style="max-width:320px">' +
        '<div class="ios-search-bar" id="mobile-ios-search-bar" ' +
        'style="width:100%;padding:5px 12px">' +
          '<span class="ios-search-icon material-symbols-outlined" ' +
          'style="font-size:18px">search</span>' +
          '<input class="ios-search-input" id="mobile-header-search-input" ' +
          'placeholder="Search equipment..." ' +
          'data-i18n-placeholder="' + escapeHtml(placeholderI18nKey) + '" ' +
          'type="search" autocomplete="off" spellcheck="false" ' +
          'style="font-size:14px"/>' +
          '<button class="ios-search-clear" type="button" aria-label="Clear" ' +
          'tabindex="-1">' +
            '<span class="material-symbols-outlined" ' +
            'style="font-size:18px">cancel</span>' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  /**
   * 构建移动端 / 平板端 Header HTML
   * @param {Object} opts - 配置项
   * @param {string} opts.searchI18n - 搜索栏 placeholder i18n key
   * @returns {string} HTML 字符串
   */
  function buildMobileHeaderHtml(opts) {
    var basePath = window.BASE_PATH || "";
    var searchI18n = opts.searchI18n || "search_placeholder";

    return (
      '<div id="mobile-header-placeholder" style="height:65px;flex-shrink:0"></div>' +
      '<header id="mobile-header" ' +
        'class="fixed top-0 left-0 right-0 z-[var(--z-header)] ' +
        'border-b border-slate-200 dark:border-slate-800 ' +
        'bg-background-light/80 dark:bg-background-dark/80 ' +
        'backdrop-blur-md transition-transform duration-300">' +
        '<div class="px-3 py-3 flex items-center gap-2">' +
          /* 左侧：汉堡菜单 + Logo */
          '<div class="flex items-center gap-1 flex-shrink-0">' +
            '<button id="mobile-menu-toggle" type="button" ' +
              'class="flex items-center justify-center w-10 h-10 -ml-2 ' +
              'rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 ' +
              'transition-colors" aria-label="Menu">' +
              '<span class="material-symbols-outlined text-2xl">menu</span>' +
            '</button>' +
            '<a class="nav-logo-link" href="' + basePath + '/home/">' +
              '<img loading="eager" ' +
                'src="' + basePath + '/assets/images/logo_footer.webp" ' +
                'alt="Yukoli" width="32" height="32" ' +
                'style="width:32px;height:32px;object-fit:contain" />' +
            '</a>' +
          '</div>' +
          /* 中间：搜索栏 */
          '<div class="flex-1 flex justify-center mx-1">' +
            buildSearchBarHtml(searchI18n) +
          '</div>' +
          /* 右侧：语言切换 */
          '<div class="flex-shrink-0">' +
            '<div class="lang-dropdown-container relative">' +
              '<button id="lang-toggle-btn" ' +
                'class="flex items-center gap-1.5 px-3 py-2 rounded-xl ' +
                'text-sm font-medium text-slate-600 dark:text-slate-300 ' +
                'hover:bg-slate-100 dark:hover:bg-slate-800 ' +
                'active:bg-slate-200 dark:active:bg-slate-700 ' +
                'transition-colors" type="button" aria-label="Switch language" ' +
                'data-i18n-aria="lang_switcher_aria">' +
                '<span class="material-symbols-outlined text-base ' +
                'leading-none">language</span>' +
                '<span id="current-lang-label" data-i18n="current_lang">' +
                '中文（简体）</span>' +
                '<span class="material-symbols-outlined text-xs opacity-40">' +
                'expand_more</span>' +
              '</button>' +
              '<div id="language-dropdown-anchor"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</header>'
    );
  }

  /**
   * 构建单个导航项的 HTML（含 dropdown 集成）
   * @param {Object} navItem - 导航项配置
   * @param {string} activeId - 当前激活的导航 id
   * @param {string} variant - 设备变体 (pc / tablet)
   * @returns {string} HTML 字符串
   */
  function buildNavItemHtml(navItem, activeId, variant) {
    var isActive = navItem.id === activeId;
    var activeClass = isActive
      ? "text-sm font-semibold text-primary"
      : "text-sm font-semibold hover:text-primary transition-colors";
    var href = navItem.path;

    /* ---------- 有 dropdown 的导航项 ---------- */
    if (navItem.hasDropdown) {
      var dropdownModules = {
        products:     global.ProductsDropdown,
        applications: global.ApplicationsDropdown,
        support:      global.SupportDropdown,
        about:        global.AboutDropdown
      };
      var dropdown = dropdownModules[navItem.id];

      if (dropdown) {
        var renderArgs = { href: href, labelKey: navItem.key, label: navItem.label, activeClass: activeClass };

        if (variant === "pc") {
          return dropdown.renderPC(renderArgs);
        }
        if (variant === "tablet") {
          return dropdown.renderTablet(renderArgs);
        }
      }

      /* dropdown 模块未加载时，降级为纯文本占位 */
      return '<span class="' + activeClass + ' pointer-events-none">' + navItem.label + "</span>";
    }

    /* ---------- 普通链接导航项 ---------- */
    return (
      '<a class="' + activeClass + '" href="' + escapeHtml(href) + '" ' +
      'data-i18n="' + escapeHtml(navItem.key) + '">' +
      escapeHtml(navItem.label) + '</a>'
    );
  }

  /**
   * 构建导航区域（<nav> 内的所有项）
   * @param {string} activeId - 当前激活的导航 id
   * @param {string} variant - 设备变体
   * @returns {string} HTML 字符串
   */
  function buildNavItemsHtml(activeId, variant) {
    // Always re-read NAV_CONFIG to pick up hot-reloaded changes
    var items =
      typeof NAV_CONFIG !== "undefined" && NAV_CONFIG.mainNav
        ? NAV_CONFIG.mainNav
        : DEFAULT_NAV_ITEMS;
    return items
      .map(function (item) {
        return buildNavItemHtml(item, activeId, variant);
      })
      .join("\n");
  }

  /**
   * 构建桌面端搜索栏 HTML
   * @param {Object} opts - 配置项
   * @param {string} opts.searchI18n - i18n key
   * @param {string} opts.searchBp - 断点 (lg / xl)
   * @returns {string} HTML 字符串
   */
  function buildDesktopSearchHtml(opts) {
    var hiddenClass = opts.searchBp === "lg"
      ? "hidden lg:flex"
      : "hidden xl:flex";

    return (
      '<div class="' + hiddenClass + ' ios-search-wrapper items-center flex-shrink-0">' +
        '<div class="ios-search-bar" id="ios-search-bar">' +
          '<span class="ios-search-icon material-symbols-outlined">search</span>' +
          '<input class="ios-search-input" id="ios-search-input" ' +
            'placeholder="Search equipment..." ' +
            'data-i18n-placeholder="' + escapeHtml(opts.searchI18n) + '" ' +
            'type="search" autocomplete="off" spellcheck="false"/>' +
          '<button class="ios-search-clear" id="ios-search-clear" type="button" ' +
            'aria-label="Clear search" tabindex="-1">' +
            '<span class="material-symbols-outlined">cancel</span>' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  /**
   * 构建语言切换按钮 HTML
   * @returns {string} HTML 字符串
   */
  function buildLangSwitcherHtml() {
    return (
      '<div class="lang-dropdown-container relative flex-shrink-0">' +
        '<button id="lang-toggle-btn" ' +
          'class="flex items-center gap-1.5 px-3 py-2 rounded-xl ' +
          'text-sm font-medium text-slate-600 dark:text-slate-300 ' +
          'hover:bg-slate-100 dark:hover:bg-slate-800 ' +
          'active:bg-slate-200 dark:active:bg-slate-700 ' +
          'transition-colors" type="button" aria-label="Switch language" ' +
          'data-i18n-aria="lang_switcher_aria">' +
          '<span class="material-symbols-outlined text-base leading-none">' +
          'language</span>' +
          '<span id="current-lang-label" data-i18n="current_lang">' +
          '中文（简体）</span>' +
          '<span class="material-symbols-outlined text-xs opacity-40">' +
          'expand_more</span>' +
        '</button>' +
        '<div id="language-dropdown-anchor"></div>' +
      '</div>'
    );
  }

  /**
   * 构建 CTA 按钮（"获取报价"）HTML
   * @param {Object} opts - 配置项
   * @param {string} opts.ctaTextKey - i18n key
   * @param {string} opts.ctaHref - 链接地址
   * @returns {string} HTML 字符串
   */
  function buildCtaButtonHtml(opts) {
    return (
      '<div class="hidden lg:block flex-shrink-0">' +
        '<a href="' + escapeHtml(opts.ctaHref) + '" ' +
          'class="bg-primary text-white px-6 py-2.5 rounded-xl font-bold ' +
          'text-sm whitespace-nowrap hover:opacity-90 active:scale-95 ' +
          'transition-all outline-none" data-i18n="' + escapeHtml(opts.ctaTextKey) + '">' +
          '获取报价' +
        '</a>' +
      '</div>'
    );
  }

  /**
   * 构建完整的桌面端 Header HTML
   * @param {Object} opts - 完整配置项
   * @returns {string} HTML 字符串
   */
  function buildDesktopHeaderHtml(opts) {
    var basePath = window.BASE_PATH || "";
    var rightSideItems = [];

    if (opts.showSearch) {
      rightSideItems.push(buildDesktopSearchHtml({
        searchI18n: opts.searchI18n,
        searchBp: opts.searchBp
      }));
    }
    if (opts.showLang) {
      rightSideItems.push(buildLangSwitcherHtml());
    }
    if (opts.showCta) {
      rightSideItems.push(buildCtaButtonHtml({
        ctaTextKey: opts.ctaTextKey,
        ctaHref: opts.ctaHref
      }));
    }

    return (
      '<div id="pc-header-placeholder" style="height:109px;flex-shrink:0"></div>' +
      '<header class="fixed top-0 left-0 right-0 z-[var(--z-header)] ' +
        'border-b border-slate-200 dark:border-slate-800 ' +
        'bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">' +
        '<div class="max-w-[1920px] mx-auto px-3 md:px-5 lg:px-5 xl:px-10 ' +
          'py-4 flex items-center justify-between" style="min-height:108px">' +
          /* 左侧：Logo + 导航 */
          '<div class="flex items-center gap-4 lg:gap-8">' +
            '<a class="nav-logo-link" href="' + basePath + '/home/">' +
              '<img loading="eager" ' +
                'src="' + basePath + '/assets/images/logo_footer.webp" ' +
                'alt="Yukoli" width="44" height="44" ' +
                'style="width:44px;height:44px;object-fit:contain" />' +
            '</a>' +
            '<nav class="hidden md:flex items-center gap-4 lg:gap-8">' +
              buildNavItemsHtml(opts.active, opts.variant) +
            '</nav>' +
          '</div>' +
          /* 右侧：搜索 / 语言 / CTA */
          '<div class="flex items-center gap-6">' +
            rightSideItems.join("\n") +
          '</div>' +
        '</div>' +
      '</header>'
    );
  }

  /**
   * 根据配置构建 Header HTML（统一入口）
   * @param {Object} opts - 完整配置项
   * @param {string} opts.variant - 设备变体 (mobile / tablet / pc)
   * @returns {string} HTML 字符串
   */
  function buildHeaderHtml(opts) {
    if (opts.variant === "mobile" || opts.variant === "tablet") {
      return buildMobileHeaderHtml(opts);
    }
    return buildDesktopHeaderHtml(opts);
  }

  /* ================================================================
   *  样式注入
   * ================================================================ */

  /**
   * 注入 Logo 链接的基础样式（仅注入一次）
   */
  function injectLogoStyles() {
    if (document.getElementById("nav-logo-styles")) return;

    var style = document.createElement("style");
    style.id = "nav-logo-styles";
    style.textContent = [
      ".nav-logo-link {",
      "  display: flex;",
      "  align-items: center;",
      "  border-radius: 8px;",
      "  padding: 4px;",
      "  transition: background .15s ease, transform .15s cubic-bezier(.32,.72,0,1), opacity .15s ease;",
      "  -webkit-tap-highlight-color: transparent;",
      "}",
      ".nav-logo-link:active {",
      "  background: rgba(236,91,19,.12);",
      "  transform: scale(.92);",
      "}",
      "html.dark .nav-logo-link:active {",
      "  background: rgba(236,91,19,.18);",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  }

  /**
   * 注入 iOS 风格搜索栏样式（仅注入一次）
   */
  function injectSearchStyles() {
    if (document.getElementById("ios-search-styles")) return;

    var style = document.createElement("style");
    style.id = "ios-search-styles";
    style.textContent = [
      /* 搜索容器 */
      ".ios-search-wrapper { display: flex; align-items: center; }",

      /* 搜索栏 */
      ".ios-search-bar {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 6px;",
      "  width: 200px;",
      "  padding: 7px 14px;",
      "  border-radius: 9999px;",
      "  background: rgba(120,120,128,0.12);",
      "  backdrop-filter: blur(12px);",
      "  -webkit-backdrop-filter: blur(12px);",
      "  border: 1px solid rgba(120,120,128,0.18);",
      "  transition: width 320ms cubic-bezier(0.4, 0, 0.2, 1),",
      "              background 200ms ease,",
      "              border-color 200ms ease,",
      "              box-shadow 200ms ease;",
      "  overflow: hidden;",
      "}",
      ".ios-search-bar.is-focused {",
      "  width: 280px;",
      "  background: rgba(120,120,128,0.08);",
      "  border-color: rgba(236,91,19,0.4);",
      "  box-shadow: 0 0 0 3px rgba(236,91,19,0.12);",
      "}",
      "#mobile-ios-search-bar.is-focused {",
      "  background: rgba(120,120,128,0.08);",
      "  border-color: rgba(236,91,19,0.4);",
      "  box-shadow: 0 0 0 3px rgba(236,91,19,0.12);",
      "}",

      /* 暗色模式搜索栏 */
      "html.dark .ios-search-bar {",
      "  background: rgba(255,255,255,0.08);",
      "  border-color: rgba(255,255,255,0.12);",
      "}",
      "html.dark .ios-search-bar.is-focused {",
      "  background: rgba(255,255,255,0.10);",
      "  border-color: rgba(236,91,19,0.5);",
      "  box-shadow: 0 0 0 3px rgba(236,91,19,0.15);",
      "}",
      "html.dark #mobile-ios-search-bar.is-focused {",
      "  background: rgba(255,255,255,0.10);",
      "  border-color: rgba(236,91,19,0.5);",
      "  box-shadow: 0 0 0 3px rgba(236,91,19,0.15);",
      "}",

      /* 搜索图标 */
      ".ios-search-icon {",
      "  font-size: 17px !important;",
      "  line-height: 1;",
      "  flex-shrink: 0;",
      "  color: rgba(60,60,67,0.6);",
      "  transition: color 200ms ease;",
      "}",
      "html.dark .ios-search-icon { color: rgba(235,235,245,0.6); }",
      ".ios-search-bar.is-focused .ios-search-icon { color: #ec5b13; }",

      /* 搜索输入框 */
      ".ios-search-input {",
      "  flex: 1;",
      "  min-width: 0;",
      "  background: transparent;",
      "  border: none;",
      "  outline: none;",
      "  box-shadow: none;",
      "  font-size: 14px;",
      "  font-family: inherit;",
      "  color: inherit;",
      "  line-height: 1.4;",
      "  -webkit-appearance: none;",
      "}",
      ".ios-search-input::-webkit-search-cancel-button { display: none; }",
      ".ios-search-input::placeholder { color: rgba(60,60,67,0.45); }",
      "html.dark .ios-search-input::placeholder { color: rgba(235,235,245,0.4); }",

      /* 清除按钮 */
      ".ios-search-clear {",
      "  display: none;",
      "  align-items: center;",
      "  justify-content: center;",
      "  flex-shrink: 0;",
      "  background: rgba(120,120,128,0.28);",
      "  border: none;",
      "  border-radius: 50%;",
      "  width: 18px;",
      "  height: 18px;",
      "  padding: 0;",
      "  cursor: pointer;",
      "  transition: opacity 150ms ease, background 150ms ease;",
      "}",
      ".ios-search-clear .material-symbols-outlined {",
      "  font-size: 14px !important;",
      "  color: rgba(60,60,67,0.55);",
      "  line-height: 1;",
      "}",
      "html.dark .ios-search-clear { background: rgba(255,255,255,0.20); }",
      "html.dark .ios-search-clear .material-symbols-outlined {",
      "  color: rgba(235,235,245,0.55);",
      "}",
      ".ios-search-clear:hover { opacity: 0.75; }",
      ".ios-search-clear.is-visible { display: flex; }"
    ].join("\n");
    document.head.appendChild(style);
  }

  /**
   * 注入所有 dropdown 模块的基础样式
   */
  function injectDropdownStyles() {
    if (global.DropdownBaseStyles) global.DropdownBaseStyles.inject();
    if (global.ProductsDropdown) global.ProductsDropdown.injectAllStyles();
    if (global.ApplicationsDropdown) global.ApplicationsDropdown.injectAllStyles();
    if (global.SupportDropdown) global.SupportDropdown.injectAllStyles();
    if (global.AboutDropdown) global.AboutDropdown.injectAllStyles();
  }

  /* ================================================================
   *  Dropdown 互斥逻辑
   * ================================================================ */

  /**
   * 关闭除指定元素外的所有已打开 dropdown
   * @param {HTMLElement|null} keepOpen - 保持打开的 dropdown 容器
   */
  function closeOtherDropdowns(keepOpen) {
    for (var i = 0; i < DROPDOWN_WRAP_SELECTORS.length; i++) {
      var openDropdowns = document.querySelectorAll(
        DROPDOWN_WRAP_SELECTORS[i] + ".is-open"
      );
      for (var j = 0; j < openDropdowns.length; j++) {
        if (openDropdowns[j] !== keepOpen) {
          openDropdowns[j].classList.remove("is-open");
        }
      }
    }
  }

  /* ================================================================
   *  搜索栏交互
   * ================================================================ */

  /**
   * 初始化桌面端搜索栏的交互（focus / blur / input / clear / Escape）
   */
  function initDesktopSearchInteraction() {
    var searchBar = document.getElementById("ios-search-bar");
    var searchInput = document.getElementById("ios-search-input");
    var clearBtn = document.getElementById("ios-search-clear");

    if (!searchBar || !searchInput || !clearBtn) return;

    /**
     * 移除搜索栏聚焦状态
     */
    function removeFocus() {
      searchBar.classList.remove("is-focused");
    }

    /**
     * 根据输入框内容切换清除按钮可见性
     */
    function updateClearVisibility() {
      if (searchInput.value.length > 0) {
        clearBtn.classList.add("is-visible");
      } else {
        clearBtn.classList.remove("is-visible");
      }
    }

    searchInput.addEventListener("focus", function () {
      searchBar.classList.add("is-focused");
    });

    searchInput.addEventListener("blur", function () {
      setTimeout(function () {
        if (document.activeElement !== searchInput) removeFocus();
      }, 150);
    });

    searchInput.addEventListener("input", updateClearVisibility);

    /* 阻止清除按钮的 mousedown 以免抢走 focus */
    clearBtn.addEventListener("mousedown", function (e) {
      e.preventDefault();
    });

    clearBtn.addEventListener("click", function () {
      searchInput.value = "";
      updateClearVisibility();
      searchInput.focus();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.activeElement === searchInput) {
        searchInput.value = "";
        updateClearVisibility();
        searchInput.blur();
        removeFocus();
      }
    });
  }

  /**
   * 初始化移动端搜索栏的交互
   */
  function initMobileSearchInteraction() {
    var searchBar = document.getElementById("mobile-ios-search-bar");
    var searchInput = document.getElementById("mobile-header-search-input");
    var clearBtn = searchBar ? searchBar.querySelector(".ios-search-clear") : null;

    if (!searchBar || !searchInput) return;

    /**
     * 移除移动端搜索栏聚焦状态
     */
    function removeFocus() {
      searchBar.classList.remove("is-focused");
    }

    /**
     * 根据输入框内容切换清除按钮可见性
     */
    function updateClearVisibility() {
      if (!clearBtn) return;
      if (searchInput.value.length > 0) {
        clearBtn.classList.add("is-visible");
      } else {
        clearBtn.classList.remove("is-visible");
      }
    }

    searchInput.addEventListener("focus", function () {
      searchBar.classList.add("is-focused");
    });

    searchInput.addEventListener("blur", function () {
      setTimeout(function () {
        if (document.activeElement !== searchInput) removeFocus();
      }, 150);
    });

    searchInput.addEventListener("input", updateClearVisibility);

    if (clearBtn) {
      clearBtn.addEventListener("mousedown", function (e) {
        e.preventDefault();
      });

      clearBtn.addEventListener("click", function () {
        searchInput.value = "";
        updateClearVisibility();
        searchInput.focus();
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && document.activeElement === searchInput) {
          searchInput.value = "";
          updateClearVisibility();
          searchInput.blur();
          removeFocus();
        }
      });
    }
  }

  /* ================================================================
   *  Dropdown 鼠标互斥 & 点击事件绑定
   * ================================================================ */

  /**
   * 为所有 dropdown 容器绑定 mouseenter 互斥逻辑（仅绑定一次）
   */
  function bindDropdownHoverMutex() {
    for (var i = 0; i < DROPDOWN_WRAP_SELECTORS.length; i++) {
      var wraps = document.querySelectorAll(DROPDOWN_WRAP_SELECTORS[i]);
      for (var j = 0; j < wraps.length; j++) {
        bindSingleDropdownMutex(wraps[j]);
      }
    }
  }

  /**
   * 为单个 dropdown 容器绑定 mouseenter 互斥逻辑
   * @param {HTMLElement} wrapEl - dropdown 容器元素
   */
  function bindSingleDropdownMutex(wrapEl) {
    if (wrapEl._dropdownMutexBound) return;
    wrapEl._dropdownMutexBound = true;

    wrapEl.addEventListener("mouseenter", function () {
      if (!wrapEl.classList.contains("touch-device")) {
        closeOtherDropdowns(wrapEl);
      }
    });
  }

  /**
   * 绑定全局 click 事件——点击空白区域关闭所有 dropdown
   */
  function bindGlobalDropdownClose() {
    document.addEventListener("click", function (e) {
      var clickedWrap = e.target.closest(
        ".prod-dropdown-wrap, .app-dropdown-wrap, .sup-dropdown-wrap, .abt-dropdown-wrap"
      );
      closeOtherDropdowns(clickedWrap || null);
    }, true);
  }

  /**
   * 初始化各 dropdown 模块的点击事件
   */
  function initDropdownClickHandlers() {
    if (global.ProductsDropdown) global.ProductsDropdown.initDropdownClick();
    if (global.ApplicationsDropdown) global.ApplicationsDropdown.initDropdownClick();
    if (global.SupportDropdown) global.SupportDropdown.initDropdownClick();
    if (global.AboutDropdown) global.AboutDropdown.initDropdownClick();
  }

  /* ================================================================
   *  翻译 & SlideMenu 初始化
   * ================================================================ */

  /**
   * 重新绑定翻译管理器的事件监听并应用当前语言翻译
   */
  function reinitTranslationManager() {
    if (!global.translationManager) return;

    if (typeof global.translationManager.resetEventListeners === "function") {
      global.translationManager.resetEventListeners();
    }
    if (typeof global.translationManager.applyTranslations === "function") {
      global.translationManager.applyTranslations();
    }
    if (typeof global.translationManager.setupEventListeners === "function") {
      global.translationManager.setupEventListeners();
    }
  }

  /**
   * 初始化 SlideMenu（侧滑菜单）
   */
  function initSlideMenu() {
    if (!global.SlideMenu) return;

    if (typeof global.SlideMenu.initToggle === "function") {
      global.SlideMenu.initToggle();
    }
    if (typeof global.SlideMenu.initSmartHeader === "function") {
      global.SlideMenu.initSmartHeader();
    }
  }

  /**
   * 初始化平板端搜索切换按钮
   */
  function initTabletSearchToggle() {
    var toggleBtn = document.getElementById("tablet-search-toggle");
    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (global.SlideMenu && typeof global.SlideMenu.openMobileSearch === "function") {
        global.SlideMenu.openMobileSearch();
      }
    });
  }

  /* ================================================================
   *  从 placeholder 解析配置
   * ================================================================ */

  /**
   * 根据窗口宽度和 data-variant 属性确定设备变体
   * @param {string} declaredVariant - placeholder 上声明的 variant
   * @returns {string} 实际使用的 variant (mobile / tablet / pc)
   */
  function resolveVariant(declaredVariant) {
    if (declaredVariant !== "pc") return declaredVariant;

    var width = window.innerWidth;
    if (width < 768) return "mobile";
    if (width < 1024) return "tablet";
    return "pc";
  }

  /**
   * 从 placeholder DOM 元素提取完整的 header 配置
   * @param {HTMLElement} placeholder - data-component="navigator" 元素
   * @returns {Object} 配置对象
   */
  function extractConfigFromPlaceholder(placeholder) {
    var variant = resolveVariant(placeholder.getAttribute("data-variant") || "pc");

    return {
      variant:    variant,
      active:     placeholder.getAttribute("data-active") || "",
      showSearch: parseBooleanAttr(placeholder.getAttribute("data-search"), false),
      searchI18n: placeholder.getAttribute("data-search-i18n") || "search_placeholder",
      searchBp:   placeholder.getAttribute("data-search-bp") || "xl",
      showLang:   parseBooleanAttr(placeholder.getAttribute("data-lang"), true),
      showCta:    parseBooleanAttr(placeholder.getAttribute("data-cta"), true),
      ctaTextKey: placeholder.getAttribute("data-cta-text-key") || "nav_get_quote",
      ctaHref:    placeholder.getAttribute("data-cta-href") || "/quote/"
    };
  }

  /* ================================================================
   *  mount() — 核心挂载函数
   * ================================================================ */

  /**
   * 查找所有 [data-component="navigator"] 占位符并替换为实际的 header。
   * 同时注入样式、绑定交互事件。
   */
  function mountNavigator() {
    /* 1. 注入样式 */
    injectDropdownStyles();
    injectLogoStyles();
    injectSearchStyles();

    console.log(
      "[navigator] mount() called, found",
      document.querySelectorAll('[data-component="navigator"]').length,
      "placeholder(s)"
    );

    /* 2. 遍历占位符并替换 */
    var placeholders = document.querySelectorAll('[data-component="navigator"]');

    for (var i = 0; i < placeholders.length; i++) {
      var placeholder = placeholders[i];

      if (!placeholder.parentNode) {
        console.warn("[navigator] Placeholder has no parent, skipping (already mounted?)");
        continue;
      }

      /* 如果 placeholder 内已有 <header>，直接提取替换 */
      var existingHeader = placeholder.querySelector("header");
      if (existingHeader) {
        placeholder.parentNode.replaceChild(existingHeader, placeholder);
        continue;
      }

      /* 否则根据配置构建新 header */
      var config = extractConfigFromPlaceholder(placeholder);
      currentVariant = config.variant;

      var wrapper = document.createElement("div");
      wrapper.innerHTML = buildHeaderHtml(config);

      /*
       * buildHeaderHtml 可能返回两个顶级元素：
       *   [0] placeholder div (id="mobile-header-placeholder" 或 "pc-header-placeholder")
       *   [1] <header> 元素
       */
      var placeholderEl = wrapper.firstElementChild;
      var headerEl = placeholderEl ? placeholderEl.nextElementSibling : wrapper.firstChild;

      console.log(
        "[navigator] buildHeader children:", wrapper.children.length,
        "| placeholder:", placeholderEl ? placeholderEl.tagName + "#" + placeholderEl.id : "NULL",
        "| header:", headerEl ? headerEl.tagName + "#" + (headerEl.id || "") : "NULL"
      );

      /* 插入 placeholder（保留高度占位） */
      if (placeholderEl && placeholderEl.id) {
        placeholder.parentNode.insertBefore(placeholderEl, placeholder);
      }

      /* 替换占位符为 header */
      console.log(
        "[navigator] variant=" + config.variant,
        "| header inserted, tag=" + (headerEl ? headerEl.tagName : "NULL")
      );
      placeholder.parentNode.replaceChild(headerEl, placeholder);

      /* 延迟初始化 SlideMenu（等 DOM 完成） */
      setTimeout(initSlideMenu, 0);
    }

    /* 3. 初始化搜索栏交互 */
    initDesktopSearchInteraction();
    initMobileSearchInteraction();

    /* 4. Dropdown 互斥 & 点击事件 */
    bindDropdownHoverMutex();
    bindGlobalDropdownClose();
    initDropdownClickHandlers();

    /* 5. 翻译管理器 */
    reinitTranslationManager();

    /* 6. SlideMenu 初始化 */
    console.log(
      "[navigator] MobileMenu exists:", !!global.SlideMenu,
      "| initToggle:", typeof (global.SlideMenu && global.SlideMenu.initToggle)
    );
    initSlideMenu();

    /* 7. 平板端搜索切换 */
    initTabletSearchToggle();
  }

  /* ================================================================
   *  updateActive() — SPA 导航后更新 active 状态
   * ================================================================ */

  /**
   * 更新导航栏中的 active 高亮状态。
   * 根据当前 URL 匹配导航项和 dropdown 子项。
   *
   * @param {string} [activeSectionId=""] - 当前页面所属导航 section id
   *   (e.g. "products", "applications", "support", "about")
   */
  function updateActive(activeSectionId) {
    activeSectionId = activeSectionId || "";
    var currentPath = window.location.pathname.replace(/\/$/, "") || "/";

    /* Re-read NAV_CONFIG on every call — module-level navItems may be stale (DEFAULT_NAV_ITEMS)
     * if nav-config.js loaded after navigator.js */
    var navItems =
      typeof NAV_CONFIG !== "undefined" && NAV_CONFIG.mainNav
        ? NAV_CONFIG.mainNav
        : DEFAULT_NAV_ITEMS;

    /* 确保 dropdown 样式已注入（SPA 动态加载场景） */
    injectDropdownStyles();

    /* ---------- 1. 更新 dropdown trigger 元素的高亮 ---------- */
    var triggerSelectors = [
      "header nav a.prod-dropdown-trigger",
      "header nav a.app-dropdown-trigger",
      "header nav a.sup-dropdown-trigger",
      "header nav a.abt-dropdown-trigger",
      "header nav a[data-sup-trigger-label]",
      "header nav a[data-prod-trigger-label]",
      "header nav a[data-app-trigger-label]",
      "header nav a[data-abt-trigger-label]"
    ];

    var triggers = document.querySelectorAll(triggerSelectors.join(", "));

    for (var i = 0; i < triggers.length; i++) {
      var triggerEl = triggers[i];

      /* 应用路径映射 */
      var mappedId = activeSectionId;
      if (PATH_TO_ACTIVE_MAP[activeSectionId]) {
        mappedId = PATH_TO_ACTIVE_MAP[activeSectionId];
      }

      /* 判断该 trigger 是否属于当前激活的 section */
      var triggerKey =
        triggerEl.getAttribute("data-i18n") ||
        triggerEl.getAttribute("data-prod-trigger-label") ||
        triggerEl.getAttribute("data-sol-trigger-label") ||
        triggerEl.getAttribute("data-app-trigger-label") ||
        triggerEl.getAttribute("data-sup-trigger-label") ||
        triggerEl.getAttribute("data-abt-trigger-label") ||
        triggerEl.getAttribute("data-cnt-trigger-label") ||
        "";

      var isMatch = false;
      var matchIds = ID_ALIASES[mappedId] || [mappedId];
      for (var j = 0; j < navItems.length; j++) {
        if (matchIds.indexOf(navItems[j].id) !== -1 && triggerKey === navItems[j].key) {
          isMatch = true;
          break;
        }
      }

      /* 使用 classList 增删样式，不覆盖 className */
      if (isMatch) {
        triggerEl.classList.add("text-primary");
        triggerEl.classList.remove("hover\\:text-primary", "transition-colors");
      } else {
        triggerEl.classList.remove("text-primary");
        triggerEl.classList.add("hover\\:text-primary", "transition-colors");
      }
    }

    /* ---------- 1b. 更新非 dropdown 普通链接导航项的高亮 ---------- */
    var plainLinks = document.querySelectorAll("header nav a[data-i18n]");
    for (var pi = 0; pi < plainLinks.length; pi++) {
      var plainEl = plainLinks[pi];
      /* Skip dropdown triggers (already handled above) */
      if (plainEl.classList.contains("prod-dropdown-trigger") ||
          plainEl.classList.contains("app-dropdown-trigger") ||
          plainEl.classList.contains("sup-dropdown-trigger") ||
          plainEl.classList.contains("abt-dropdown-trigger")) {
        continue;
      }
      var plainKey = plainEl.getAttribute("data-i18n") || "";
      var plainMatch = false;
      var matchIds2 = ID_ALIASES[mappedId] || [mappedId];
      for (var pk = 0; pk < navItems.length; pk++) {
        if (matchIds2.indexOf(navItems[pk].id) !== -1 && plainKey === navItems[pk].key) {
          plainMatch = true;
          break;
        }
      }
      if (plainMatch) {
        plainEl.classList.add("text-primary");
        plainEl.classList.remove("hover\\:text-primary", "transition-colors");
      } else {
        plainEl.classList.remove("text-primary");
        plainEl.classList.add("hover\\:text-primary", "transition-colors");
      }
    }

    /* ---------- 2. 清除所有 dropdown item 的 is-active ---------- */
    var activeItems = document.querySelectorAll(
      ".prod-dropdown-item.is-active, " +
      ".app-dropdown-item.is-active, " +
      ".sup-dropdown-item.is-active, " +
      ".abt-dropdown-item.is-active"
    );
    for (var k = 0; k < activeItems.length; k++) {
      activeItems[k].classList.remove("is-active");
    }

    /* ---------- 3. 根据当前 URL 设置 dropdown item 的 is-active ---------- */
    if (!activeSectionId) return;

    var prefix = ACTIVE_TO_PREFIX_MAP[activeSectionId];
    if (!prefix) return;

    var dropdownItems = document.querySelectorAll("." + prefix + "-dropdown-item");
    var matchedItem = null;

    /* 3a. 精确匹配 href */
    for (var m = 0; m < dropdownItems.length; m++) {
      var itemHref = dropdownItems[m].getAttribute("href");
      if (!itemHref) continue;

      var cleanHref = itemHref.replace(/\/$/, "");
      var cleanPath = currentPath.replace(/\/$/, "");

      if (cleanHref === cleanPath) {
        matchedItem = dropdownItems[m];
        break;
      }
    }

    /* 3b. 前缀匹配（排除 viewall 项） */
    if (!matchedItem) {
      for (var n = 0; n < dropdownItems.length; n++) {
        var subHref = dropdownItems[n].getAttribute("href");
        if (!subHref) continue;

        var cleanSubHref = subHref.replace(/\/$/, "");
        if (dropdownItems[n].classList.contains("prod-viewall-item")) continue;

        var pathPrefix = cleanSubHref.split("?")[0].replace(/\/$/, "");
        var normalizedPath = currentPath.replace(/\/$/, "");

        if (normalizedPath.indexOf(pathPrefix + "/") === 0) {
          matchedItem = dropdownItems[n];
          break;
        }
      }
    }

    if (matchedItem && matchedItem.classList) {
      matchedItem.classList.add("is-active");
    }
  }

  /* ================================================================
   *  highlightCategory() — 手动高亮产品分类
   * ================================================================ */

  /**
   * 高亮指定的产品分类 dropdown item（用于产品详情页侧边栏联动）
   *
   * @param {string} categoryKey - 要高亮的分类 i18n key
   *   (e.g. "nav_products_cutting")
   */
  function highlightCategory(categoryKey) {
    if (!categoryKey) return;

    /* 先清除所有产品 dropdown 的 is-active */
    var activeProducts = document.querySelectorAll(".prod-dropdown-item.is-active");
    for (var i = 0; i < activeProducts.length; i++) {
      activeProducts[i].classList.remove("is-active");
    }

    /* 按匹配 key 设置 is-active */
    var allProductItems = document.querySelectorAll(".prod-dropdown-item");
    for (var j = 0; j < allProductItems.length; j++) {
      var label = allProductItems[j].getAttribute("data-i18n") || "";
      if (label === categoryKey) {
        allProductItems[j].classList.add("is-active");
        break;
      }
    }
  }

  /* ================================================================
   *  resize 响应（防抖）
   * ================================================================ */

  /**
   * 监听窗口 resize，当设备变体变化时重新挂载导航
   */
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var newVariant;
      if (window.innerWidth < 768) {
        newVariant = "mobile";
      } else if (window.innerWidth < 1024) {
        newVariant = "tablet";
      } else {
        newVariant = "pc";
      }

      if (newVariant !== currentVariant) {
        currentVariant = newVariant;
        mountNavigator();

        /* 移动端变体需要重新初始化菜单切换 */
        if (newVariant === "mobile" && global.SlideMenu) {
          if (typeof global.SlideMenu.initToggle === "function") {
            global.SlideMenu.initToggle();
          }
        }
      }
    }, 300);
  });

  /* ================================================================
   *  初始化入口
   * ================================================================ */

  /* 首次加载：DOM ready 后挂载 */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountNavigator);
  } else {
    mountNavigator();
  }

  /* bfcache 回退：pageshow 时重新挂载（如果 header 已丢失） */
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;

    var placeholders = document.querySelectorAll('[data-component="navigator"]');
    var needsRemount = false;

    for (var i = 0; i < placeholders.length; i++) {
      var ph = placeholders[i];
      if (!ph.querySelector("header") && !ph.querySelector("nav")) {
        needsRemount = true;
        break;
      }
    }

    if (needsRemount) mountNavigator();
  });

  /* ================================================================
   *  公开 API — window.Navigator
   * ================================================================ */

  global.Navigator = {
    /**
     * 挂载导航栏（查找占位符并替换）
     */
    mount: mountNavigator,

    /**
     * 根据 section id 更新导航 active 状态
     * @param {string} [activeSectionId] - 当前 section id
     */
    updateActive: updateActive,

    /**
     * 高亮指定的产品分类
     * @param {string} categoryKey - 分类 i18n key
     */
    highlightCategory: highlightCategory
  };

  /* ================================================================
   *  移动端底部栏 & SPA 事件
   * ================================================================ */

  /**
   * 移动端底部栏（由 mobile-bottom-bar.js 提供）
   */
  if (window.MobileBottomBar) window.MobileBottomBar.render();

  /**
   * SPA 路由导航事件——重新初始化导航和底部栏
   */
  document.addEventListener("spa:load", function () {
    /* 如果 header 丢失则重新挂载 */
    if (!document.querySelector("header")) mountNavigator();

    /* 确保 mobile header 可见 */
    var mobileHeader = document.getElementById("mobile-header");
    if (mobileHeader) mobileHeader.classList.remove("header-hidden");

    /* 延迟重新初始化依赖模块 */
    setTimeout(function () {
      if (window.SlideMenu) {
        if (window.SlideMenu.initToggle) window.SlideMenu.initToggle();
        if (window.SlideMenu.initSmartHeader) window.SlideMenu.initSmartHeader();
      }
      if (window.MobileBottomBar) window.MobileBottomBar.render();
    }, 0);
  });

})(window);
