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
 *   - openMobileSearch()  打开移动端搜索覆盖层
 *   - closeMobileSearch() 关闭移动端搜索覆盖层
 *
 * @module SlideMenu
 */
/* global SlideMenu */
(function (global) {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
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
  function injectStyles() {
    if (document.getElementById("mobile-menu-styles")) return;

    var style = document.createElement("style");
    style.id = "mobile-menu-styles";
    style.textContent = [
      /* ---------- 遮罩层 ---------- */
      ".mobile-menu-overlay {",
      "  position: fixed; inset: 0;",
      "  background: rgba(0,0,0,.4);",
      "  z-index: var(--z-header, 2000);",
      "  opacity: 0; visibility: hidden;",
      "  transition: opacity .3s ease, visibility 0s .3s;",
      "}",
      ".mobile-menu-overlay.is-open {",
      "  opacity: 1; visibility: visible;",
      "  transition: opacity .3s ease, visibility 0s 0s;",
      "}",

      /* ---------- 侧滑面板 ---------- */
      ".mobile-menu-panel {",
      "  position: fixed; top: 0; left: 0; bottom: 0;",
      "  width: 85%; max-width: 360px; min-width: 280px;",
      "  background: rgba(246,246,248,.98);",
      "  backdrop-filter: blur(40px) saturate(200%);",
      "  -webkit-backdrop-filter: blur(40px) saturate(200%);",
      "  z-index: calc(var(--z-header, 2000) + 10);",
      "  transform: translateX(-100%);",
      "  transition: transform .35s cubic-bezier(.32,.72,0,1);",
      "  overflow-y: auto; -webkit-overflow-scrolling: touch;",
      "  box-shadow: 4px 0 24px rgba(0,0,0,.08);",
      "}",
      ".mobile-menu-panel.is-open { transform: translateX(0); }",
      "html.dark .mobile-menu-panel {",
      "  background: rgba(44,44,46,.98);",
      "  box-shadow: 4px 0 24px rgba(0,0,0,.3);",
      "}",

      /* ---------- 面板头部（Logo + 关闭按钮） ---------- */
      ".mobile-menu-header {",
      "  display: flex; align-items: center; justify-content: space-between;",
      "  padding: 16px 20px;",
      "  border-bottom: .5px solid rgba(60,60,67,.12);",
      "}",
      "html.dark .mobile-menu-header { border-color: rgba(235,235,245,.15); }",
      ".mobile-menu-logo img { width: 32px; height: 32px; object-fit: contain; }",
      ".mobile-menu-close {",
      "  display: flex; align-items: center; justify-content: center;",
      "  width: 36px; height: 36px; border-radius: 50%; border: none;",
      "  background: rgba(60,60,67,.08); cursor: pointer;",
      "  -webkit-tap-highlight-color: transparent;",
      "}",
      "html.dark .mobile-menu-close { background: rgba(235,235,245,.12); }",
      ".mobile-menu-close .material-symbols-outlined {",
      "  font-size: 20px; color: rgba(60,60,67,.8);",
      "}",
      "html.dark .mobile-menu-close .material-symbols-outlined {",
      "  color: rgba(235,235,245,.8);",
      "}",

      /* ---------- 一级菜单项 ---------- */
      ".mobile-menu-l1 {",
      "  display: flex; align-items: center; gap: 12px;",
      "  padding: 14px 20px;",
      "  font-size: 17px; font-weight: 600;",
      "  color: #1d1d1f; text-decoration: none;",
      "  -webkit-tap-highlight-color: transparent;",
      "  border-bottom: .5px solid rgba(60,60,67,.08);",
      "}",
      "html.dark .mobile-menu-l1 { color: #f5f5f7; }",
      "html.dark .mobile-menu-l1 { border-color: rgba(235,235,245,.08); }",
      ".mobile-menu-l1:active { background: rgba(236,91,19,.06); }",
      "html.dark .mobile-menu-l1:active { background: rgba(236,91,19,.10); }",
      ".mobile-menu-l1-icon {",
      "  width: 28px; height: 28px; border-radius: 7px;",
      "  background: rgba(236,91,19,.10);",
      "  display: flex; align-items: center; justify-content: center; flex-shrink: 0;",
      "}",
      "html.dark .mobile-menu-l1-icon { background: rgba(236,91,19,.18); }",
      ".mobile-menu-l1-icon .material-symbols-outlined {",
      "  font-size: 18px; color: #ec5b13;",
      "}",
      ".mobile-menu-l1-label { flex: 1; min-width: 0; }",
      ".mobile-menu-l1-arrow {",
      "  font-size: 20px; color: rgba(60,60,67,.3); flex-shrink: 0;",
      "  transition: transform .3s cubic-bezier(.32,.72,0,1);",
      "}",
      "html.dark .mobile-menu-l1-arrow { color: rgba(235,235,245,.25); }",
      ".mobile-menu-l1.is-expanded .mobile-menu-l1-arrow {",
      "  transform: rotate(90deg);",
      "}",

      /* ---------- 二级菜单（子菜单展开区域） ---------- */
      ".mobile-menu-l2 {",
      "  max-height: 0; overflow: hidden;",
      "  transition: max-height .35s cubic-bezier(.32,.72,0,1);",
      "  background: rgba(0,0,0,.02);",
      "}",
      "html.dark .mobile-menu-l2 { background: rgba(0,0,0,.15); }",
      ".mobile-menu-l2.is-open { max-height: 600px; }",

      /* 二级菜单分隔线 & 表情标签 */
      ".mobile-menu-l2-separator {",
      "  height: .5px; background: rgba(60,60,67,.12);",
      "  margin: 8px 20px 8px 60px;",
      "}",
      "html.dark .mobile-menu-l2-separator {",
      "  background: rgba(235,235,245,.15);",
      "}",
      ".mobile-menu-l2-emoji {",
      "  margin-left: auto; font-size: 14px;",
      "  line-height: 1; opacity: .85; flex-shrink: 0;",
      "}",

      /* ---------- 二级菜单项 ---------- */
      ".mobile-menu-l2-item {",
      "  display: flex; align-items: center; gap: 12px;",
      "  padding: 12px 20px 12px 60px;",
      "  font-size: 15px; font-weight: 400;",
      "  color: #1d1d1f; text-decoration: none;",
      "  -webkit-tap-highlight-color: transparent;",
      "}",
      "html.dark .mobile-menu-l2-item { color: #f5f5f7; }",
      ".mobile-menu-l2-item:active { background: rgba(236,91,19,.06); }",
      "html.dark .mobile-menu-l2-item:active { background: rgba(236,91,19,.10); }",
      ".mobile-menu-l2-viewall .mobile-menu-l2-icon {",
      "  color: var(--color-primary, #ec5b13);",
      "}",
      ".mobile-menu-l2-viewall:active .mobile-menu-l2-label {",
      "  color: var(--color-primary, #ec5b13);",
      "}",

      /* 二级菜单项图标 */
      ".mobile-menu-l2-icon {",
      "  width: 24px; height: 24px; border-radius: 6px;",
      "  background: rgba(236,91,19,.08);",
      "  display: flex; align-items: center; justify-content: center; flex-shrink: 0;",
      "}",
      "html.dark .mobile-menu-l2-icon { background: rgba(236,91,19,.14); }",
      ".mobile-menu-l2-icon .material-symbols-outlined {",
      "  font-size: 14px; color: #ec5b13;",
      "}",

      /* 二级菜单项标签 */
      ".mobile-menu-l2-label {",
      "  flex: 1; min-width: 0; text-decoration: underline;",
      "  text-underline-offset: 4px;",
      "  text-decoration-color: rgba(60,60,67,.15);",
      "  text-decoration-thickness: 1px;",
      "  transition: text-decoration-color .2s, text-decoration-thickness .2s;",
      "}",
      ".mobile-menu-l2-item:active .mobile-menu-l2-label {",
      "  text-decoration-color: rgba(60,60,67,.35);",
      "}",
      ".mobile-menu-l2-item.is-active .mobile-menu-l2-label {",
      "  text-decoration: underline; text-decoration-style: solid;",
      "  text-decoration-color: var(--color-primary, #ec5b13);",
      "  text-decoration-thickness: 2px;",
      "}",

      /* 徽章（如 HOT） */
      ".mobile-menu-badge {",
      "  display: inline-flex; align-items: center; padding: 2px 7px;",
      "  font-size: 10px; font-weight: 700; letter-spacing: .04em;",
      "  text-transform: uppercase;",
      "  background: #ec5b13; color: #fff; border-radius: 20px;",
      "  flex-shrink: 0; line-height: 1.4;",
      "}",

      /* WhatsApp 特殊样式 */
      ".mobile-menu-l2-item.is-whatsapp .mobile-menu-l2-icon {",
      "  background: rgba(37,211,102,.12);",
      "}",
      "html.dark .mobile-menu-l2-item.is-whatsapp .mobile-menu-l2-icon {",
      "  background: rgba(37,211,102,.20);",
      "}",
      ".mobile-menu-l2-item.is-whatsapp .mobile-menu-l2-icon .material-symbols-outlined {",
      "  color: #25d366;",
      "}",

      /* 当前激活项高亮 */
      ".mobile-menu-l2-item.is-active {",
      "  color: var(--color-primary, #ec5b13); font-weight: 600;",
      "}",
      ".mobile-menu-l2-item.is-active .mobile-menu-l2-icon {",
      "  background: rgba(236,91,19,.20);",
      "}",
      "html.dark .mobile-menu-l2-item.is-active { color: #ff8c5a; }",
      "html.dark .mobile-menu-l2-item.is-active .mobile-menu-l2-icon {",
      "  background: rgba(236,91,19,.25);",
      "}",

      /* ---------- 底部 CTA 栏 ---------- */
      ".mobile-menu-cta-bar {",
      "  position: fixed; bottom: 0; left: 0; right: 0;",
      "  padding: 12px 16px calc(12px + env(safe-area-inset-bottom)) 16px;",
      "  background: rgba(246,246,248,.98);",
      "  backdrop-filter: blur(40px) saturate(200%);",
      "  -webkit-backdrop-filter: blur(40px) saturate(200%);",
      "  border-top: .5px solid rgba(60,60,67,.12);",
      "  display: flex; gap: 12px; z-index: 920;",
      "}",
      "html.dark .mobile-menu-cta-bar {",
      "  background: rgba(44,44,46,.98);",
      "  border-color: rgba(235,235,245,.15);",
      "}",

      /* CTA 按钮 */
      ".mobile-menu-cta-btn {",
      "  flex: 1;",
      "  display: flex; align-items: center; justify-content: center; gap: 8px;",
      "  padding: 14px; border-radius: 12px; border: none;",
      "  font-size: 15px; font-weight: 600; cursor: pointer;",
      "  -webkit-tap-highlight-color: transparent;",
      "  text-decoration: none;",
      "  transition: all .15s ease;",
      "}",
      ".mobile-menu-cta-btn.primary {",
      "  background: #ec5b13; color: #fff;",
      "}",
      ".mobile-menu-cta-btn.primary:hover,",
      ".mobile-menu-cta-btn.primary:active {",
      "  background: #d54f0f;",
      "}",
      ".mobile-menu-cta-btn.secondary {",
      "  background: rgba(236,91,19,.10); color: #ec5b13;",
      "}",
      "html.dark .mobile-menu-cta-btn.secondary {",
      "  background: rgba(236,91,19,.18); color: #ff8c5a;",
      "}",
      ".mobile-menu-cta-btn.secondary:hover,",
      ".mobile-menu-cta-btn.secondary:active {",
      "  background: rgba(236,91,19,.20); color: #d54f0f;",
      "}",
      "html.dark .mobile-menu-cta-btn.secondary:hover,",
      "html.dark .mobile-menu-cta-btn.secondary:active {",
      "  background: rgba(236,91,19,.25); color: #ff9f70;",
      "}",
      ".mobile-menu-cta-btn .material-symbols-outlined { font-size: 20px; }",

      /* 面板底部留白（为固定 CTA 栏腾出空间） */
      ".mobile-menu-panel { padding-bottom: 100px !important; }",

      /* ---------- 智能头部隐藏 ---------- */
      "#mobile-header.header-hidden { transform: translateY(-100%); }",

      /* ---------- 移动端搜索覆盖层 ---------- */
      ".mobile-search-overlay {",
      "  position: fixed; inset: 0;",
      "  background: rgba(246,246,248,.98);",
      "  backdrop-filter: blur(40px) saturate(200%);",
      "  -webkit-backdrop-filter: blur(40px) saturate(200%);",
      "  z-index: 950;",
      "  opacity: 0; visibility: hidden;",
      "  transition: opacity .2s ease, visibility 0s .2s;",
      "  overflow-y: auto; -webkit-overflow-scrolling: touch;",
      "}",
      ".mobile-search-overlay.is-open {",
      "  opacity: 1; visibility: visible;",
      "  transition: opacity .2s ease, visibility 0s 0s;",
      "}",
      "html.dark .mobile-search-overlay {",
      "  background: rgba(28,28,30,.98);",
      "}",

      /* 搜索栏 */
      ".mobile-search-bar {",
      "  display: flex; align-items: center; gap: 10px;",
      "  padding: 12px 16px; position: sticky; top: 0;",
      "  background: rgba(246,246,248,.95);",
      "  backdrop-filter: blur(20px);",
      "  -webkit-backdrop-filter: blur(20px);",
      "  border-bottom: .5px solid rgba(60,60,67,.10);",
      "}",
      "html.dark .mobile-search-bar {",
      "  background: rgba(28,28,30,.95);",
      "  border-color: rgba(235,235,245,.10);",
      "}",
      ".mobile-search-icon {",
      "  font-size: 22px; color: rgba(60,60,67,.5); flex-shrink: 0;",
      "}",
      "html.dark .mobile-search-icon { color: rgba(235,235,245,.5); }",
      ".mobile-search-input {",
      "  flex: 1; background: transparent; border: none; outline: none;",
      "  font-size: 17px; color: #1d1d1f; font-family: inherit;",
      "  line-height: 1.4; -webkit-appearance: none; min-width: 0;",
      "}",
      ".mobile-search-input::placeholder { color: rgba(60,60,67,.4); }",
      "html.dark .mobile-search-input { color: #f5f5f7; }",
      "html.dark .mobile-search-input::placeholder {",
      "  color: rgba(235,235,245,.35);",
      "}",
      ".mobile-search-input::-webkit-search-cancel-button { display: none; }",
      ".mobile-search-clear {",
      "  display: none; align-items: center; justify-content: center;",
      "  width: 28px; height: 28px; border-radius: 50%; border: none;",
      "  background: rgba(120,120,128,.2); cursor: pointer; flex-shrink: 0;",
      "}",
      ".mobile-search-clear.is-visible { display: flex; }",
      ".mobile-search-clear .material-symbols-outlined {",
      "  font-size: 18px; color: rgba(60,60,67,.6);",
      "}",
      "html.dark .mobile-search-clear { background: rgba(255,255,255,.15); }",
      "html.dark .mobile-search-clear .material-symbols-outlined {",
      "  color: rgba(235,235,245,.6);",
      "}",

      /* 搜索结果列表 */
      ".mobile-search-results { padding: 8px; }",
      ".mobile-search-result-item {",
      "  display: flex; align-items: center; gap: 12px;",
      "  padding: 12px 8px; border-radius: 12px;",
      "  text-decoration: none; color: inherit;",
      "  -webkit-tap-highlight-color: transparent;",
      "}",
      ".mobile-search-result-item:active { background: rgba(236,91,19,.06); }",
      "html.dark .mobile-search-result-item:active {",
      "  background: rgba(236,91,19,.10);",
      "}",
      ".mobile-search-result-img {",
      "  width: 48px; height: 48px; border-radius: 10px;",
      "  background: rgba(120,120,128,.08); flex-shrink: 0;",
      "  display: flex; align-items: center; justify-content: center;",
      "  overflow: hidden;",
      "}",
      ".mobile-search-result-img img {",
      "  width: 100%; height: 100%; object-fit: contain; padding: 4px;",
      "}",
      ".mobile-search-result-img .material-symbols-outlined {",
      "  font-size: 24px; color: rgba(60,60,67,.25);",
      "}",
      "html.dark .mobile-search-result-img {",
      "  background: rgba(255,255,255,.06);",
      "}",
      "html.dark .mobile-search-result-img .material-symbols-outlined {",
      "  color: rgba(235,235,245,.2);",
      "}",

      /* 搜索结果文本信息 */
      ".mobile-search-result-info { flex: 1; min-width: 0; }",
      ".mobile-search-result-name {",
      "  font-size: 15px; font-weight: 600; color: #1d1d1f; line-height: 1.3;",
      "}",
      "html.dark .mobile-search-result-name { color: #f5f5f7; }",
      ".mobile-search-result-meta {",
      "  display: flex; align-items: center; gap: 4px; margin-top: 2px;",
      "}",
      ".mobile-search-result-meta span {",
      "  font-size: 12px; color: rgba(60,60,67,.5);",
      "}",
      "html.dark .mobile-search-result-meta span {",
      "  color: rgba(235,235,245,.4);",
      "}",
      ".mobile-search-result-sep { color: rgba(60,60,67,.25) !important; }",
      "html.dark .mobile-search-result-sep { color: rgba(235,235,245,.15) !important; }",

      /* 搜索空结果 */
      ".mobile-search-empty {",
      "  text-align: center; padding: 40px 16px;",
      "}",
      ".mobile-search-empty .material-symbols-outlined {",
      "  font-size: 36px; color: rgba(60,60,67,.15); margin-bottom: 8px;",
      "}",
      ".mobile-search-empty p {",
      "  font-size: 14px; color: rgba(60,60,67,.5); margin: 0;",
      "}",
      "html.dark .mobile-search-empty .material-symbols-outlined {",
      "  color: rgba(235,235,245,.1);",
      "}",
      "html.dark .mobile-search-empty p { color: rgba(235,235,245,.4); }",
    ].join("\n");

    document.head.appendChild(style);
  }

  /* ================================================================
   *  菜单数据构建
   * ================================================================ */

  /** @type {Array|null} 缓存的菜单项，避免重复构建 */
  var cachedMenuItems = null;

  var L1_ICON_MAP = {
    products: "kitchen",
    applications: "apps",
    cases: "cases",
    "profit-calculator": "calculate",
    support: "support_agent",
    about: "info",
    contact: "mail",
  };

  function getL1Icon(navId) {
    return L1_ICON_MAP[navId] || "menu";
  }

  /**
   * 构建导航菜单项数组（使用内置默认菜单）
   * @returns {Array<{key, href, id, icon, children}>} 菜单项列表
   */
  function getMenuItems() {
    if (cachedMenuItems) return cachedMenuItems;

    var items = [
      {
        key: "nav_products",
        label: "产品中心",
        href: "/products/",
        id: "products",
        icon: "kitchen",
        children: [
          { key: "nav_products_cutting", icon: "content_cut", emoji: "", href: "/products/cutting/" },
          { key: "nav_products_stirfry", icon: "local_fire_department", emoji: "🔥", href: "/products/stirfry/" },
          { key: "nav_products_frying", icon: "outdoor_grill", emoji: "", href: "/products/frying/" },
          { key: "nav_products_stewing", icon: "soup_kitchen", emoji: "", href: "/products/stewing/" },
          { key: "nav_products_steaming", icon: "cloud", emoji: "", href: "/products/steaming/" },
          { key: "nav_products_other", icon: "more_horiz", emoji: "", href: "/products/other/" },
        ],
      },
      {
        key: "nav_applications",
        label: "行业场景",
        href: "/applications/",
        id: "applications",
        icon: "apps",
        children: [
          {
            key: "nav_applications_small_restaurant",
            icon: "storefront",
            emoji: "",
            href: "/applications/small-restaurant/",
          },
          {
            key: "nav_applications_central_kitchen",
            icon: "apartment",
            emoji: "",
            href: "/applications/central-kitchen/",
          },
          {
            key: "nav_applications_chain_restaurant",
            icon: "ramen_dining",
            emoji: "",
            href: "/applications/chain-restaurant/",
          },
          { key: "nav_applications_canteen", icon: "restaurant", emoji: "", href: "/applications/canteen/" },
          {
            key: "nav_applications_cloud_kitchen",
            icon: "delivery_dining",
            emoji: "",
            href: "/applications/cloud-kitchen/",
          },
          { key: "nav_applications_food_factory", icon: "factory", emoji: "", href: "/applications/food-factory/" },
          { key: "nav_applications_menu_lab", icon: "science", emoji: "", href: "/applications/menu-lab/" },
        ],
      },
      { key: "nav_cases", label: "真实案例", href: "/cases/", id: "cases", icon: "cases", children: [] },
      {
        key: "nav_profit_calculator",
        label: "投资回报",
        href: "/profit-calculator/",
        id: "profit-calculator",
        icon: "calculate",
        children: [],
      },
      {
        key: "nav_support",
        label: "服务支持",
        href: "/support/",
        id: "support",
        icon: "support_agent",
        children: [
          { key: "nav_support_services", icon: "grid_view", emoji: "", href: "/support/" },
          { key: "nav_support_installation", icon: "construction", emoji: "", href: "/support/installation/" },
          { key: "nav_support_warranty", icon: "verified", emoji: "", href: "/support/warranty/" },
          { key: "nav_support_spare_parts", icon: "build_circle", emoji: "", href: "/support/spare-parts/" },
          { key: "nav_support_training", icon: "school", emoji: "", href: "/support/training/" },
          { key: "nav_support_faq", icon: "contact_support", emoji: "", href: "/support/faq/" },
        ],
      },
      {
        key: "nav_about",
        label: "关于我们",
        href: "/about/",
        id: "about",
        icon: "info",
        children: [
          { key: "nav_about_profile", icon: "apartment", emoji: "", href: "/about/#profile" },
          { key: "nav_about_factory", icon: "factory", emoji: "", href: "/about/#factory" },
          { key: "nav_about_cert", icon: "verified", emoji: "", href: "/about/#cert" },
        ],
      },
      { key: "nav_contact", label: "联系我们", href: "/contact/", id: "contact", icon: "mail", children: [] },
    ];

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

    if (item.children && item.children.length > 0) {
      var activeHref = findActiveChildHref(item.children);

      var childItemsHtml = item.children
        .map(function (child) {
          return renderChildItem(child, activeHref);
        })
        .join("\n");

      subMenuHtml = '<div class="mobile-menu-l2" data-menu-l2="' + escapeHtml(item.id) + '">' + childItemsHtml;

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

      // applications 分类末尾追加「查看全部行业场景」链接
      if (item.id === "applications") {
        subMenuHtml +=
          '<a class="mobile-menu-l2-item mobile-menu-l2-viewall" href="/applications/">' +
          '<span class="mobile-menu-l2-icon">' +
          '<span class="material-symbols-outlined">grid_view</span>' +
          "</span>" +
          '<span class="mobile-menu-l2-label" data-i18n="nav_applications_view_all">查看全部行业场景</span>' +
          "</a>";
      }

      subMenuHtml += "</div>";
    }

    return (
      '<div class="mobile-menu-l1-wrap">' +
      '<button class="mobile-menu-l1" data-menu-toggle="' +
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
      '/assets/images/logo_footer.webp" alt="Yukoli" width="32" height="32" />' +
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

    return headerHtml + menuItemsHtml + ctaBarHtml;
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

    injectStyles();

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

    // 等待动画完成后再移除 DOM（350ms 与 CSS transition 保持一致）
    setTimeout(function () {
      if (overlayEl && overlayEl.parentNode) {
        overlayEl.parentNode.removeChild(overlayEl);
      }
      if (panelEl && panelEl.parentNode) {
        panelEl.parentNode.removeChild(panelEl);
      }
      overlayEl = null;
      panelEl = null;
      document.body.style.overflow = "";
    }, 350);
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
      toggleButtons[i].addEventListener("click", function (evt) {
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
      subItems[k].addEventListener("click", function (evt) {
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
      l1Buttons[m].addEventListener("click", function (evt) {
        var menuId = this.getAttribute("data-menu-toggle");
        var subMenu = panelEl.querySelector('[data-menu-l2="' + menuId + '"]');

        // 如果子菜单存在且不为空，折叠逻辑由上面的 toggleButtons 处理
        // 如果子菜单为空或不存在，则关闭整个菜单并导航
        if (!subMenu || subMenu.children.length === 0) {
          var href = this.getAttribute("data-menu-toggle");
          // Find href from menu items data
          var navItems = getMenuItems();
          var targetItem = null;
          for (var idx = 0; idx < navItems.length; idx++) {
            if (navItems[idx].id === menuId) {
              targetItem = navItems[idx];
              break;
            }
          }
          closeMenu();
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
      ctaButtons[n].addEventListener("click", function (evt) {
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
    var isTablet = window.innerWidth >= 768 && window.innerWidth < 1280;

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
  var searchBound = false;

  /** @type {Function|null} 汉堡按钮点击处理函数引用（用于解绑旧按钮） */
  var toggleClickHandler = null;

  /** @type {Function|null} 搜索按钮点击处理函数引用 */
  var searchClickHandler = null;

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

    // 绑定搜索按钮
    var searchBtn = document.getElementById("mobile-search-toggle");
    if (searchBtn && !searchBound) {
      searchBound = true;
      searchClickHandler = function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        // 切换搜索覆盖层的开/关
        if (document.getElementById("mobile-search-overlay")) {
          closeMobileSearch();
        } else {
          openMobileSearch();
        }
      };
      searchBtn.addEventListener("click", searchClickHandler);
    } else if (!searchBtn) {
      searchBound = false;
    }
  }

  /* ================================================================
   *  移动端搜索覆盖层
   * ================================================================ */

  /** @type {HTMLElement|null} 搜索覆盖层 DOM 引用 */
  var searchOverlayEl = null;

  /** @type {HTMLInputElement|null} 搜索输入框 DOM 引用 */
  var searchInputEl = null;

  /** @type {number|null} 搜索防抖定时器 ID */
  var searchDebounceTimer = null;

  /**
   * 打开移动端搜索覆盖层
   * - 创建全屏搜索 UI 并插入 DOM
   * - 自动聚焦输入框并绑定搜索事件
   * - 支持翻译管理器翻译占位符
   */
  function openMobileSearch() {
    searchOverlayEl = document.createElement("div");
    searchOverlayEl.id = "mobile-search-overlay";
    searchOverlayEl.className = "mobile-search-overlay";
    searchOverlayEl.innerHTML =
      '<div class="mobile-search-bar">' +
      '<span class="material-symbols-outlined mobile-search-icon">search</span>' +
      '<input type="search" id="mobile-search-input" class="mobile-search-input"' +
      ' placeholder="Search..." data-i18n-placeholder="search_placeholder"' +
      ' autocomplete="off" spellcheck="false" />' +
      '<button id="mobile-search-clear" type="button" class="mobile-search-clear" aria-label="Clear">' +
      '<span class="material-symbols-outlined">cancel</span>' +
      "</button>" +
      "</div>" +
      '<div id="mobile-search-results" class="mobile-search-results"></div>';

    document.body.appendChild(searchOverlayEl);
    document.body.style.overflow = "hidden";

    // 翻译搜索框占位符
    if (window.translationManager) {
      var placeholderEl = searchOverlayEl.querySelector("[data-i18n-placeholder]");
      if (placeholderEl) {
        var placeholderKey = placeholderEl.getAttribute("data-i18n-placeholder");
        var translatedPlaceholder = window.translationManager.translate(placeholderKey);
        if (translatedPlaceholder && translatedPlaceholder !== placeholderKey) {
          placeholderEl.placeholder = translatedPlaceholder;
        }
      }
    }

    // 入场动画 + 事件绑定（下一帧）
    requestAnimationFrame(function () {
      searchOverlayEl.classList.add("is-open");

      searchInputEl = document.getElementById("mobile-search-input");
      if (searchInputEl) {
        searchInputEl.focus();
        searchInputEl.addEventListener("input", onSearchInput);
        searchInputEl.addEventListener("keydown", onSearchKeydown);
      }

      // 清除按钮
      var clearBtn = document.getElementById("mobile-search-clear");
      if (clearBtn) {
        clearBtn.addEventListener("click", function () {
          if (searchInputEl) {
            searchInputEl.value = "";
            onSearchInput();
            searchInputEl.focus();
          }
        });
      }

      // 点击覆盖层空白区域关闭
      searchOverlayEl.addEventListener("click", function (evt) {
        if (evt.target === searchOverlayEl) {
          closeMobileSearch();
        }
      });
    });
  }

  /**
   * 关闭移动端搜索覆盖层
   * - 等待退场动画完成后销毁 DOM
   */
  function closeMobileSearch() {
    if (!searchOverlayEl) return;

    searchOverlayEl.classList.remove("is-open");

    setTimeout(function () {
      if (searchOverlayEl && searchOverlayEl.parentNode) {
        searchOverlayEl.parentNode.removeChild(searchOverlayEl);
      }
      searchOverlayEl = null;
      searchInputEl = null;
      document.body.style.overflow = "";
    }, 300);
  }

  /**
   * 搜索输入事件处理
   * - 控制清除按钮显示/隐藏
   * - 200ms 防抖后执行搜索
   */
  function onSearchInput() {
    if (!searchInputEl) return;

    clearTimeout(searchDebounceTimer);

    var query = searchInputEl.value.trim();

    // 切换清除按钮可见性
    var clearBtn = document.getElementById("mobile-search-clear");
    if (clearBtn) {
      if (query.length > 0) {
        clearBtn.classList.add("is-visible");
      } else {
        clearBtn.classList.remove("is-visible");
      }
    }

    // 清空时清除结果
    if (query.length < 1) {
      var resultsContainer = document.getElementById("mobile-search-results");
      if (resultsContainer) {
        resultsContainer.innerHTML = "";
      }
      return;
    }

    // 防抖搜索
    searchDebounceTimer = setTimeout(function () {
      var results = [];
      if (window.ProductSearchEngine && typeof window.ProductSearchEngine.search === "function") {
        results = window.ProductSearchEngine.search(query);
      }
      renderSearchResults(results);
    }, 200);
  }

  /**
   * 渲染搜索结果到结果容器
   * @param {Array} results - 搜索结果数组
   */
  function renderSearchResults(results) {
    var container = document.getElementById("mobile-search-results");
    if (!container) return;

    if (results && results.length > 0) {
      var html = "";
      for (var i = 0; i < results.length; i++) {
        var item = results[i];

        var displayName = (item._displayName || item._displayCategory + " " + item.model)
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        var model = (item.model || "").replace(/</g, "&lt;");
        var category = (item._displayCategory || item.category || "").replace(/</g, "&lt;");
        var imageUrl = item.productImage || item.imageUrl || "";

        var imageHtml = imageUrl
          ? '<img src="' + imageUrl + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
          : '<span class="material-symbols-outlined">inventory_2</span>';

        html +=
          '<a class="mobile-search-result-item" href="/products/">' +
          '<div class="mobile-search-result-img">' +
          imageHtml +
          "</div>" +
          '<div class="mobile-search-result-info">' +
          '<div class="mobile-search-result-name">' +
          displayName +
          "</div>" +
          '<div class="mobile-search-result-meta">' +
          "<span>" +
          model +
          "</span>" +
          '<span class="mobile-search-result-sep">·</span>' +
          "<span>" +
          category +
          "</span>" +
          "</div>" +
          "</div>" +
          "</a>";
      }

      container.innerHTML = html;

      // 点击搜索结果时关闭搜索覆盖层
      var resultLinks = container.querySelectorAll(".mobile-search-result-item");
      for (var j = 0; j < resultLinks.length; j++) {
        resultLinks[j].addEventListener("click", function () {
          closeMobileSearch();
        });
      }
    } else {
      // 空结果提示
      var trFn = (window.CommonUtils && window.CommonUtils.tr) || window.t;
      var emptyText = trFn ? trFn("search_no_results", "No matching products found") : "No matching products found";

      container.innerHTML =
        '<div class="mobile-search-empty">' +
        '<span class="material-symbols-outlined">search_off</span>' +
        "<p>" +
        escapeHtml(emptyText) +
        "</p>" +
        "</div>";
    }
  }

  /**
   * 搜索框键盘事件处理
   * @param {KeyboardEvent} evt
   */
  function onSearchKeydown(evt) {
    if (evt.key === "Escape") {
      closeMobileSearch();
    }
  }

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
      searchBound = false;
      initToggle();
      initSmartHeader();
      if (typeof SlideMenu !== "undefined" && SlideMenu.updateActive) SlideMenu.updateActive();
    },
    "spa:load:cleanup"
  );

  // 初始样式注入（立即执行）
  injectStyles();

  // DOM 就绪后初始化
  function tryInit() {
    initToggle();
    initSmartHeader();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      // Retry after a short delay in case navigator.js hasn't mounted yet
      tryInit();
      setTimeout(tryInit, 50);
    });
  } else {
    tryInit();
    setTimeout(tryInit, 50);
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

    /** 打开移动端搜索覆盖层 */
    openMobileSearch: openMobileSearch,

    /** 关闭移动端搜索覆盖层 */
    closeMobileSearch: closeMobileSearch,

    /** 更新子菜单项的 is-active 高亮（SPA 导航后调用） */
    updateActive: function () {
      var menuItems = getMenuItems();
      var currentPath = location.pathname.replace(/\/$/, "");
      menuItems.forEach(function (item) {
        if (!item.children || item.children.length === 0) return;
        var activeHref = findActiveChildHref(item.children);
        var panel = document.querySelector('[data-menu-l2="' + item.id + '"]');
        if (!panel) return;
        var items = panel.querySelectorAll(".mobile-menu-l2-item");
        for (var i = 0; i < items.length; i++) {
          var href = items[i].getAttribute("href") || "";
          if (href.replace(/\/$/, "") === activeHref.replace(/\/$/, "")) {
            items[i].classList.add("is-active");
          } else {
            items[i].classList.remove("is-active");
          }
        }
      });
    },
  };
})(window);
