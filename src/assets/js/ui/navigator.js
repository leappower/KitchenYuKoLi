/**
 * navigator.js — Yukoli Top Navigation Component
 *
 * Renders the sticky top header into a placeholder element, replacing it
 * with the full header HTML. The placeholder drives configuration via
 * data-* attributes — no inline HTML needed in each page.
 *
 * Usage in HTML (PC variant):
 *   <navigator data-component="navigator"
 *        data-variant="pc"
 *        data-active="products"
 *        data-search="true"
 *        data-search-i18n="search_placeholder"
 *        data-cta-text-key="nav_get_quote"
 *        data-cta-href="/quote/">
 *   </navigator>
 *
 * Usage in HTML (Tablet variant):
 *   <navigator data-component="navigator"
 *        data-variant="tablet"
 *        data-active="home"
 *        data-cta-text-key="nav_get_quote"
 *        data-cta-href="/quote/">
 *   </navigator>
 *
 * Configuration attributes:
 *   data-variant       {string}  Layout variant: "pc" | "tablet" (default: "pc")
 *   data-active        {string}  Nav item to highlight: "home" | "products" |
 *                                "applications" | "solutions" | "support" |
 *                                "case-studies" | "roi" | "pdp" | "esg" |
 *                                "thank-you" | "landing" | "quote" |
 *                                "" (none — page not in main nav)
 *   data-search        {string}  Show search box: "true" | "false" (default: "false")
 *   data-search-i18n   {string}  i18n key for search placeholder
 *                                (default: "search_placeholder")
 *   data-search-bp     {string}  Tailwind breakpoint for search box visibility
 *                                "xl" → "hidden xl:flex" (default) | "lg" → "hidden lg:flex"
 *   data-lang          {string}  Show language switcher: "true" | "false" (default: "true")
 *   data-cta           {string}  Show CTA button: "true" | "false" (default: "true")
 *   data-cta-text-key  {string}  i18n key for CTA button label (default: "nav_get_quote")
 *   data-cta-href      {string}  CTA button href (default: auto-resolved by variant)
 */

