! function(e) {
  "use strict";
  var t = "undefined" != typeof NAV_CONFIG && NAV_CONFIG.mainNav || [{
    key: "nav_products",
    label: "产品中心",
    path: "/products/",
    id: "products",
    hasDropdown: !0
  }, {
    key: "nav_applications",
    label: "场景应用",
    path: "/applications/",
    id: "applications",
    hasDropdown: !0
  }, {
  }, {
    key: "nav_service",
    label: "服务支持",
    path: "/support/",
    id: "support",
    hasDropdown: !0
  }, {
    key: "nav_about",
    label: "关于我们",
    path: "/about/",
    id: "about",
    hasDropdown: !0
  }];

  function a(e) {
    return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  function o(e, t) {
    return null == e || "" === e ? t : "false" !== e
  }

  function r(e) {
    return '<div class="ios-search-wrapper flex-1 flex justify-center mx-1" style="max-width:320px"><div class="ios-search-bar" id="mobile-ios-search-bar" style="width:100%;padding:5px 12px"><span class="ios-search-icon material-symbols-outlined" style="font-size:18px">search</span><input class="ios-search-input" id="mobile-header-search-input" placeholder="Search equipment..." data-i18n-placeholder="' + a(e) + '" type="search" autocomplete="off" spellcheck="false" style="font-size:14px"/><button class="ios-search-clear" type="button" aria-label="Clear" tabindex="-1"><span class="material-symbols-outlined" style="font-size:18px">cancel</span></button></div></div>'
  }

  function n(o) {
    var n = o.variant;
    if ("mobile" === n) return '<div id="mobile-header-placeholder" style="height:65px;flex-shrink:0"></div><header id="mobile-header" class="fixed top-0 left-0 right-0 z-[var(--z-header)] border-b border-slate-200 dark:border-slate-800 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md transition-transform duration-300"><div class="px-3 py-3 flex items-center gap-2"><div class="flex items-center gap-1 flex-shrink-0"><button id="mobile-menu-toggle" type="button" class="flex items-center justify-center w-10 h-10 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Menu"><span class="material-symbols-outlined text-2xl">menu</span></button><a class="nav-logo-link" href="' + (window.BASE_PATH || "") + '/home/"><img loading="eager" src="' + (window.BASE_PATH || "") + '/assets/images/logo_footer.webp" alt="Yukoli" width="32" height="32" style="width:32px;height:32px;object-fit:contain" /></a></div><div class="flex-1 flex justify-center mx-1">' + r(o.searchI18n || "search_placeholder") + '</div><div class="flex-shrink-0"><div class="lang-dropdown-container relative"><button id="lang-toggle-btn" class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors" type="button" aria-label="Switch language" data-i18n-aria="lang_switcher_aria"><span class="material-symbols-outlined text-base leading-none">language</span><span id="current-lang-label" class="hidden sm:inline" data-i18n="current_lang">中文（简体）</span><span class="material-symbols-outlined text-xs opacity-40 hidden sm:inline">expand_more</span></button><div id="language-dropdown-anchor"></div></div></div></div></header>';
    if ("tablet" === n) return '<div id="mobile-header-placeholder" style="height:65px;flex-shrink:0"></div><header id="mobile-header" class="fixed top-0 left-0 right-0 z-[var(--z-header)] border-b border-slate-200 dark:border-slate-800 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md transition-transform duration-300"><div class="px-3 py-3 flex items-center gap-2"><div class="flex items-center gap-1 flex-shrink-0"><button id="mobile-menu-toggle" type="button" class="flex items-center justify-center w-10 h-10 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Menu"><span class="material-symbols-outlined text-2xl">menu</span></button><a class="nav-logo-link" href="' + (window.BASE_PATH || "") + '/home/"><img loading="eager" src="' + (window.BASE_PATH || "") + '/assets/images/logo_footer.webp" alt="Yukoli" width="32" height="32" style="width:32px;height:32px;object-fit:contain" /></a></div><div class="flex-1 flex justify-center mx-1">' + r(o.searchI18n || "search_placeholder") + '</div><div class="flex-shrink-0"><div class="lang-dropdown-container relative"><button id="lang-toggle-btn" class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors" type="button" aria-label="Switch language" data-i18n-aria="lang_switcher_aria"><span class="material-symbols-outlined text-base leading-none">language</span><span id="current-lang-label" data-i18n="current_lang">中文（简体）</span><span class="material-symbols-outlined text-xs opacity-40">expand_more</span></button><div id="language-dropdown-anchor"></div></div></div></div></header>';
    var i, l, s = [];
    return o.showSearch && s.push((i = o.searchI18n, '<div class="' + ("lg" === o.searchBp ? "hidden lg:flex" : "hidden xl:flex") + ' ios-search-wrapper items-center flex-shrink-0"><div class="ios-search-bar" id="ios-search-bar"><span class="ios-search-icon material-symbols-outlined">search</span><input class="ios-search-input" id="ios-search-input" placeholder="Search equipment..." data-i18n-placeholder="' + a(i) + '" type="search" autocomplete="off" spellcheck="false"/><button class="ios-search-clear" id="ios-search-clear" type="button" aria-label="Clear search" tabindex="-1"><span class="material-symbols-outlined">cancel</span></button></div></div>')), o.showLang && s.push((o.variant, '<div class="lang-dropdown-container relative flex-shrink-0"><button id="lang-toggle-btn" class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors" type="button" aria-label="Switch language" data-i18n-aria="lang_switcher_aria"><span class="material-symbols-outlined text-base leading-none">language</span><span id="current-lang-label" data-i18n="current_lang">中文（简体）</span><span class="material-symbols-outlined text-xs opacity-40">expand_more</span></button><div id="language-dropdown-anchor"></div></div>')), o.showCta && s.push('<div class="hidden lg:block flex-shrink-0">' + (l = o.ctaTextKey, '<a href="' + a(o.ctaHref) + '" class="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap hover:opacity-90 active:scale-95 transition-all outline-none" data-i18n="' + a(l) + '">获取报价</a></div>')), '<div id="pc-header-placeholder" style="height:109px;flex-shrink:0"></div><header class="fixed top-0 left-0 right-0 z-[var(--z-header)] border-b border-slate-200 dark:border-slate-800 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md"><div class="max-w-[1920px] mx-auto px-6 md:px-10 lg:px-16 xl:px-20 py-4 flex items-center justify-between" style="min-height:108px"><div class="flex items-center gap-4 lg:gap-8"><a class="nav-logo-link" href="' + (window.BASE_PATH || "") + '/home/"><img loading="eager" src="' + (window.BASE_PATH || "") + '/assets/images/logo_footer.webp" alt="Yukoli" width="44" height="44" style="width:44px;height:44px;object-fit:contain" /></a><nav class="hidden md:flex items-center gap-4 lg:gap-8">' + function(o, r) {
      return t.map(function(t) {
        var n = t.id === o ? "text-sm font-semibold text-primary" : "text-sm font-semibold hover:text-primary transition-colors",
          i = function(e) {
            return e.path
          }(t);
        if (t.hasDropdown && e.ProductsDropdown && "products" === t.id) {
          if ("pc" === r) return e.ProductsDropdown.renderPC({
            href: i,
            labelKey: t.key,
            label: t.label,
            activeClass: n
          });
          if ("tablet" === r) return e.ProductsDropdown.renderTablet({
            href: i,
            labelKey: t.key,
            label: t.label,
            activeClass: n
          if (t.hasDropdown && e.ApplicationsDropdown && "applications" === t.id) {
          if ("pc" === r) return e.ApplicationsDropdown.renderPC({
            href: i,
            labelKey: t.key,
            label: t.label,
            activeClass: n
          });
          if ("tablet" === r) return e.ApplicationsDropdown.renderTablet({
            href: i,
            labelKey: t.key,
            label: t.label,
            activeClass: n
          })
        }
        if (t.hasDropdown && e.SupportDropdown && "support" === t.id) {
          if ("pc" === r) return e.SupportDropdown.renderPC({
            href: i,
            labelKey: t.key,
            label: t.label,
            activeClass: n
          });
          if ("tablet" === r) return e.SupportDropdown.renderTablet({
            href: i,
            labelKey: t.key,
            label: t.label,
            activeClass: n
          })
        }
        if (t.hasDropdown && e.AboutDropdown && "about" === t.id) {
          if ("pc" === r) return e.AboutDropdown.renderPC({
            href: i,
            labelKey: t.key,
            label: t.label,
            activeClass: n
          });
          if ("tablet" === r) return e.AboutDropdown.renderTablet({
            href: i,
            labelKey: t.key,
            label: t.label,
            activeClass: n
          return t.hasDropdown ? '<span class="' + n + ' pointer-events-none">' + t.label + "</span>" : '<a class="' + n + '" href="' + a(i) + '" data-i18n="' + a(t.key) + '">' + a(t.label) + "</a>"
      }).join("\n")
    }(o.active, o.variant) + '</nav></div><div class="flex items-center gap-6">' + s.join("\n") + "</div></div></header>"
  }

  function i() {
    e.DropdownBaseStyles && e.DropdownBaseStyles.inject(), e.ProductsDropdown && e.ProductsDropdown.injectAllStyles(), e.ApplicationsDropdown && e.ApplicationsDropdown.injectAllStyles(), e.SupportDropdown && e.SupportDropdown.injectAllStyles(), e.AboutDropdown && e.AboutDropdown.injectAllStyles(),
      function() {
        if (!document.getElementById("nav-logo-styles")) {
          var e = document.createElement("style");
          e.id = "nav-logo-styles", e.textContent = [".nav-logo-link {", "  display: flex;", "  align-items: center;", "  border-radius: 8px;", "  padding: 4px;", "  transition: background .15s ease, transform .15s cubic-bezier(.32,.72,0,1), opacity .15s ease;", "  -webkit-tap-highlight-color: transparent;", "}", ".nav-logo-link:active {", "  background: rgba(236,91,19,.12);", "  transform: scale(.92);", "}", "html.dark .nav-logo-link:active {", "  background: rgba(236,91,19,.18);", "}"].join("\n"), document.head.appendChild(e)
        }
      }(),
      function() {
        if (!document.getElementById("ios-search-styles")) {
          var e = document.createElement("style");
          e.id = "ios-search-styles", e.textContent = [".ios-search-wrapper { display: flex; align-items: center; }", ".ios-search-bar {", "  display: flex;", "  align-items: center;", "  gap: 6px;", "  width: 200px;", "  padding: 7px 14px;", "  border-radius: 9999px;", "  background: rgba(120,120,128,0.12);", "  backdrop-filter: blur(12px);", "  -webkit-backdrop-filter: blur(12px);", "  border: 1px solid rgba(120,120,128,0.18);", "  transition: width 320ms cubic-bezier(0.4, 0, 0.2, 1),", "              background 200ms ease,", "              border-color 200ms ease,", "              box-shadow 200ms ease;", "  overflow: hidden;", "}", ".ios-search-bar.is-focused {", "  width: 280px;", "  background: rgba(120,120,128,0.08);", "  border-color: rgba(236,91,19,0.4);", "  box-shadow: 0 0 0 3px rgba(236,91,19,0.12);", "}", "#mobile-ios-search-bar.is-focused {", "  background: rgba(120,120,128,0.08);", "  border-color: rgba(236,91,19,0.4);", "  box-shadow: 0 0 0 3px rgba(236,91,19,0.12);", "}", "html.dark .ios-search-bar {", "  background: rgba(255,255,255,0.08);", "  border-color: rgba(255,255,255,0.12);", "}", "html.dark .ios-search-bar.is-focused {", "  background: rgba(255,255,255,0.10);", "  border-color: rgba(236,91,19,0.5);", "  box-shadow: 0 0 0 3px rgba(236,91,19,0.15);", "}", "html.dark #mobile-ios-search-bar.is-focused {", "  background: rgba(255,255,255,0.10);", "  border-color: rgba(236,91,19,0.5);", "  box-shadow: 0 0 0 3px rgba(236,91,19,0.15);", "}", ".ios-search-icon {", "  font-size: 17px !important;", "  line-height: 1;", "  flex-shrink: 0;", "  color: rgba(60,60,67,0.6);", "  transition: color 200ms ease;", "}", "html.dark .ios-search-icon { color: rgba(235,235,245,0.6); }", ".ios-search-bar.is-focused .ios-search-icon { color: #ec5b13; }", ".ios-search-input {", "  flex: 1;", "  min-width: 0;", "  background: transparent;", "  border: none;", "  outline: none;", "  box-shadow: none;", "  font-size: 14px;", "  font-family: inherit;", "  color: inherit;", "  line-height: 1.4;", "  -webkit-appearance: none;", "}", ".ios-search-input::-webkit-search-cancel-button { display: none; }", ".ios-search-input::placeholder { color: rgba(60,60,67,0.45); }", "html.dark .ios-search-input::placeholder { color: rgba(235,235,245,0.4); }", ".ios-search-clear {", "  display: none;", "  align-items: center;", "  justify-content: center;", "  flex-shrink: 0;", "  background: rgba(120,120,128,0.28);", "  border: none;", "  border-radius: 50%;", "  width: 18px;", "  height: 18px;", "  padding: 0;", "  cursor: pointer;", "  transition: opacity 150ms ease, background 150ms ease;", "}", ".ios-search-clear .material-symbols-outlined {", "  font-size: 14px !important;", "  color: rgba(60,60,67,0.55);", "  line-height: 1;", "}", "html.dark .ios-search-clear { background: rgba(255,255,255,0.20); }", "html.dark .ios-search-clear .material-symbols-outlined { color: rgba(235,235,245,0.55); }", ".ios-search-clear:hover { opacity: 0.75; }", ".ios-search-clear.is-visible { display: flex; }"].join("\n"), document.head.appendChild(e)
        }
      }(), console.log("[navigator] mount() called, found", document.querySelectorAll('[data-component="navigator"]').length, "placeholder(s)");
    for (var t = document.querySelectorAll('[data-component="navigator"]'), a = 0; a < t.length; a++) {
      var r = t[a];
      if (r.parentNode) {
        var i = r.querySelector("header");
        if (i) r.parentNode.replaceChild(i, r);
        else {
          var s = r.getAttribute("data-variant") || "pc";
          "pc" === s && window.innerWidth < 768 ? s = "mobile" : "pc" === s && window.innerWidth >= 768 && window.innerWidth < 1024 && (s = "tablet"), l = s;
          var d = {
              variant: s,
              active: r.getAttribute("data-active") || "",
              showSearch: o(r.getAttribute("data-search"), !1),
              searchI18n: r.getAttribute("data-search-i18n") || "search_placeholder",
              searchBp: r.getAttribute("data-search-bp") || "xl",
              showLang: o(r.getAttribute("data-lang"), !0),
              showCta: o(r.getAttribute("data-cta"), !0),
              ctaTextKey: r.getAttribute("data-cta-text-key") || "nav_get_quote",
              ctaHref: r.getAttribute("data-cta-href") || "/quote/"
            },
            c = document.createElement("div");
          c.innerHTML = n(d);
          var p = c.children.length,
            u = c.firstElementChild,
            g = u ? u.nextElementSibling : c.firstChild;
          console.log("[navigator] buildHeader children:", p, "| placeholder:", u ? u.tagName + "#" + u.id : "NULL", "| header:", g ? g.tagName + "#" + (g.id || "") : "NULL"), u && u.id && r.parentNode.insertBefore(u, r), console.log("[navigator] variant=" + s + " | header inserted, tag=" + (g ? g.tagName : "NULL")), r.parentNode.replaceChild(g, r), setTimeout(function() { e.SlideMenu && (e.SlideMenu.initToggle && e.SlideMenu.initToggle(), e.SlideMenu.initSmartHeader && e.SlideMenu.initSmartHeader()) }, 0)
        }
      } else console.warn("[navigator] Placeholder has no parent, skipping (already mounted?)")
    }

    function b(e) {
      for (var t = [".prod-dropdown-wrap", , ".app-dropdown-wrap", ".sup-dropdown-wrap", ".abt-dropdown-wrap", ], a = 0; a < t.length; a++)
        for (var o = document.querySelectorAll(t[a] + ".is-open"), r = 0; r < o.length; r++) o[r] !== e && o[r].classList.remove("is-open")
    }! function() {
      var e = document.getElementById("ios-search-bar"),
        t = document.getElementById("ios-search-input"),
        a = document.getElementById("ios-search-clear");

      function o() {
        e.classList.remove("is-focused")
      }

      function r() {
        t.value.length > 0 ? a.classList.add("is-visible") : a.classList.remove("is-visible")
      }
      e && t && a && (t.addEventListener("focus", function() {
        e.classList.add("is-focused")
      }), t.addEventListener("blur", function() {
        setTimeout(function() {
          document.activeElement !== t && o()
        }, 150)
      }), t.addEventListener("input", r), a.addEventListener("mousedown", function(e) {
        e.preventDefault()
      }), a.addEventListener("click", function() {
        t.value = "", r(), t.focus()
      }), document.addEventListener("keydown", function(e) {
        "Escape" === e.key && document.activeElement === t && (t.value = "", r(), t.blur(), o())
      }))
    }();
    (function() {
      var e = document.getElementById("mobile-ios-search-bar"),
        t = document.getElementById("mobile-header-search-input"),
        a = e ? e.querySelector(".ios-search-clear") : null;

      function o() {
        e && e.classList.remove("is-focused")
      }

      function r() {
        t && a && (t.value.length > 0 ? a.classList.add("is-visible") : a.classList.remove("is-visible"))
      }
      e && t && (t.addEventListener("focus", function() {
        e.classList.add("is-focused")
      }), t.addEventListener("blur", function() {
        setTimeout(function() {
          document.activeElement !== t && o()
        }, 150)
      }), t.addEventListener("input", r), a && (a.addEventListener("mousedown", function(e) {
        e.preventDefault()
      }), a.addEventListener("click", function() {
        t.value = "", r(), t.focus()
      }), document.addEventListener("keydown", function(e) {
        "Escape" === e.key && document.activeElement === t && (t.value = "", r(), t.blur(), o())
      })))
    })();
    for (var h = [".prod-dropdown-wrap", , ".app-dropdown-wrap", ".sup-dropdown-wrap", ".abt-dropdown-wrap", ], w = 0; w < h.length; w++)(function(e) {
      for (var t = document.querySelectorAll(e), a = 0; a < t.length; a++)(function(e) {
        e._dropdownMutexBound || (e._dropdownMutexBound = !0, e.addEventListener("mouseenter", function() {
          e.classList.contains("touch-device") || b(e)
        }))
      })(t[a])
    })(h[w]);
    document.addEventListener("click", function(e) {
      b(e.target.closest(".prod-dropdown-wrap, .sol-dropdown-wrap, .app-dropdown-wrap, .sup-dropdown-wrap, .abt-dropdown-wrap, .cnt-dropdown-wrap") || null)
    }, !0), e.ProductsDropdown && e.ProductsDropdown.initDropdownClick(), e.ApplicationsDropdown && e.ApplicationsDropdown.initDropdownClick(), e.SupportDropdown && e.SupportDropdown.initDropdownClick(), e.AboutDropdown && e.AboutDropdown.initDropdownClick(), e.translationManager && ("function" == typeof e.translationManager.resetEventListeners && e.translationManager.resetEventListeners(), "function" == typeof e.translationManager.applyTranslations && e.translationManager.applyTranslations(), "function" == typeof e.translationManager.setupEventListeners && e.translationManager.setupEventListeners()), console.log("[navigator] MobileMenu exists:", !!e.SlideMenu, "| initToggle:", typeof(e.SlideMenu && e.SlideMenu.initToggle)), e.SlideMenu && ("function" == typeof e.SlideMenu.initToggle && (e.SlideMenu.initToggle(), console.log("[navigator] MobileMenu.initToggle() called")), "function" == typeof e.SlideMenu.initSmartHeader && e.SlideMenu.initSmartHeader());
    var m = document.getElementById("tablet-search-toggle");
    m && m.addEventListener("click", function(t) {
      t.preventDefault(), t.stopPropagation(), e.SlideMenu && "function" == typeof e.SlideMenu.openMobileSearch && e.SlideMenu.openMobileSearch()
    })
  }
  "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", i) : i(), window.addEventListener("pageshow", function(e) {
    if (e.persisted) {
      for (var t = document.querySelectorAll('[data-component="navigator"]'), a = !1, o = 0; o < t.length; o++) {
        var r = t[o];
        if (!r.querySelector("header") && !r.querySelector("nav")) {
          a = !0;
          break
        }
      }
      a && i()
    }
  });
  var l = "pc",
    s = null;
  window.addEventListener("resize", function() {
    clearTimeout(s), s = setTimeout(function() {
      var t;
      (t = window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "pc") !== l && (l = t, i(), "mobile" === t && e.SlideMenu && "function" == typeof e.SlideMenu.initToggle && e.SlideMenu.initToggle())
    }, 300)
  }), e.Navigator = {
    mount: i,
    updateActive: function(a) {
      a = a || "";
      var o = window.location.pathname.replace(/\/$/, "") || "/";
      e.DropdownBaseStyles && e.DropdownBaseStyles.inject(), e.ProductsDropdown && e.ProductsDropdown.injectAllStyles && e.ProductsDropdown.injectAllStyles(), e.ApplicationsDropdown && e.ApplicationsDropdown.injectAllStyles && e.ApplicationsDropdown.injectAllStyles(), e.SupportDropdown && e.SupportDropdown.injectAllStyles && e.SupportDropdown.injectAllStyles(), e.AboutDropdown && e.AboutDropdown.injectAllStyles && e.AboutDropdown.injectAllStyles();
      var r = document.querySelectorAll("header nav a[data-i18n], header nav a.prod-dropdown-trigger, header nav a.sol-dropdown-trigger, header nav a.app-dropdown-trigger, header nav a.sup-dropdown-trigger, header nav a.abt-dropdown-trigger, header nav a.cnt-dropdown-trigger");
      if (r.length > 0)
        for (var n = 0; n < r.length; n++) {
          var i = a,
            l = {
              "case-studies": "cases",
              roi: "profit-calculator",
              news: "contact",
              quote: "contact",
              "thank-you": "contact"
            };
          l[a] && (i = l[a]);
          for (var s = r[n], d = !1, c = s.getAttribute("data-i18n") || s.getAttribute("data-prod-trigger-label") || s.getAttribute("data-sol-trigger-label") || s.getAttribute("data-app-trigger-label") || s.getAttribute("data-sup-trigger-label") || s.getAttribute("data-abt-trigger-label") || s.getAttribute("data-cnt-trigger-label") || "", p = 0; p < t.length; p++)
            if (t[p].id === i && c === t[p].key) {
              d = !0;
              break
            } var u = [];
          (s.classList.contains("prod-dropdown-trigger") || s.classList.contains("sol-dropdown-trigger") || s.classList.contains("app-dropdown-trigger") || s.classList.contains("sup-dropdown-trigger") || s.classList.contains("abt-dropdown-trigger") || s.classList.contains("cnt-dropdown-trigger")) && (s.classList.contains("prod-dropdown-trigger") && u.push("prod-dropdown-trigger"), s.classList.contains("sol-dropdown-trigger") && u.push("sol-dropdown-trigger"), s.classList.contains("app-dropdown-trigger") && u.push("app-dropdown-trigger"), s.classList.contains("sup-dropdown-trigger") && u.push("sup-dropdown-trigger"), s.classList.contains("abt-dropdown-trigger") && u.push("abt-dropdown-trigger"), s.classList.contains("cnt-dropdown-trigger") && u.push("cnt-dropdown-trigger")), s.className = d ? "text-sm font-semibold text-primary" + (u.length ? " " + u.join(" ") : "") : "text-sm font-semibold hover:text-primary transition-colors" + (u.length ? " " + u.join(" ") : "")
        }
      for (var g = document.querySelectorAll(".prod-dropdown-item.is-active, .sol-dropdown-item.is-active, .app-dropdown-item.is-active, .sup-dropdown-item.is-active, .abt-dropdown-item.is-active, .cnt-dropdown-item.is-active"), b = 0; b < g.length; b++) g[b].classList.remove("is-active");
      if (a) {
        var h = {
          products: "prod",
          applications: "app",
          
          support: "sup",
          about: "abt",
          
          "case-studies": "app",
          roi: "sol",
          news: "cnt",
          quote: "cnt",
          "thank-you": "cnt"
        } [a];
        if (h) {
          for (var w = document.querySelectorAll("." + h + "-dropdown-item"), m = 0; m < w.length; m++)
            if ((f = w[m].getAttribute("href")) && (f = f.replace(/\/$/, ""))) {
              var v = o.replace(/\/$/, "");
              if ((y = f.split("?")[0].replace(/\/$/, "")) === v) {
                t = w[m];
                break
              }
            } if (!t)
            for (m = 0; m < w.length; m++) {
              var f;
              if ((f = w[m].getAttribute("href")) && (f = f.replace(/\/$/, "")) && !w[m].classList.contains("prod-viewall-item")) {
                v = o.replace(/\/$/, "");
                var y = f.split("?")[0].replace(/\/$/, "");
                if (0 === v.indexOf(y + "/")) {
                  t = w[m];
                  break
                }
              }
            }
          t && t.classList && t.classList.add("is-active")
        }
      }
    },
    highlightCategory: function(categoryKey) {
      if (!categoryKey) return;
      var o = window.location.pathname.replace(/\/$/, "");
      for (var g = document.querySelectorAll(".prod-dropdown-item.is-active"), b = 0; b < g.length; b++) g[b].classList.remove("is-active");
      for (var w = document.querySelectorAll(".prod-dropdown-item"), m = 0; m < w.length; m++) {
        var label = w[m].getAttribute("data-i18n") || "";
        if (label === categoryKey) {
          w[m].classList.add("is-active");
          break;
        }
      }
    }
  }, document.addEventListener("spa:load", function() {
    document.querySelector("header") || i();
    var e = document.getElementById("mobile-header");
    e && e.classList.remove("header-hidden"), setTimeout(function() { window.SlideMenu && (window.SlideMenu.initToggle && window.SlideMenu.initToggle(), window.SlideMenu.initSmartHeader && window.SlideMenu.initSmartHeader()) }, 0)
  })
}(window);