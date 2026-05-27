/**
 * navigator.js — 主导航组件
 *
 * 负责渲染桌面端、平板端、移动端三种布局的顶部导航栏，
 * 协调各 dropdown 子模块的样式注入与点击事件绑定，
 * 并提供 updateActive / highlightCategory 等公开 API 供 SPA 路由调用。
 *
 * 依赖：
 *   - (nav-config removed — uses built-in defaults)
 *   - window.ProductsDropdown       (dropdown/products-dropdown.js)
 *   - window.ApplicationsDropdown   (dropdown/applications-dropdown.js)
 *   - window.SupportDropdown        (dropdown/support-dropdown.js)
 *   - window.AboutDropdown          (dropdown/about-dropdown.js)
 *   - window.SlideMenu              (slide-menu.js)
 *   - window.DropdownBaseStyles     (dropdown-styles.js)
 */
/* global CustomSelect */
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

  /** Safe i18n helper — guards against scripts loading before translations.js.
   *  Returns fallback text when translation system is not yet ready.
   *  reinitTranslationManager() will apply correct translations once cache is populated. */
  function _t(key, fallback) {
    var _logT = key === "nav_products" || key === "nav_home";
    // 优先用 translationManager（已初始化时）
    if (typeof window.uiText === "function") {
      var v = window.uiText(key, null);
      if (v) return v;
    }
    // Fallback: 从 localStorage 翻译缓存同步读取
    var lang = localStorage.getItem("userLanguage");
    if (lang) {
      try {
        var cacheKey = "yukoli-translations-ui-" + lang;
        var cached = localStorage.getItem(cacheKey);
        if (cached) {
          var data = JSON.parse(cached);
          if (data && data.data && data.data[key]) return data.data[key];
        }
      } catch (e) {
        /* ignore */
      }
    }
    return fallback || key;
  }

  /* ================================================================
   *  常量 & 配置
   * ================================================================ */

  /**
   * 主导航项 — 从 NAV_CONFIG 读取
   * @type {Array<{key:string, label:string, path:string, id:string, hasDropdown:boolean}>}
   */
  var DEFAULT_NAV_ITEMS;

  function _getNavItems() {
    if (DEFAULT_NAV_ITEMS) return DEFAULT_NAV_ITEMS;
    var cfg = window.NAV_CONFIG;
    if (cfg && cfg.items) {
      DEFAULT_NAV_ITEMS = cfg.items.map(function (navItem) {
        return {
          key: navItem.key,
          label: _t(navItem.key, navItem.key),
          path: navItem.path,
          id: navItem.id,
          hasDropdown: navItem.hasDropdown,
        };
      });
      return DEFAULT_NAV_ITEMS;
    }
    // NAV_CONFIG not ready yet — return empty but don't cache
    return [];
  }

  /**
   * 所有 dropdown 容器的 CSS 类名（用于互斥开关）
   * @type {string[]}
   */
  var DROPDOWN_WRAP_SELECTORS = [
    ".prod-dropdown-wrap",
    ".app-dropdown-wrap",
    ".sup-dropdown-wrap",
    ".abt-dropdown-wrap",
    ".cnt-dropdown-wrap",
  ];

  var DROPDOWN_TRIGGER_SELECTORS = [
    ".prod-dropdown-trigger",
    ".app-dropdown-trigger",
    ".sup-dropdown-trigger",
    ".abt-dropdown-trigger",
    ".cnt-dropdown-trigger",
  ];

  /**
   * 特殊路径 → 导航 active id 的映射（从 NAV_CONFIG 读取）
   * @type {Object<string, string>}
   */
  var PATH_TO_ACTIVE_MAP;
  var ID_ALIASES;

  function _getActiveMap() {
    if (PATH_TO_ACTIVE_MAP) return PATH_TO_ACTIVE_MAP;
    var cfg = window.NAV_CONFIG;
    PATH_TO_ACTIVE_MAP = cfg && cfg.pathToActiveMap ? cfg.pathToActiveMap : {};
    ID_ALIASES = cfg && cfg.idAliases ? cfg.idAliases : {};
    return PATH_TO_ACTIVE_MAP;
  }

  /**
   * 导航 id → dropdown item 前缀的映射
   * @type {Object<string, string>}
   */
  var ACTIVE_TO_PREFIX_MAP = {
    products: "prod",
    applications: "app",
    support: "sup",
    about: "abt",
    contact: "cnt",
    "case-studies": "app",
    roi: "sol",
    news: "cnt",
    quote: "cnt",
    "thank-you": "cnt",
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
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
  /**
   * 统一搜索栏构建（PC / Mobile / Tablet 共用）
   * @param {Object} opts
   * @param {string} opts.id          - 搜索栏 DOM id（如 'search-bar'）
   * @param {string} opts.inputId     - 搜索输入框 id（如 'search-input'）
   * @param {string} opts.placeholderI18n - i18n placeholder key
   * @param {string} [opts.wrapperClass] - 可选 wrapper 额外 class
   * @param {string} [opts.barClass]    - 可选 bar 额外 class
   * @returns {string} HTML 字符串
   */
  function buildSearchBarHtml(opts) {
    var id = opts.id || "search-bar";
    var inputId = opts.inputId || id + "-input";
    return (
      '<div class="ios-search-wrapper ' +
      (opts.wrapperClass || "") +
      '">' +
      '<div class="ios-search-bar" id="' +
      id +
      '" ' +
      (opts.barClass || "") +
      ">" +
      '<span class="ios-search-icon material-symbols-outlined">search</span>' +
      '<input class="ios-search-input" id="' +
      inputId +
      '" ' +
      'placeholder="Search equipment..." ' +
      'data-i18n-placeholder="' +
      escapeHtml(opts.placeholderI18n || "search_placeholder") +
      '" ' +
      'type="search" autocomplete="off" spellcheck="false"/>' +
      '<a class="ios-search-clear" href="javascript:void(0)" ' +
      'aria-label="Clear" role="button" tabindex="-1" ' +
      'style="text-decoration:none;-webkit-tap-highlight-color:transparent">' +
      '<span class="material-symbols-outlined">cancel</span>' +
      "</a>" +
      "</div>" +
      "</div>"
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
    var isTablet = opts.variant === "tablet";

    /* 右侧区域：tablet 显示 语言切换 + CTA（和 PC 顺序一致），mobile 只显示语言切换 */
    var rightSide = "";
    if (isTablet && opts.showCta) {
      rightSide =
        '<div class="flex items-center gap-2 flex-shrink-0">' +
        buildLangSelectorHtml() +
        '<a href="' +
        escapeHtml(opts.ctaHref || "/quote/") +
        '" ' +
        'class="bg-primary text-white px-4 py-2 rounded-lg font-bold ' +
        'text-xs whitespace-nowrap active:scale-95 transition-all outline-none" ' +
        'style="-webkit-tap-highlight-color:transparent;color:#fff!important;"' +
        'data-i18n="' +
        escapeHtml(opts.ctaTextKey || "nav_get_quote") +
        '">' +
        _t("nav_get_quote", "Get a Quote") +
        "</a>" +
        "</div>";
    } else {
      rightSide = '<div class="flex-shrink-0">' + buildLangSelectorHtml() + "</div>";
    }

    return (
      '<header id="mobile-header" ' +
      'class="fixed top-0 left-0 right-0 z-[var(--z-header)] ' +
      "border-b border-slate-200 dark:border-slate-800 " +
      'bg-background-light/90 dark:bg-background-dark/90 transition-transform duration-300">' +
      '<div class="px-4 py-3 flex items-center gap-3">' +
      /* 左侧：汉堡菜单 + Logo */
      '<div class="flex items-center gap-1 flex-shrink-0">' +
      '<a id="mobile-menu-toggle" href="javascript:void(0)" ' +
      'class="flex items-center justify-center w-10 h-10 -ml-2 ' +
      "rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 " +
      'transition-colors" role="button" aria-label="Menu" ' +
      'style="text-decoration:none;-webkit-tap-highlight-color:transparent">' +
      '<span class="material-symbols-outlined text-2xl">menu</span>' +
      "</a>" +
      '<a class="nav-logo-link hidden lg:block" href="' +
      basePath +
      '/home/">' +
      '<img loading="eager" ' +
      'src="' +
      basePath +
      '/assets/images/logo/logo.webp" ' +
      'alt="Yukoli" width="32" height="32" ' +
      'style="width:32px;height:32px;object-fit:contain" />' +
      "</a>" +
      "</div>" +
      /* 中间：搜索栏 */
      '<div class="flex-1 min-w-0 mx-1">' +
      buildSearchBarHtml({ id: "mobile-search-bar", inputId: "mobile-search-input", placeholderI18n: searchI18n }) +
      "</div>" +
      /* 右侧 */
      rightSide +
      "</div>" +
      "</header>"
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
    _getActiveMap();
    var activeIds = ID_ALIASES[activeId] || [activeId];
    var isActive = activeIds.indexOf(navItem.id) !== -1;
    var activeClass = isActive
      ? "text-sm font-semibold text-primary"
      : "text-sm font-semibold hover:text-primary transition-colors";
    var href = navItem.path;

    /* ---------- 有 dropdown 的导航项 ---------- */
    if (navItem.hasDropdown) {
      var dropdownModules = {
        products: window.ProductsDropdown,
        applications: window.ApplicationsDropdown,
        support: window.SupportDropdown,
        about: window.AboutDropdown,
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
    var safeHref = escapeHtml(href);
    return (
      '<a class="' +
      activeClass +
      '" href="' +
      safeHref +
      '">' +
      '<span data-i18n="' +
      escapeHtml(navItem.key) +
      '">' +
      escapeHtml(navItem.label) +
      "</span>" +
      "</a>"
    );
  }

  /**
   * 构建导航区域（<nav> 内的所有项）
   * @param {string} activeId - 当前激活的导航 id
   * @param {string} variant - 设备变体
   * @returns {string} HTML 字符串
   */
  function buildNavItemsHtml(activeId, variant) {
    var items = _getNavItems();
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
    var hiddenClass = opts.searchBp === "lg" ? "hidden lg:flex" : "hidden xl:flex";
    return buildSearchBarHtml({
      id: "search-bar",
      inputId: "search-input",
      placeholderI18n: opts.searchI18n,
      wrapperClass: hiddenClass + " items-center flex-shrink-0",
      barClass: "",
    });
  }

  /**
   * Ensure custom-select.js is loaded (dynamic loader)
   * Idempotent — safe to call multiple times.
   */
  function _loadScript(src, id) {
    if (document.getElementById(id)) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.id = id;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function ensureCustomSelect() {
    if (typeof CustomSelect !== "undefined") return Promise.resolve();
    var basePath = window.BASE_PATH || "";
    return _loadScript(basePath + "/assets/js/ui/custom-select.js", "custom-select-dynamic");
  }

  function ensureLangRegistry() {
    if (typeof window.LANG_REGISTRY !== "undefined") return Promise.resolve();
    var basePath = window.BASE_PATH || "";
    return _loadScript(basePath + "/assets/js/lang-registry.js", "lang-registry-dynamic");
  }

  /**
   * Populate hidden <select> with optgroups from LANG_REGISTRY.
   * Safe to call multiple times — clears and rebuilds.
   */
  function _populateLangSelect(selectEl) {
    var reg = window.LANG_REGISTRY;
    if (!reg || !reg.LANGUAGES || !selectEl) return;

    // Clear existing content
    selectEl.innerHTML = "";

    var currentLang = localStorage.getItem("userLanguage") || "zh-CN";
    var groups = {
      common: { label: _t("lang_group_common", "Common"), langs: [] },
      southeast_asia: { label: _t("lang_group_se_asia", "Southeast Asia"), langs: [] },
      east_asia: { label: _t("lang_group_east_asia", "East Asia"), langs: [] },
      european: { label: _t("lang_group_europe", "Europe"), langs: [] },
      other: { label: _t("lang_group_other", "Other"), langs: [] },
    };

    reg.LANGUAGES.forEach(function (l) {
      var g = l.uiGroup || "common";
      if (!groups[g]) groups[g] = { label: g, langs: [] };
      groups[g].langs.push(l);
    });

    var groupOrder = ["common", "southeast_asia", "east_asia", "european", "other"];
    groupOrder.forEach(function (gid) {
      var grp = groups[gid];
      if (!grp || grp.langs.length === 0) return;
      var og = document.createElement("optgroup");
      og.setAttribute("label", grp.label);
      grp.langs.forEach(function (l) {
        var opt = document.createElement("option");
        opt.value = l.code;
        opt.textContent = l.nativeName;
        if (l.code === currentLang) opt.selected = true;
        og.appendChild(opt);
      });
      selectEl.appendChild(og);
    });
  }

  /**
   * Build language switcher — icon+text button (original style) + hidden <select> with optgroups.
   * The button triggers custom-select's dropdown on click via initLangSwitcher().
   * @returns {string} HTML string
   */
  function buildLangSelectorHtml() {
    // Always generate the button + empty hidden <select>.
    // The <select> is populated lazily on first click (when LANG_REGISTRY is available),
    // so this works even on pages that don't load lang-registry.js directly.
    var currentLang = localStorage.getItem("userLanguage") || "zh-CN";
    var currentLangName = currentLang;
    var reg = window.LANG_REGISTRY;
    if (reg && reg.LANGUAGES) {
      var found = reg.LANGUAGES.find(function (l) {
        return l.code === currentLang;
      });
      if (found) currentLangName = found.nativeName;
    }

    return (
      '<div class="lang-dropdown-container relative flex-shrink-0">' +
      '<a id="lang-toggle-btn" href="javascript:void(0)" ' +
      'class="flex items-center gap-1 px-2 py-2 rounded-xl ' +
      "text-sm font-medium text-slate-600 dark:text-slate-300 " +
      "hover:bg-slate-100 dark:hover:bg-slate-800 " +
      "active:bg-slate-200 dark:active:bg-slate-700 " +
      'transition-colors md:gap-1.5 md:px-3" role="button" ' +
      'aria-label="Switch language" ' +
      'data-i18n-aria="lang_switcher_aria" ' +
      'style="text-decoration:none;-webkit-tap-highlight-color:transparent">' +
      '<span class="material-symbols-outlined text-base ' +
      'leading-none">language</span>' +
      '<span id="current-lang-label" data-i18n="current_lang">' +
      escapeHtml(currentLangName) +
      "</span>" +
      '<span class="material-symbols-outlined text-xs opacity-40">' +
      "expand_more</span>" +
      "</a>" +
      '<select id="lang-selector" style="display:none"></select>' +
      "</div>"
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
      '<a href="' +
      escapeHtml(opts.ctaHref) +
      '" ' +
      'class="bg-primary text-white px-6 py-2.5 rounded-xl font-bold ' +
      "text-sm whitespace-nowrap hover:opacity-90 active:scale-95 " +
      'transition-all outline-none" ' +
      'style="-webkit-tap-highlight-color:transparent;color:#fff!important;" ' +
      'data-i18n="' +
      escapeHtml(opts.ctaTextKey) +
      '">' +
      _t("nav_get_quote", "Get a Quote") +
      "</a>" +
      "</div>"
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
      rightSideItems.push(
        buildDesktopSearchHtml({
          searchI18n: opts.searchI18n,
          searchBp: opts.searchBp,
        })
      );
    }
    if (opts.showLang) {
      rightSideItems.push(buildLangSelectorHtml());
    }
    if (opts.showCta) {
      rightSideItems.push(
        buildCtaButtonHtml({
          ctaTextKey: opts.ctaTextKey,
          ctaHref: opts.ctaHref,
        })
      );
    }

    return (
      '<header class="fixed top-0 left-0 right-0 z-[var(--z-header)] ' +
      "border-b border-slate-200 dark:border-slate-800 " +
      'bg-background-light/90 dark:bg-background-dark/90">' +
      '<div class="max-w-[1920px] mx-auto px-3 md:px-5 lg:px-5 xl:px-10 ' +
      'py-4 flex items-center justify-between" style="min-height:108px">' +
      /* 左侧：Logo + 导航 */
      '<div class="flex items-center gap-4 lg:gap-8">' +
      '<a class="nav-logo-link hidden lg:block" href="' +
      basePath +
      '/home/">' +
      '<img loading="eager" ' +
      'src="' +
      basePath +
      '/assets/images/logo/logo.webp" ' +
      'alt="Yukoli" width="44" height="44" ' +
      'style="width:44px;height:44px;object-fit:contain" />' +
      "</a>" +
      '<nav class="hidden md:flex items-center gap-4 lg:gap-8">' +
      buildNavItemsHtml(opts.active, opts.variant) +
      "</nav>" +
      "</div>" +
      /* 右侧：搜索 / 语言 / CTA */
      '<div class="flex items-center gap-6">' +
      rightSideItems.join("\n") +
      "</div>" +
      "</div>" +
      "</header>"
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

  /**
   * 注入 iOS 风格搜索栏样式（仅注入一次）
   */

  /**
   * 注入所有 dropdown 模块的基础样式
   */

  /* ================================================================
   *  Dropdown 互斥逻辑
   * ================================================================ */

  /**
   * 关闭除指定元素外的所有已打开 dropdown
   * @param {HTMLElement|null} keepOpen - 保持打开的 dropdown 容器
   */
  function closeOtherDropdowns(keepOpen) {
    for (var i = 0; i < DROPDOWN_WRAP_SELECTORS.length; i++) {
      var openDropdowns = document.querySelectorAll(DROPDOWN_WRAP_SELECTORS[i] + ".is-open");
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
   * 统一搜索栏交互初始化（focus / blur / input / clear / Escape）
   * 自动检测页面上存在的搜索栏并绑定事件
   */
  function initSearchInteraction() {
    var bars = document.querySelectorAll(".ios-search-bar");
    if (bars.length === 0) return;

    bars.forEach(function (bar) {
      var searchInput = bar.querySelector(".ios-search-input");
      var clearBtn = bar.querySelector(".ios-search-clear");
      if (!searchInput) return;

      function removeFocus() {
        bar.classList.remove("is-focused");
      }

      function updateClearVisibility() {
        if (!clearBtn) return;
        if (searchInput.value.length > 0) {
          clearBtn.classList.add("is-visible");
        } else {
          clearBtn.classList.remove("is-visible");
        }
      }

      searchInput.addEventListener("focus", function () {
        bar.classList.add("is-focused");
      });

      // Use mousedown on bar to detect if user clicked inside the search bar
      // before blur fires. This avoids the blur/click race condition.
      bar.addEventListener(
        "mousedown",
        function (e) {
          if (bar.contains(e.target)) {
            bar._mousedownInside = true;
          }
        },
        true
      );
      searchInput.addEventListener("blur", function () {
        // If mousedown was inside bar, a click is pending; don't remove focus yet
        if (bar._mousedownInside) {
          bar._mousedownInside = false;
          return;
        }
        removeFocus();
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
      }

      // Escape key: clear search and close results (works regardless of clearBtn)
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && document.activeElement === searchInput) {
          searchInput.value = "";
          updateClearVisibility();
          searchInput.blur();
          removeFocus();
          closeResults();
        }
      });

      // Search results dropdown (always created)
      var resultsPanel = document.createElement("div");
      resultsPanel.className = "search-results-panel";
      bar.appendChild(resultsPanel);

      var searchTimer = null;
      var selectedIndex = -1;

      var closeResults = function () {
        resultsPanel.classList.remove("is-open");
        selectedIndex = -1;
      };

      var renderResults = function (results, query) {
        resultsPanel.innerHTML = "";
        if (!query || query.length === 0) {
          closeResults();
          return;
        }

        if (results.length === 0) {
          resultsPanel.innerHTML = '<div class="sr-empty">' + "No results found" + "</div>";
          resultsPanel.classList.add("is-open");
          selectedIndex = -1;
          return;
        }

        var html = "";
        for (var i = 0; i < results.length; i++) {
          var r = results[i];
          // Type badge (产品 / 案例 / 解决方案 / 页面)
          var typeLabel = r.category || "";
          var typeClass = "sr-type-" + (r.type || "page");
          var badge = typeLabel
            ? '<span class="sr-type-badge ' + typeClass + '">' + escapeHtml(typeLabel) + "</span>"
            : "";
          html +=
            '<a class="sr-item" href="' +
            escapeHtml(r.path) +
            '" data-index="' +
            i +
            '">' +
            '<div class="sr-item-header">' +
            badge +
            '<div class="sr-title">' +
            escapeHtml(r.title || "Untitled") +
            "</div>" +
            "</div>" +
            '<div class="sr-snippet">' +
            escapeHtml(r.snippet || "") +
            "</div>" +
            "</a>";
        }
        resultsPanel.innerHTML = html;
        resultsPanel.classList.add("is-open");
        selectedIndex = -1;

        // Add click handlers
        var items = resultsPanel.querySelectorAll(".sr-item");
        for (var j = 0; j < items.length; j++) {
          (function (item) {
            item.addEventListener("mousedown", function (e) {
              e.preventDefault();
            });
            item.addEventListener("click", function () {
              var href = item.getAttribute("href");
              if (href) {
                if (window.SpaRouter && typeof window.SpaRouter.navigate === "function") {
                  window.SpaRouter.navigate(href);
                } else {
                  window.location.href = href;
                }
                closeResults();
              }
            });
          })(items[j]);
        }
      };

      var doSearch = function (query) {
        if (typeof window.ProductSearchEngine !== "undefined" && window.ProductSearchEngine) {
          var results = window.ProductSearchEngine.search(query);
          renderResults(results, query);
        } else {
          resultsPanel.classList.remove("is-open");
        }
      };

      searchInput.addEventListener("input", function () {
        updateClearVisibility();
        var val = searchInput.value.trim();
        if (val.length === 0) {
          closeResults();
          return;
        }
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          doSearch(val);
        }, 200);
      });

      // Keyboard navigation for results
      searchInput.addEventListener("keydown", function (e) {
        if (!resultsPanel.classList.contains("is-open")) return;
        var items = resultsPanel.querySelectorAll(".sr-item");
        if (items.length === 0) return;

        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (selectedIndex >= 0) items[selectedIndex].classList.remove("is-highlighted");
          selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
          items[selectedIndex].classList.add("is-highlighted");
          items[selectedIndex].scrollIntoView({ block: "nearest" });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (selectedIndex >= 0) items[selectedIndex].classList.remove("is-highlighted");
          selectedIndex = Math.max(selectedIndex - 1, 0);
          items[selectedIndex].classList.add("is-highlighted");
          items[selectedIndex].scrollIntoView({ block: "nearest" });
        } else if (e.key === "Enter" && selectedIndex >= 0) {
          e.preventDefault();
          items[selectedIndex].click();
        }
      });

      // Close on outside click
      document.addEventListener("mousedown", function (e) {
        if (!bar.contains(e.target)) {
          closeResults();
        }
      });

      // Close on scroll (debounced, only if panel is open)
      var scrollTimer = null;
      document.addEventListener(
        "scroll",
        function () {
          if (!resultsPanel.classList.contains("is-open")) return;
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(closeResults, 100);
        },
        { passive: true }
      );
    });

    /* Preload search index for faster first search */
    if (
      typeof window.ProductSearchEngine !== "undefined" &&
      window.ProductSearchEngine &&
      typeof window.ProductSearchEngine.preload === "function"
    ) {
      window.ProductSearchEngine.preload();
    }
  }

  /* ================================================================
   *  Dropdown 鼠标互斥 & 点击事件绑定
   * ================================================================ */

  /* ================================================================
   *  翻译 & SlideMenu 初始化
   * ================================================================ */

  /**
   * 重新绑定翻译管理器的事件监听并应用当前语言翻译
   */
  /**
   * 重新绑定翻译管理器的事件监听并应用当前语言翻译。
   *
   * 处理时序问题：翻译引擎的 loadUITranslations() 是异步的（fetch），
   * 而 mountNavigator 可能在 fetch 完成前被调用。
   * 策略：如果翻译缓存还没就绪，延迟 500ms 后重试。
   */
  function reinitTranslationManager() {
    if (!window.translationManager) return;

    var tm = window.translationManager;
    if (typeof tm.resetEventListeners === "function") {
      tm.resetEventListeners();
    }
    if (typeof tm.setupEventListeners === "function") {
      tm.setupEventListeners();
    }

    // 尝试应用翻译，如果缓存未就绪则延迟重试
    if (typeof tm.applyTranslations === "function") {
      var lang = tm.currentLanguage;
      var cacheKey = "ui-" + lang;
      var cacheReady = tm.translationsCache && tm.translationsCache.has(cacheKey);
      if (cacheReady) {
        tm.applyTranslations();
      } else {
        // Cache not ready — wait for translationManager.ready instead of polling
        if (tm.ready) {
          tm.ready.then(function () {
            tm.applyTranslations();
          });
        }
      }
    }
  }

  /**
   * 初始化 SlideMenu（侧滑菜单）
   */
  function initSlideMenu() {
    if (!window.SlideMenu) return;

    if (typeof window.SlideMenu.initToggle === "function") {
      window.SlideMenu.initToggle();
    }
    if (typeof window.SlideMenu.initSmartHeader === "function") {
      window.SlideMenu.initSmartHeader();
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
      if (window.SlideMenu && typeof window.SlideMenu.openMobileSearch === "function") {
        window.SlideMenu.openMobileSearch();
      }
    });
  }

  /* ── Language switcher panel management (lightweight, no full CustomSelectInstance render) ── */
  var _langPanel = null;
  var _langOverlay = null;
  var _langAnchor = null;

  function initLangSwitcher() {
    var btn = document.getElementById("lang-toggle-btn");
    if (!btn) {
      console.warn("[navigator] #lang-toggle-btn not found in document");
      return;
    }

    // Remove old listeners by replacing node
    var clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);

    clone.addEventListener("click", function (e) {
      e.stopPropagation();
      _closeLangPanel();

      var selectEl = document.getElementById("lang-selector");
      if (!selectEl) {
        console.warn("[navigator] #lang-selector not found");
        return;
      }

      // Ensure lang-registry.js + custom-select.js are loaded, then open
      Promise.all([ensureLangRegistry(), ensureCustomSelect()])
        .then(function () {
          // Populate <select> with optgroups from LANG_REGISTRY (idempotent)
          _populateLangSelect(selectEl);
          _openLangPanel(selectEl, clone);
        })
        .catch(function (err) {
          console.warn("[Navigator] Failed to load lang dependencies:", err);
        });
    });
  }

  function _closeLangPanel() {
    if (_langPanel) {
      _langPanel.parentNode && _langPanel.parentNode.removeChild(_langPanel);
      _langPanel = null;
    }
    if (_langOverlay) {
      _langOverlay.parentNode && _langOverlay.parentNode.removeChild(_langOverlay);
      _langOverlay = null;
    }
    document.removeEventListener("scroll", _onLangScroll, true);
    document.removeEventListener("resize", _onLangScroll);
    document.removeEventListener("keydown", _onLangKeydown);
    // Remove outside-click listener
    if (_langOutsideClickHandler) {
      document.removeEventListener("click", _langOutsideClickHandler, true);
      _langOutsideClickHandler = null;
    }
  }

  var _langOutsideClickHandler = null;
  function _onLangKeydown(e) {
    if (e.key === "Escape") _closeLangPanel();
  }

  /**
   * Handle language change from hidden <select>.
   * Called when custom-select's _selectItem fires change event on the <select>.
   * Updates localStorage, button label, and closes the panel.
   */
  function _onLangChange() {
    var selectEl = document.getElementById("lang-selector");
    if (!selectEl) return;
    var langCode = selectEl.value;
    if (!langCode) return;

    // Update localStorage
    localStorage.setItem("userLanguage", langCode);

    // Update button label
    var labelEl = document.getElementById("current-lang-label");
    if (labelEl && window.LANG_REGISTRY) {
      var found = window.LANG_REGISTRY.LANGUAGES.find(function (l) {
        return l.code === langCode;
      });
      labelEl.textContent = found ? found.nativeName : langCode;
    }

    // Close panel
    _closeLangPanel();

    // Trigger full page language change via translationManager
    if (window.translationManager && typeof window.translationManager.setLanguage === "function") {
      window.translationManager.setLanguage(langCode);
    }
  }

  function _onLangScroll() {
    if (!_langPanel || !_langAnchor) return;
    _positionLangPanel(_langAnchor.getBoundingClientRect());
  }

  function _positionLangPanel(rect) {
    if (!_langPanel) return;
    var spaceBelow = window.innerHeight - rect.bottom;
    var spaceAbove = rect.top;
    var openAbove = spaceBelow < 280 && spaceAbove > spaceBelow;
    var gap = 6;
    var panelWidth = Math.min(280, Math.max(rect.width, 220));
    var left = rect.right - panelWidth;
    if (left < 8) left = Math.min(rect.left, 8);
    if (left + panelWidth > window.innerWidth - 8) left = window.innerWidth - 8 - panelWidth;
    _langPanel.style.left = left + "px";
    _langPanel.style.width = panelWidth + "px";
    if (openAbove) {
      _langPanel.classList.remove("cs-panel-below");
      _langPanel.classList.add("cs-panel-above");
      _langPanel.style.top = "";
      _langPanel.style.bottom = window.innerHeight - rect.top + gap + "px";
    } else {
      _langPanel.classList.remove("cs-panel-above");
      _langPanel.classList.add("cs-panel-below");
      _langPanel.style.bottom = "";
      _langPanel.style.top = rect.bottom + gap + "px";
    }
  }

  function _openLangPanel(selectEl, anchorBtn) {
    _closeLangPanel();
    _langAnchor = anchorBtn;

    if (window.innerWidth <= 720) {
      _openLangMobile(selectEl, anchorBtn);
      return;
    }

    // ── PC/Tablet: floating panel ──
    // Use lightweight panel factory — no full render, no trigger/wrap
    var result = CustomSelect.buildPanel(selectEl);
    _langPanel = result.panel;
    document.body.appendChild(_langPanel);

    // Intercept item clicks to handle close ourselves (before custom-select's _selectItem.close)
    _langPanel.addEventListener(
      "click",
      function (e) {
        var item = e.target.closest(".cs-item");
        if (!item || item.classList.contains("cs-item-disabled")) return;
        e.stopImmediatePropagation(); // prevent custom-select's handler
        selectEl.value = item.getAttribute("data-value");
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        // _onLangChange will handle the rest
      },
      true
    );

    // Listen for change on the hidden <select> (fired by item click handlers)
    // to close the panel and update the button label
    if (!selectEl._langChangeBound) {
      selectEl._langChangeBound = true;
      selectEl.addEventListener("change", _onLangChange);
    }

    _positionLangPanel(anchorBtn.getBoundingClientRect());
    requestAnimationFrame(function () {
      _langPanel.classList.add("cs-is-open");
    });

    document.addEventListener("scroll", _onLangScroll, true);
    document.addEventListener("resize", _onLangScroll);
    document.addEventListener("keydown", _onLangKeydown);

    _langOutsideClickHandler = function (e) {
      if (!_langPanel) return;
      if (_langPanel.contains(e.target) || anchorBtn.contains(e.target)) return;
      _closeLangPanel();
    };
    document.addEventListener("click", _langOutsideClickHandler, true);
  }

  function _openLangMobile(selectEl, anchorBtn) {
    _langOverlay = document.createElement("div");
    _langOverlay.className = "cs-popup-overlay";
    _langPanel = document.createElement("div");
    _langPanel.className = "cs-popup-panel";

    // Listen for change on hidden <select> (fired by item click handlers)
    if (!selectEl._langChangeBound) {
      selectEl._langChangeBound = true;
      selectEl.addEventListener("change", _onLangChange);
    }

    var result = CustomSelect.buildPanel(selectEl);
    var data = result.data;

    var html = '<div class="cs-popup-handle"></div>';
    var labelEl = anchorBtn.querySelector("#current-lang-label");
    html += '<div class="cs-popup-title">' + escapeHtml(labelEl ? labelEl.textContent : "") + "</div>";
    html +=
      '<div class="cs-popup-search-wrap">' +
      '<span class="material-symbols-outlined cs-popup-search-icon">search</span>' +
      '<input type="text" class="cs-popup-search" placeholder="搜索...">' +
      "</div>";
    html += '<div class="cs-popup-list">' + result.inst._buildItemsHTML(data) + "</div>";
    _langPanel.innerHTML = html;

    document.body.appendChild(_langOverlay);
    document.body.appendChild(_langPanel);

    _langOverlay.addEventListener("click", function () {
      _closeLangPanel();
    });

    var items = _langPanel.querySelectorAll(".cs-item");
    for (var i = 0; i < items.length; i++) {
      (function (item) {
        item.addEventListener("click", function () {
          selectEl.value = item.getAttribute("data-value");
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));
          // _onLangChange will handle the rest (label update, close, setLanguage)
        });
      })(items[i]);
    }

    var searchInput = _langPanel.querySelector(".cs-popup-search");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        var q = this.value.trim().toLowerCase();
        var panelItems = _langPanel.querySelectorAll(".cs-item");
        var groupLabels = _langPanel.querySelectorAll(".cs-group-label");
        var hasVisible = false;
        for (var j = 0; j < panelItems.length; j++) {
          var text = (panelItems[j].getAttribute("data-text") || "").toLowerCase();
          var show = !q || text.indexOf(q) !== -1;
          panelItems[j].style.display = show ? "" : "none";
          if (show) hasVisible = true;
        }
        for (var g = 0; g < groupLabels.length; g++) {
          var next = groupLabels[g].nextElementSibling;
          var anyVisible = false;
          while (next && !next.classList.contains("cs-group-label")) {
            if (next.classList.contains("cs-item") && next.style.display !== "none") {
              anyVisible = true;
              break;
            }
            next = next.nextElementSibling;
          }
          groupLabels[g].style.display = anyVisible ? "" : "none";
        }
        var noRes = _langPanel.querySelector(".cs-no-results");
        if (!hasVisible && q) {
          if (!noRes) {
            noRes = document.createElement("div");
            noRes.className = "cs-no-results";
            noRes.textContent =
              typeof window.t === "function" ? window.uiText("no_matching_results", "无匹配结果") : "无匹配结果";
            _langPanel.querySelector(".cs-popup-list").appendChild(noRes);
          }
          noRes.style.display = "";
        } else if (noRes) {
          noRes.style.display = "none";
        }
      });
    }

    requestAnimationFrame(function () {
      _langPanel.classList.add("cs-popup-open");
    });
    document.addEventListener("keydown", _onLangKeydown);
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
      variant: variant,
      active: placeholder.getAttribute("data-active") || "",
      showSearch: parseBooleanAttr(placeholder.getAttribute("data-search"), false),
      searchI18n: placeholder.getAttribute("data-search-i18n") || "search_placeholder",
      searchBp: placeholder.getAttribute("data-search-bp") || "xl",
      showLang: parseBooleanAttr(placeholder.getAttribute("data-lang"), true),
      showCta: parseBooleanAttr(placeholder.getAttribute("data-cta"), true),
      ctaTextKey: placeholder.getAttribute("data-cta-text-key") || "nav_get_quote",
      ctaHref: placeholder.getAttribute("data-cta-href") || "/quote/",
    };
  }

  /* ================================================================
   *  mount() — 核心挂载函数
   * ================================================================ */

  /**
   * 查找所有 [data-component="navigator"] 占位符并替换为实际的 header。
   * 同时注入样式、绑定交互事件。
   */
  /**
   * Register all document-level event listeners.
   * Called exactly ONCE — at the end of this IIFE.
   * These listeners survive SPA navigations (document is not destroyed).
   */
  function registerListeners() {
    /* Inject CSS (one-time — these functions check by ID internally) */
    if (typeof window.DropdownBaseStyles !== "undefined" && window.DropdownBaseStyles.inject) {
      window.DropdownBaseStyles.inject();
    }

    initSearchInteraction();

    /* Unified click handler: close dropdowns on link-click or outside-click */
    document.addEventListener(
      "click",
      function (e) {
        var clickedWrap = e.target.closest(DROPDOWN_WRAP_SELECTORS.join(", "));
        // Find trigger inside clicked element
        var trigger = e.target.closest(DROPDOWN_TRIGGER_SELECTORS.join(", "));
        if (trigger && window.innerWidth > 720) {
          var wrap = trigger.closest(DROPDOWN_WRAP_SELECTORS.join(", "));
          if (wrap) {
            var tag = e.target.tagName.toLowerCase();
            var href = e.target.getAttribute ? e.target.getAttribute("href") : null;
            var isLink = tag === "a" && href && href !== "javascript:void(0)" && href !== "#";
            if (isLink) {
              // Clicking a navigable link: close all dropdowns
              closeOtherDropdowns(null);
              return;
            }
            // Clicking trigger button/span: toggle (touch fallback)
            closeOtherDropdowns(wrap);
            wrap.classList.toggle("is-open");
            return;
          }
        }
        // Outside click: close any open dropdowns
        closeOtherDropdowns(clickedWrap || null);
      },
      true
    );

    /* Dropdown hover via event delegation — manages is-open via JS */
    document.addEventListener(
      "mouseover",
      function (e) {
        var wrap = e.target.closest(DROPDOWN_WRAP_SELECTORS.join(", "));
        if (wrap && !wrap.classList.contains("touch-device")) {
          if (!wrap.classList.contains("is-open")) {
            wrap.classList.add("is-open");
          }
          closeOtherDropdowns(wrap);
        }
      },
      true
    );

    document.addEventListener(
      "mouseout",
      function (e) {
        var wrap = e.target.closest(DROPDOWN_WRAP_SELECTORS.join(", "));
        // mouseout fires when leaving the wrap or entering a child.
        // Only remove is-open if the relatedTarget is NOT inside the same wrap.
        if (wrap && !wrap.classList.contains("touch-device")) {
          var related = e.relatedTarget;
          if (!related || !wrap.contains(related)) {
            wrap.classList.remove("is-open");
          }
        }
      },
      true
    );

    /* Dropdown click handlers are initialized in mountNavigator() after
     * trigger elements exist in the DOM. Each dropdown module has its own
     * _dropdownClickBound guard to prevent duplicate listeners. */

    initTabletSearchToggle();
  }

  /**
   * mountNavigator — Build the header DOM from placeholder config.
   *
   * This function only deals with DOM: injecting styles and replacing
   * <navigator> placeholders with actual <header> elements.
   * It does NOT register any document-level event listeners.
   *
   * Can be called multiple times safely (idempotent by nature).
   */
  function mountNavigator() {
    /* 如果 translationManager 尚未初始化，等待 ready Promise 而非轮询。 */
    if (window.translationManager && !window.translationManager.isInitialized && window.translationManager.ready) {
      window.translationManager.ready.then(function () {
        mountNavigator();
      });
      return;
    }
    /* Close all open dropdowns before remounting */
    closeOtherDropdowns(null);
    var placeholders = document.querySelectorAll('[data-component="navigator"]');

    for (var i = 0; i < placeholders.length; i++) {
      var placeholder = placeholders[i];

      if (!placeholder.parentNode) continue;

      /* 如果 placeholder 内已有 <header>，直接提取替换 */
      var existingHeader = placeholder.querySelector("header");
      if (existingHeader && existingHeader.querySelector("nav")) {
        placeholder.parentNode.replaceChild(existingHeader, placeholder);
        continue;
      } else if (existingHeader) {
        // Header element exists but has no nav — skip this placeholder
      }

      /* 否则根据配置构建新 header */
      var config = extractConfigFromPlaceholder(placeholder);
      currentVariant = config.variant;

      var wrapper = document.createElement("div");
      wrapper.innerHTML = buildHeaderHtml(config);

      var headerEl = wrapper.firstElementChild;

      var navHeight = config.variant === "pc" ? "109px" : "65px";
      document.documentElement.style.setProperty("--nav-height", navHeight);

      // Replace placeholder with header directly.
      // Main content spacing is handled by CSS: main#spa-content { padding-top: var(--nav-height) }
      // No spacer div needed — prevents double-spacing bug on non-home pages.
      placeholder.parentNode.replaceChild(headerEl, placeholder);
    }

    /* 3. 每次构建后需要重新执行的 DOM 相关初始化 */
    reinitTranslationManager();
    initSlideMenu();
    initLangSwitcher();

    /* Re-bind dropdown click handlers after mount — trigger elements
     * may not have existed when registerListeners() first called initDropdownClick() */
    if (window.ProductsDropdown) window.ProductsDropdown.initDropdownClick();
    if (window.ApplicationsDropdown) window.ApplicationsDropdown.initDropdownClick();
    if (window.SupportDropdown) window.SupportDropdown.initDropdownClick();
    if (window.AboutDropdown) window.AboutDropdown.initDropdownClick();

    /* Re-initialize search interaction after mount (DOM now has .ios-search-bar) */
    initSearchInteraction();
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

    _getActiveMap();
    var navItems = _getNavItems();

    /* 确保 dropdown 样式已注入（SPA 动态加载场景） */

    /* ---------- 1. 更新 dropdown trigger 元素的高亮 ---------- */
    var triggerSelectors = [
      "header nav a.prod-dropdown-link",
      "header nav a.app-dropdown-link",
      "header nav a.sup-dropdown-link",
      "header nav a.abt-dropdown-link",
      "header nav a[data-sup-trigger-label]",
      "header nav a[data-prod-trigger-label]",
      "header nav a[data-app-trigger-label]",
      "header nav a[data-abt-trigger-label]",
    ];

    var triggers = document.querySelectorAll(triggerSelectors.join(", "));

    /* 应用路径映射（提前计算，确保 plain-link 段能正确取到值） */
    var mappedId = activeSectionId;
    if (PATH_TO_ACTIVE_MAP[activeSectionId]) {
      mappedId = PATH_TO_ACTIVE_MAP[activeSectionId];
    }

    for (var i = 0; i < triggers.length; i++) {
      var triggerEl = triggers[i];

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
    var plainLinks = document.querySelectorAll("header nav a > span[data-i18n]");
    for (var pi = 0; pi < plainLinks.length; pi++) {
      var plainSpan = plainLinks[pi];
      var plainEl = plainSpan.parentElement;
      /* Skip dropdown triggers (already handled above) */
      if (
        plainEl.classList.contains("prod-dropdown-trigger") ||
        plainEl.classList.contains("app-dropdown-trigger") ||
        plainEl.classList.contains("sup-dropdown-trigger") ||
        plainEl.classList.contains("abt-dropdown-trigger") ||
        plainEl.classList.contains("prod-dropdown-link") ||
        plainEl.classList.contains("app-dropdown-link") ||
        plainEl.classList.contains("sup-dropdown-link") ||
        plainEl.classList.contains("abt-dropdown-link")
      ) {
        continue;
      }
      var plainKey = plainSpan.getAttribute("data-i18n") || "";
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
        if (newVariant === "mobile" && window.SlideMenu) {
          if (typeof window.SlideMenu.initToggle === "function") {
            window.SlideMenu.initToggle();
          }
        }
      }
    }, 300);
  });

  /* ================================================================
   *  初始化入口
   * ================================================================ */

  /* Register document-level listeners exactly ONCE */
  registerListeners();

  /* 首次加载：DOM ready 后构建 header DOM */
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

  window.Navigator = {
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
    highlightCategory: highlightCategory,
  };

  /* ================================================================
   *  移动端底部栏 & SPA 事件
   * ================================================================ */

  /**
   * SPA 路由导航事件——重新初始化导航和底部栏
   */
  _spaOn(document, "spa:load", function () {
    /* 关闭所有打开的 dropdown */
    closeOtherDropdowns(null);

    /* 防止 hover 残留：spa:load 后浏览器可能没有触发 mouseover，
     * 如果鼠标仍在 dropdown 区域，手动触发 mouseover 检查 */
    requestAnimationFrame(function () {
      var wraps = document.querySelectorAll(DROPDOWN_WRAP_SELECTORS.join(", "));
      for (var wi = 0; wi < wraps.length; wi++) {
        if (wraps[wi].matches(":hover") && !wraps[wi].classList.contains("touch-device")) {
          wraps[wi].classList.add("is-open");
        }
      }
    });

    /* 重新绑定 dropdown click handlers（mountNavigator 可能未调用） */
    if (window.ProductsDropdown) window.ProductsDropdown.initDropdownClick();
    if (window.ApplicationsDropdown) window.ApplicationsDropdown.initDropdownClick();
    if (window.SupportDropdown) window.SupportDropdown.initDropdownClick();
    if (window.AboutDropdown) window.AboutDropdown.initDropdownClick();

    /* 重新初始化 custom-select（navigator 可能创建了新的 lang-selector） */
    if (typeof CustomSelect !== "undefined" && CustomSelect.initAll) {
      CustomSelect.initAll();
    }
    // Re-init lang switcher bridge (uses Promise-based ensureCustomSelect internally)
    initLangSwitcher();

    /* 确保 mobile header 可见 */
    var mobileHeader = document.getElementById("mobile-header");
    if (mobileHeader) mobileHeader.classList.remove("header-hidden");

    /* 延迟重新初始化依赖模块 */
    setTimeout(function () {
      if (window.SlideMenu) {
        if (window.SlideMenu.initToggle) window.SlideMenu.initToggle();
        if (window.SlideMenu.initSmartHeader) window.SlideMenu.initSmartHeader();
      }
    }, 0);

    /* ── SPA 导航后重新应用当前 URL 的导航高亮 ── */
    (function () {
      var _navPath = window.location.pathname.replace(/\/$/, "") || "/";
      var _navSection = _navPath === "/" ? "/" : (_navPath.match(/^\/([^/]+)/) || [])[1] || _navPath;
      if (_navSection) {
        updateActive(_navSection);
      }
    })();
  });

  /* ────────────────────────────────────────────────────────────────
   *  languageChanged — re-apply translations to navigator DOM
   * ──────────────────────────────────────────────────────────────── */
  _spaOn(
    document,
    "languageChanged",
    function () {
      // Re-apply translations to update navigator text after language switch
      if (window.translationManager && typeof window.translationManager.applyTranslations === "function") {
        window.translationManager.applyTranslations();
      }
      var noResEls = document.querySelectorAll(".cs-no-results");
      noResEls.forEach(function (el) {
        el.textContent =
          typeof window.t === "function" ? window.uiText("no_matching_results", "无匹配结果") : "无匹配结果";
      });
    },
    "langChanged:navNoResults"
  );

  // Refresh language dropdown group labels once translations are loaded
  // (fixes __I18N_PENDING__ shown during initial load before translations.js is ready)
  _spaOn(
    document,
    "translationsApplied",
    function () {
      var sel = document.querySelector("#lang-switcher-select");
      if (sel) _populateLangSelect(sel);
    },
    "translationsApplied:refreshLangSelect"
  );
})(window);