(function (global) {
  "use strict";

  /* ─────────────────────────────────────────────
   * 0. CONSTANTS
   * ───────────────────────────────────────────── */

  // Base nav item definitions — use directory URLs for SSG (/home/, /products/, etc.)
  // GitHub Pages serves each route as a directory with index.html
  // L1 菜单 — 6 项架构
  // Products / Applications / Solutions / Service / About / Contact
  var NAV_ITEMS = [
    { key: "nav_products", path: "/products/", id: "products", hasDropdown: true },
    { key: "nav_applications", path: "/applications/", id: "applications", hasDropdown: true },
    { key: "nav_solutions", path: "/solutions/", id: "solutions", hasDropdown: true },
    { key: "nav_service", path: "/support/", id: "support", hasDropdown: true },
    { key: "nav_about", path: "/about/", id: "about", hasDropdown: true },
    { key: "nav_contact", path: "/contact/", id: "contact", hasDropdown: true },
  ];

  /* ─────────────────────────────────────────────
   * 1. HELPERS
   * ───────────────────────────────────────────── */

  function esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function bool(val, defaultVal) {
    if (val === null || val === undefined || val === "") return defaultVal;
    return val !== "false";
  }

  // Resolve nav href — directory URLs for SSG deployment (/home/, /products/)
  function navHref(item, _variant) {
    return item.path; // Direct return, directory URL
  }

  /* ─────────────────────────────────────────────
   * 2. TEMPLATE BUILDERS
   * ───────────────────────────────────────────── */

  function buildNavLinks(activeId, variant) {
    return NAV_ITEMS.map(function (item) {
      var isActive = item.id === activeId;
      var cls = isActive
        ? "text-sm font-semibold text-primary"
        : "text-sm font-semibold hover:text-primary transition-colors";
      var href = navHref(item, variant);

      // Delegate to ProductsDropdown component for PC / tablet dropdown
      if (item.hasDropdown && global.ProductsDropdown && item.id === "products") {
        if (variant === "pc") {
          return global.ProductsDropdown.renderPC({
            href: href,
            labelKey: item.key,
            activeClass: cls,
          });
        }
        if (variant === "tablet") {
          return global.ProductsDropdown.renderTablet({
            href: href,
            labelKey: item.key,
            activeClass: cls,
          });
        }
      }

      // Delegate to SolutionsDropdown component for PC / tablet dropdown
      if (item.hasDropdown && global.SolutionsDropdown && item.id === "solutions") {
        if (variant === "pc") {
          return global.SolutionsDropdown.renderPC({
            href: href,
            labelKey: item.key,
            activeClass: cls,
          });
        }
        if (variant === "tablet") {
          return global.SolutionsDropdown.renderTablet({
            href: href,
            labelKey: item.key,
            activeClass: cls,
          });
        }
      }

      // Delegate to ApplicationsDropdown component for PC / tablet dropdown
      if (item.hasDropdown && global.ApplicationsDropdown && item.id === "applications") {
        if (variant === "pc") {
          return global.ApplicationsDropdown.renderPC({
            href: href,
            labelKey: item.key,
            activeClass: cls,
          });
        }
        if (variant === "tablet") {
          return global.ApplicationsDropdown.renderTablet({
            href: href,
            labelKey: item.key,
            activeClass: cls,
          });
        }
      }

      // Delegate to SupportDropdown component for PC / tablet dropdown
      if (item.hasDropdown && global.SupportDropdown && item.id === "support") {
        if (variant === "pc") {
          return global.SupportDropdown.renderPC({
            href: href,
            labelKey: item.key,
            activeClass: cls,
          });
        }
        if (variant === "tablet") {
          return global.SupportDropdown.renderTablet({
            href: href,
            labelKey: item.key,
            activeClass: cls,
          });
        }
      }

      // Delegate to AboutDropdown component for PC / tablet dropdown
      if (item.hasDropdown && global.AboutDropdown && item.id === "about") {
        if (variant === "pc") {
          return global.AboutDropdown.renderPC({
            href: href,
            labelKey: item.key,
            activeClass: cls,
          });
        }
        if (variant === "tablet") {
          return global.AboutDropdown.renderTablet({
            href: href,
            labelKey: item.key,
            activeClass: cls,
          });
        }
      }

      // Delegate to ContactDropdown component for PC / tablet dropdown
      if (item.hasDropdown && global.ContactDropdown && item.id === "contact") {
        if (variant === "pc") {
          return global.ContactDropdown.renderPC({
            href: href,
            labelKey: item.key,
            activeClass: cls,
          });
        }
        if (variant === "tablet") {
          return global.ContactDropdown.renderTablet({
            href: href,
            labelKey: item.key,
            activeClass: cls,
          });
        }
      }

      if (item.hasDropdown) {
        // Dropdown component not loaded yet — fallback to simple link
      }
      return (
        '<a class="' + cls + '" href="' + esc(href) + '" data-i18n="' + esc(item.key) + '">' + esc(item.key) + "</a>"
      );
    }).join("\n");
  }

  function buildSearchBox(i18nKey, breakpoint) {
    var bp = breakpoint === "lg" ? "hidden lg:flex" : "hidden xl:flex";
    // iOS-style search bar:
    //   • Full-pill shape (rounded-full)
    //   • Frosted-glass background (backdrop-blur + semi-transparent)
    //   • Smooth width expansion on focus via CSS transition
    //   • Clear (×) button appears when user types
    //   • Escape key collapses and clears
    return (
      '<div class="' +
      bp +
      ' ios-search-wrapper items-center">' +
      '<div class="ios-search-bar" id="ios-search-bar">' +
      '<span class="ios-search-icon material-symbols-outlined">search</span>' +
      "<input" +
      ' class="ios-search-input"' +
      ' id="ios-search-input"' +
      ' placeholder="Search equipment..."' +
      ' data-i18n-placeholder="' +
      esc(i18nKey) +
      '"' +
      ' type="search"' +
      ' autocomplete="off"' +
      ' spellcheck="false"/>' +
      '<button class="ios-search-clear" id="ios-search-clear" type="button" aria-label="Clear search" tabindex="-1">' +
      '<span class="material-symbols-outlined">cancel</span>' +
      "</button>" +
      "</div>" +
      "</div>"
    );
  }

  function buildLangDropdown() {
    // Lang dropdown: static placeholder (dynamically generated options removed)

    return (
      '<div class="lang-dropdown-container relative">' +
      '<button id="lang-toggle-btn"' +
      ' class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"' +
      ' type="button" aria-label="Switch language" data-i18n-aria="lang_switcher_aria">' +
      '<span class="material-symbols-outlined text-base leading-none">language</span>' +
      '<span id="current-lang-label" data-i18n="current_lang">\u4e2d\u6587\uff08\u7b80\u4f53\uff09</span>' +
      '<span class="material-symbols-outlined text-xs leading-none opacity-60">expand_more</span>' +
      "</button>" +
      '<div id="language-dropdown-anchor"></div>' +
      "</div>"
    );
  }

  function buildCtaButton(textKey, href) {
    return (
      '<a href="' +
      esc(href) +
      '"' +
      ' class="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"' +
      ' data-i18n="' +
      esc(textKey) +
      '">' +
      esc(textKey) +
      "</a>"
    );
  }

  function buildHeader(cfg) {
    var variant = cfg.variant;

    // ── Mobile: hamburger + logo + search ──
    if (variant === "mobile") {
      return (
        '<header id="mobile-header" class="sticky top-0 z-[2000] w-full border-b border-slate-200 dark:border-slate-800 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md transition-transform duration-300">' +
        '<div class="px-4 py-3 flex items-center justify-between">' +
        /* Left: Hamburger */
        '<button id="mobile-menu-toggle" type="button" class="flex items-center justify-center w-10 h-10 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Menu">' +
        '<span class="material-symbols-outlined text-2xl">menu</span>' +
        "</button>" +
        /* Center: Logo */
        '<a class="nav-logo-link" href="' +
        (window.BASE_PATH || "") +
        '/home/">' +
        '<img loading="eager" src="' +
        (window.BASE_PATH || "") +
        '/assets/images/logo_footer.webp" alt="Yukoli" width="36" height="36" style="width:36px;height:36px;object-fit:contain" />' +
        "</a>" +
        /* Right: Search */
        '<button id="mobile-search-toggle" type="button" class="flex items-center justify-center w-10 h-10 -mr-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Search">' +
        '<span class="material-symbols-outlined text-2xl">search</span>' +
        "</button>" +
        "</div>" +
        "</header>"
      );
    }

    // ── Tablet: logo + nav links + search icon + language switcher + CTA ──
    if (variant === "tablet") {
      var tabletRight = [];
      // Tablet uses a compact search icon instead of the full iOS search bar
      // (screen space is limited with nav links + lang + CTA)
      if (cfg.showSearch) {
        tabletRight.push(
          '<button id="tablet-search-toggle" type="button" class="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Search">' +
            '<span class="material-symbols-outlined text-xl">search</span>' +
            "</button>"
        );
      }
      if (cfg.showLang) {
        tabletRight.push(buildLangDropdown(variant));
      }
      if (cfg.showCta) {
        tabletRight.push(buildCtaButton(cfg.ctaTextKey, cfg.ctaHref));
      }
      return (
        '<header class="sticky top-0 z-[2000] w-full border-b border-slate-200 dark:border-slate-800 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">' +
        '<div class="max-w-[1024px] mx-auto px-4 py-3 flex items-center justify-between">' +
        /* Left: Logo + Nav */
        '<div class="flex items-center gap-4">' +
        '<a class="nav-logo-link" href="' +
        (window.BASE_PATH || "") +
        '/home/">' +
        '<img loading="eager" src="' +
        (window.BASE_PATH || "") +
        '/assets/images/logo_footer.webp" alt="Yukoli" width="36" height="36" style="width:36px;height:36px;object-fit:contain" />' +
        "</a>" +
        '<nav class="hidden md:flex items-center gap-3">' +
        buildNavLinks(cfg.active, cfg.variant) +
        "</nav>" +
        "</div>" +
        /* Right: Search icon + Lang + CTA */
        '<div class="flex items-center gap-2">' +
        tabletRight.join("\n") +
        "</div>" +
        "</div>" +
        "</header>"
      );
    }

    // ── PC (default): full header with logo + nav links + search + lang + CTA ──
    var rightParts = [];
    if (cfg.showSearch) {
      rightParts.push(buildSearchBox(cfg.searchI18n, cfg.searchBp));
    }
    if (cfg.showLang) {
      rightParts.push(buildLangDropdown(cfg.variant));
    }
    if (cfg.showCta) {
      rightParts.push(buildCtaButton(cfg.ctaTextKey, cfg.ctaHref));
    }

    return (
      '<header class="sticky top-0 z-[2000] w-full border-b border-slate-200 dark:border-slate-800 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">' +
      '<div class="max-w-[1920px] mx-auto px-6 md:px-10 lg:px-16 xl:px-20 py-4 flex items-center justify-between">' +
      /* Left: Logo + Nav */
      '<div class="flex items-center gap-6 lg:gap-12">' +
      '<a class="nav-logo-link" href="' +
      (window.BASE_PATH || "") +
      '/home/">' +
      '<img loading="eager" src="' +
      (window.BASE_PATH || "") +
      '/assets/images/logo_footer.webp" alt="Yukoli" width="44" height="44" style="width:44px;height:44px;object-fit:contain" />' +
      "</a>" +
      '<nav class="hidden md:flex items-center gap-4 lg:gap-8">' +
      buildNavLinks(cfg.active, cfg.variant) +
      "</nav>" +
      "</div>" +
      /* Right: Search + Lang + CTA */
      '<div class="flex items-center gap-6">' +
      rightParts.join("\n") +
      "</div>" +
      "</div>" +
      "</header>"
    );
  }

  /* ── Logo link press effect ── */
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
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────────
   * 3. IOS SEARCH STYLES  (injected once)
   * ───────────────────────────────────────────── */

  function injectSearchStyles() {
    if (document.getElementById("ios-search-styles")) return;
    var style = document.createElement("style");
    style.id = "ios-search-styles";
    style.textContent = [
      /* wrapper — flex container, ensures vertical centering */
      ".ios-search-wrapper { display: flex; align-items: center; }",

      /* pill bar */
      ".ios-search-bar {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 6px;",
      "  width: 200px;" /* collapsed width */,
      "  padding: 7px 14px;",
      "  border-radius: 9999px;" /* full pill */,
      "  background: rgba(120,120,128,0.12);" /* iOS light-mode search bg */,
      "  backdrop-filter: blur(12px);",
      "  -webkit-backdrop-filter: blur(12px);",
      "  border: 1px solid rgba(120,120,128,0.18);",
      "  transition: width 320ms cubic-bezier(0.4, 0, 0.2, 1),",
      "              background 200ms ease,",
      "              border-color 200ms ease,",
      "              box-shadow 200ms ease;",
      "  overflow: hidden;",
      "}",

      /* expanded state (via JS class) */
      ".ios-search-bar.is-focused {",
      "  width: 280px;",
      "  background: rgba(120,120,128,0.08);",
      "  border-color: rgba(236,91,19,0.4);" /* primary accent on focus */,
      "  box-shadow: 0 0 0 3px rgba(236,91,19,0.12);",
      "}",

      /* dark mode */
      "html.dark .ios-search-bar {",
      "  background: rgba(255,255,255,0.08);",
      "  border-color: rgba(255,255,255,0.12);",
      "}",
      "html.dark .ios-search-bar.is-focused {",
      "  background: rgba(255,255,255,0.10);",
      "  border-color: rgba(236,91,19,0.5);",
      "  box-shadow: 0 0 0 3px rgba(236,91,19,0.15);",
      "}",

      /* search icon */
      ".ios-search-icon {",
      "  font-size: 17px !important;",
      "  line-height: 1;",
      "  flex-shrink: 0;",
      "  color: rgba(60,60,67,0.6);",
      "  transition: color 200ms ease;",
      "}",
      "html.dark .ios-search-icon { color: rgba(235,235,245,0.6); }",
      ".ios-search-bar.is-focused .ios-search-icon { color: #ec5b13; }",

      /* input */
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
      "  -webkit-appearance: none;" /* remove native search decoration */,
      "}",
      /* hide native ×  in webkit */
      ".ios-search-input::-webkit-search-cancel-button { display: none; }",
      ".ios-search-input::placeholder { color: rgba(60,60,67,0.45); }",
      "html.dark .ios-search-input::placeholder { color: rgba(235,235,245,0.4); }",

      /* clear button */
      ".ios-search-clear {",
      "  display: none;" /* hidden until user types */,
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
      "html.dark .ios-search-clear .material-symbols-outlined { color: rgba(235,235,245,0.55); }",
      ".ios-search-clear:hover { opacity: 0.75; }",
      ".ios-search-clear.is-visible { display: flex; }",
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────────
   * 4. IOS SEARCH INTERACTIONS
   * ───────────────────────────────────────────── */

  function initSearchInteractions() {
    var bar = document.getElementById("ios-search-bar");
    var input = document.getElementById("ios-search-input");
    var clear = document.getElementById("ios-search-clear");
    if (!bar || !input || !clear) return;

    function expand() {
      bar.classList.add("is-focused");
    }

    function collapse() {
      bar.classList.remove("is-focused");
    }

    function updateClear() {
      if (input.value.length > 0) {
        clear.classList.add("is-visible");
      } else {
        clear.classList.remove("is-visible");
      }
    }

    input.addEventListener("focus", expand);

    input.addEventListener("blur", function () {
      /* small delay so click on clear button fires first */
      setTimeout(function () {
        if (document.activeElement !== input) {
          collapse();
        }
      }, 150);
    });

    input.addEventListener("input", updateClear);

    clear.addEventListener("mousedown", function (e) {
      e.preventDefault(); /* keep focus on input */
    });

    clear.addEventListener("click", function () {
      input.value = "";
      updateClear();
      input.focus();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.activeElement === input) {
        input.value = "";
        updateClear();
        input.blur();
        collapse();
      }
    });
  }

  /* ─────────────────────────────────────────────
   * 5. MOUNT
   * ───────────────────────────────────────────── */

  function mount() {
    // Inject shared dropdown base styles before any dropdown-specific styles
    if (global.DropdownBaseStyles) global.DropdownBaseStyles.inject();
    if (global.ProductsDropdown) global.ProductsDropdown.injectAllStyles();
    if (global.SolutionsDropdown) global.SolutionsDropdown.injectAllStyles();
    if (global.ApplicationsDropdown) global.ApplicationsDropdown.injectAllStyles();
    if (global.SupportDropdown) global.SupportDropdown.injectAllStyles();
    if (global.AboutDropdown) global.AboutDropdown.injectAllStyles();
    if (global.ContactDropdown) global.ContactDropdown.injectAllStyles();
    injectLogoStyles();
    injectSearchStyles();

    var placeholders = document.querySelectorAll('[data-component="navigator"]');
    for (var i = 0; i < placeholders.length; i++) {
      var el = placeholders[i];

      // Guard: skip if placeholder has no parent (already replaced by a prior mount)
      if (!el.parentNode) {
        console.warn("[navigator] Placeholder has no parent, skipping (already mounted?)");
        continue;
      }

      var variant = el.getAttribute("data-variant") || "pc";

      // Auto-detect mobile/tablet based on viewport width when variant is "pc"
      // This ensures mobile devices get the mobile header even if index.html specifies "pc"
      if (variant === "pc" && window.innerWidth < 768) {
        variant = "mobile";
      } else if (variant === "pc" && window.innerWidth >= 768 && window.innerWidth < 1024) {
        variant = "tablet";
      }
      lastVariant = variant;

      var cfg = {
        variant: variant,
        active: el.getAttribute("data-active") || "",
        showSearch: bool(el.getAttribute("data-search"), false),
        searchI18n: el.getAttribute("data-search-i18n") || "search_placeholder",
        searchBp: el.getAttribute("data-search-bp") || "xl",
        showLang: bool(el.getAttribute("data-lang"), true),
        showCta: bool(el.getAttribute("data-cta"), true),
        ctaTextKey: el.getAttribute("data-cta-text-key") || "nav_get_quote",
        ctaHref: el.getAttribute("data-cta-href") || "/quote/",
      };

      var wrapper = document.createElement("div");
      wrapper.innerHTML = buildHeader(cfg);
      var header = wrapper.firstChild;

      // Insert invisible so i18n key→text swap is hidden from user.
      // Placeholder reserves height via CSS, so no layout shift occurs.
      header.style.opacity = "0";
      header.style.transition = "opacity 0.12s ease-out";

      // Replace the placeholder with the rendered header
      el.parentNode.replaceChild(header, el);
    }

    // Bind iOS search interactions after DOM insertion
    initSearchInteractions();

    // ── Global dropdown mutual exclusion: only one dropdown open at a time ──
    function closeAllDropdowns(exceptWrap) {
      var selectors = [
        ".prod-dropdown-wrap",
        ".sol-dropdown-wrap",
        ".app-dropdown-wrap",
        ".sup-dropdown-wrap",
        ".abt-dropdown-wrap",
        ".cnt-dropdown-wrap",
      ];
      for (var s = 0; s < selectors.length; s++) {
        var wraps = document.querySelectorAll(selectors[s] + ".is-open");
        for (var w = 0; w < wraps.length; w++) {
          if (wraps[w] !== exceptWrap) {
            wraps[w].classList.remove("is-open");
          }
        }
      }
    }

    // Close other dropdowns when hovering into a new one
    var dropdownSelectors = [
      ".prod-dropdown-wrap",
      ".sol-dropdown-wrap",
      ".app-dropdown-wrap",
      ".sup-dropdown-wrap",
      ".abt-dropdown-wrap",
      ".cnt-dropdown-wrap",
    ];
    for (var d = 0; d < dropdownSelectors.length; d++) {
      (function (sel) {
        var wraps = document.querySelectorAll(sel);
        for (var w = 0; w < wraps.length; w++) {
          (function (wrap) {
            if (wrap._dropdownMutexBound) return;
            wrap._dropdownMutexBound = true;
            wrap.addEventListener("mouseenter", function () {
              // For touch devices, skip hover-based exclusion
              if (wrap.classList.contains("touch-device")) return;
              closeAllDropdowns(wrap);
            });
          })(wraps[w]);
        }
      })(dropdownSelectors[d]);
    }

    // ── Global click (capture phase): close other dropdowns on trigger click ──
    // Use capture phase because individual dropdown handlers use stopPropagation
    document.addEventListener(
      "click",
      function (e) {
        var clickedWrap = e.target.closest(
          ".prod-dropdown-wrap, .sol-dropdown-wrap, " +
            ".app-dropdown-wrap, .sup-dropdown-wrap, .abt-dropdown-wrap, .cnt-dropdown-wrap"
        );
        if (clickedWrap) {
          closeAllDropdowns(clickedWrap);
        } else {
          closeAllDropdowns(null);
        }
      },
      true
    ); // capture phase — runs before stopPropagation in bubble phase

    // Bind dropdown click toggle (delegated to dropdown components)
    if (global.ProductsDropdown) global.ProductsDropdown.initDropdownClick();
    if (global.SolutionsDropdown) global.SolutionsDropdown.initDropdownClick();
    if (global.ApplicationsDropdown) global.ApplicationsDropdown.initDropdownClick();
    if (global.SupportDropdown) global.SupportDropdown.initDropdownClick();
    if (global.AboutDropdown) global.AboutDropdown.initDropdownClick();
    if (global.ContactDropdown) global.ContactDropdown.initDropdownClick();

    // Debug: verify dropdown DOM after mount

    // Apply i18n, then reveal with a subtle fade-in.
    if (global.translationManager) {
      if (typeof global.translationManager.applyTranslations === "function") {
        global.translationManager.applyTranslations();
      }
      if (typeof global.translationManager.setupEventListeners === "function") {
        global.translationManager.setupEventListeners();
      }
    }
    var headers = document.querySelectorAll('header[style*="opacity: 0"], header[style*="opacity:0"]');
    global.requestAnimationFrame(function () {
      for (var k = 0; k < headers.length; k++) {
        headers[k].style.opacity = "1";
      }
    });

    // Re-init mobile menu toggle and smart header after mount (timing fix).
    // mobile-menu.js boot() runs BEFORE this mount, so initToggle() ran
    // when #mobile-menu-toggle didn't exist yet.  Now the button is in the
    // DOM, so we must bind events here.
    if (global.MobileMenu) {
      if (typeof global.MobileMenu.initToggle === "function") {
        global.MobileMenu.initToggle();
      }
      if (typeof global.MobileMenu.initSmartHeader === "function") {
        global.MobileMenu.initSmartHeader();
      }
    }

    // Tablet search toggle — reuse MobileMenu's search overlay
    var tabletSearchBtn = document.getElementById("tablet-search-toggle");
    if (tabletSearchBtn) {
      tabletSearchBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (global.MobileMenu && typeof global.MobileMenu.openMobileSearch === "function") {
          global.MobileMenu.openMobileSearch();
        }
      });
    }
  }

  /* ─────────────────────────────────────────────
   * 6. UPDATE ACTIVE STATE (SPA re-mount)
   * ───────────────────────────────────────────── */

  /**
   * Update the active navigation item without full re-render.
   * Used by SPA shell after page navigation to highlight the correct nav item.
   * @param {string} activeId - The active nav item id (e.g. "home", "products", "case-studies", "support")
   */
  function updateActive(activeId) {
    activeId = activeId || "";

    // 确保最新样式已注入（SPA 导航时不会重新 mount）
    if (global.DropdownBaseStyles) global.DropdownBaseStyles.inject();
    if (global.ProductsDropdown && global.ProductsDropdown.injectAllStyles) {
      global.ProductsDropdown.injectAllStyles();
    }
    if (global.SolutionsDropdown && global.SolutionsDropdown.injectAllStyles) {
      global.SolutionsDropdown.injectAllStyles();
    }
    if (global.ApplicationsDropdown && global.ApplicationsDropdown.injectAllStyles) {
      global.ApplicationsDropdown.injectAllStyles();
    }
    if (global.SupportDropdown && global.SupportDropdown.injectAllStyles) {
      global.SupportDropdown.injectAllStyles();
    }
    if (global.AboutDropdown && global.AboutDropdown.injectAllStyles) {
      global.AboutDropdown.injectAllStyles();
    }
    if (global.ContactDropdown && global.ContactDropdown.injectAllStyles) {
      global.ContactDropdown.injectAllStyles();
    }

    // 匹配所有 nav 链接：
    // - 普通链接: a[data-i18n]
    // - dropdown trigger: prod / sol / app / sup / abt / cnt
    var navLinks = document.querySelectorAll(
      "header nav a[data-i18n], header nav a.prod-dropdown-trigger, header nav a.sol-dropdown-trigger, header nav a.app-dropdown-trigger, header nav a.sup-dropdown-trigger, header nav a.abt-dropdown-trigger, header nav a.cnt-dropdown-trigger"
    );

    // 容错处理:如果没有导航链接,直接返回(Mobile/Tablet 端可能没有 nav)
    if (navLinks.length === 0) {
      return;
    }

    for (var i = 0; i < navLinks.length; i++) {
      var link = navLinks[i];
      var isActive = false;
      var linkKey =
        link.getAttribute("data-i18n") ||
        link.getAttribute("data-prod-trigger-label") ||
        link.getAttribute("data-sol-trigger-label") ||
        link.getAttribute("data-app-trigger-label") ||
        link.getAttribute("data-sup-trigger-label") ||
        link.getAttribute("data-abt-trigger-label") ||
        link.getAttribute("data-cnt-trigger-label") ||
        "";
      for (var j = 0; j < NAV_ITEMS.length; j++) {
        if (NAV_ITEMS[j].id === activeId && linkKey === NAV_ITEMS[j].key) {
          isActive = true;
          break;
        }
      }
      var isDropdownTrigger =
        link.classList.contains("prod-dropdown-trigger") ||
        link.classList.contains("sol-dropdown-trigger") ||
        link.classList.contains("app-dropdown-trigger") ||
        link.classList.contains("sup-dropdown-trigger") ||
        link.classList.contains("abt-dropdown-trigger") ||
        link.classList.contains("cnt-dropdown-trigger");
      if (isActive) {
        link.className = "text-sm font-semibold text-primary" + (isDropdownTrigger ? " prod-dropdown-trigger" : "");
      } else {
        link.className =
          "text-sm font-semibold hover:text-primary transition-colors" +
          (isDropdownTrigger ? " prod-dropdown-trigger" : "");
      }
    }
  }

  /* ─────────────────────────────────────────────
   * 7. BOOT
   * ───────────────────────────────────────────── */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  // Handle bfcache restoration - re-mount header if needed
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      // Page was restored from bfcache, check if header needs re-mounting
      var placeholders = document.querySelectorAll('[data-component="navigator"]');
      var needsRemount = false;
      for (var i = 0; i < placeholders.length; i++) {
        var ph = placeholders[i];
        // Check if placeholder is empty (content lost during bfcache)
        if (!ph.querySelector("header") && !ph.querySelector("nav")) {
          needsRemount = true;
          break;
        }
      }
      if (needsRemount) {
        mount();
      }
    }
  });

  // Re-mount if viewport crosses breakpoint on resize
  var lastVariant = "pc";
  var resizeDebounce = null;
  window.addEventListener("resize", function () {
    // Debounce variant check to avoid rapid re-mounts
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(function () {
      var newVariant;
      if (window.innerWidth < 768) newVariant = "mobile";
      else if (window.innerWidth < 1024) newVariant = "tablet";
      else newVariant = "pc";

      if (newVariant !== lastVariant) {
        lastVariant = newVariant;
        mount();
        // Re-init mobile menu toggle if switching to mobile
        if (newVariant === "mobile" && global.MobileMenu && typeof global.MobileMenu.initToggle === "function") {
          global.MobileMenu.initToggle();
        }
      }
    }, 300);
  });

  // Expose for programmatic re-mount (e.g. SPA or testing)
  global.Navigator = { mount: mount, updateActive: updateActive };

  // Handle SPA navigation - active state is updated by SpaRouter.updateHeaderActiveNav()
  // Do NOT call updateActive() here without an argument — it would clear the active state
  // that was just set by renderContent → updateHeaderActiveNav.
  document.addEventListener("spa:load", function () {
    // Only re-mount if there is NO header in the document at all.
    // If header exists, active state is managed by SpaRouter.updateHeaderActiveNav().
    if (!document.querySelector("header")) {
      mount();
    }
  });
})(window);
