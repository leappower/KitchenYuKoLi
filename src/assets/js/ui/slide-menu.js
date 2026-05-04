! function(e) {
  "use strict";
  var o = null;

  function t(e) {
    return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  function i() {
    if (!document.getElementById("mobile-menu-styles")) {
      var e = document.createElement("style");
      e.id = "mobile-menu-styles", e.textContent = [".mobile-menu-overlay {", "  position: fixed; inset: 0;", "  background: rgba(0,0,0,.4);", "  z-index: 900;", "  opacity: 0; visibility: hidden;", "  transition: opacity .3s ease, visibility 0s .3s;", "}", ".mobile-menu-overlay.is-open {", "  opacity: 1; visibility: visible;", "  transition: opacity .3s ease, visibility 0s 0s;", "}", ".mobile-menu-panel {", "  position: fixed; top: 0; left: 0; bottom: 0;", "  width: 85%; max-width: 360px; min-width: 280px;", "  background: rgba(246,246,248,.98);", "  backdrop-filter: blur(40px) saturate(200%);", "  -webkit-backdrop-filter: blur(40px) saturate(200%);", "  z-index: 910;", "  transform: translateX(-100%);", "  transition: transform .35s cubic-bezier(.32,.72,0,1);", "  overflow-y: auto; -webkit-overflow-scrolling: touch;", "  box-shadow: 4px 0 24px rgba(0,0,0,.08);", "}", ".mobile-menu-panel.is-open { transform: translateX(0); }", "html.dark .mobile-menu-panel {", "  background: rgba(44,44,46,.98);", "  box-shadow: 4px 0 24px rgba(0,0,0,.3);", "}", ".mobile-menu-header {", "  display: flex; align-items: center; justify-content: space-between;", "  padding: 16px 20px;", "  border-bottom: .5px solid rgba(60,60,67,.12);", "}", "html.dark .mobile-menu-header { border-color: rgba(235,235,245,.15); }", ".mobile-menu-logo img { width: 32px; height: 32px; object-fit: contain; }", ".mobile-menu-close {", "  display: flex; align-items: center; justify-content: center;", "  width: 36px; height: 36px; border-radius: 50%; border: none;", "  background: rgba(60,60,67,.08); cursor: pointer;", "  -webkit-tap-highlight-color: transparent;", "}", "html.dark .mobile-menu-close { background: rgba(235,235,245,.12); }", ".mobile-menu-close .material-symbols-outlined {", "  font-size: 20px; color: rgba(60,60,67,.8);", "}", "html.dark .mobile-menu-close .material-symbols-outlined { color: rgba(235,235,245,.8); }", ".mobile-menu-l1 {", "  display: flex; align-items: center; gap: 12px;", "  padding: 14px 20px;", "  font-size: 17px; font-weight: 600;", "  color: #1d1d1f; text-decoration: none;", "  -webkit-tap-highlight-color: transparent;", "  border-bottom: .5px solid rgba(60,60,67,.08);", "}", "html.dark .mobile-menu-l1 { color: #f5f5f7; }", "html.dark .mobile-menu-l1 { border-color: rgba(235,235,245,.08); }", ".mobile-menu-l1:active { background: rgba(236,91,19,.06); }", "html.dark .mobile-menu-l1:active { background: rgba(236,91,19,.10); }", ".mobile-menu-l1-icon {", "  width: 28px; height: 28px; border-radius: 7px;", "  background: rgba(236,91,19,.10);", "  display: flex; align-items: center; justify-content: center; flex-shrink: 0;", "}", "html.dark .mobile-menu-l1-icon { background: rgba(236,91,19,.18); }", ".mobile-menu-l1-icon .material-symbols-outlined { font-size: 18px; color: #ec5b13; }", ".mobile-menu-l1-label { flex: 1; min-width: 0; }", ".mobile-menu-l1-arrow {", "  font-size: 20px; color: rgba(60,60,67,.3); flex-shrink: 0;", "  transition: transform .3s cubic-bezier(.32,.72,0,1);", "}", "html.dark .mobile-menu-l1-arrow { color: rgba(235,235,245,.25); }", ".mobile-menu-l1.is-expanded .mobile-menu-l1-arrow {", "  transform: rotate(90deg);", "}", ".mobile-menu-l2 {", "  max-height: 0; overflow: hidden;", "  transition: max-height .35s cubic-bezier(.32,.72,0,1);", "  background: rgba(0,0,0,.02);", "}", "html.dark .mobile-menu-l2 { background: rgba(0,0,0,.15); }", ".mobile-menu-l2.is-open { max-height: 600px; }.mobile-menu-l2-separator{height:.5px;background:rgba(60,60,67,.12);margin:8px 20px 8px 60px}html.dark .mobile-menu-l2-separator{background:rgba(235,235,245,.15)}.mobile-menu-l2-emoji{margin-left:auto;font-size:14px;line-height:1;opacity:.85;flex-shrink:0}", ".mobile-menu-l2-item {", "  display: flex; align-items: center; gap: 12px;", "  padding: 12px 20px 12px 60px;", "  font-size: 15px; font-weight: 400;", "  color: #1d1d1f; text-decoration: none;", "  -webkit-tap-highlight-color: transparent;", "}", "html.dark .mobile-menu-l2-item { color: #f5f5f7; }", ".mobile-menu-l2-item:active { background: rgba(236,91,19,.06); }", "html.dark .mobile-menu-l2-item:active { background: rgba(236,91,19,.10); }", ".mobile-menu-l2-viewall .mobile-menu-l2-icon { color: var(--color-primary, #ec5b13); }", ".mobile-menu-l2-viewall:active .mobile-menu-l2-label { color: var(--color-primary, #ec5b13); }", ".mobile-menu-l2-icon {", "  width: 24px; height: 24px; border-radius: 6px;", "  background: rgba(236,91,19,.08);", "  display: flex; align-items: center; justify-content: center; flex-shrink: 0;", "}", "html.dark .mobile-menu-l2-icon { background: rgba(236,91,19,.14); }", ".mobile-menu-l2-icon .material-symbols-outlined { font-size: 14px; color: #ec5b13; }", ".mobile-menu-l2-label { flex: 1; min-width: 0; text-decoration: underline; text-underline-offset: 4px; text-decoration-color: rgba(60,60,67,.15); text-decoration-thickness: 1px; transition: text-decoration-color .2s, text-decoration-thickness .2s; }", ".mobile-menu-l2-item:active .mobile-menu-l2-label { text-decoration-color: rgba(60,60,67,.35); }", ".mobile-menu-l2-item.is-active .mobile-menu-l2-label { text-decoration: underline; text-decoration-style: solid; text-decoration-color: var(--color-primary, #ec5b13); text-decoration-thickness: 2px; }", ".mobile-menu-badge {", "  display: inline-flex; align-items: center; padding: 2px 7px;", "  font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;", "  background: #ec5b13; color: #fff; border-radius: 20px; flex-shrink: 0; line-height: 1.4;", "}", ".mobile-menu-l2-item.is-whatsapp .mobile-menu-l2-icon { background: rgba(37,211,102,.12); }", "html.dark .mobile-menu-l2-item.is-whatsapp .mobile-menu-l2-icon { background: rgba(37,211,102,.20); }", ".mobile-menu-l2-item.is-whatsapp .mobile-menu-l2-icon .material-symbols-outlined { color: #25d366; }", ".mobile-menu-l2-item.is-active { color: var(--color-primary, #ec5b13); font-weight: 600; }", ".mobile-menu-l2-item.is-active .mobile-menu-l2-icon { background: rgba(236,91,19,.20); }", "html.dark .mobile-menu-l2-item.is-active { color: #ff8c5a; }", "html.dark .mobile-menu-l2-item.is-active .mobile-menu-l2-icon { background: rgba(236,91,19,.25); }", ".mobile-menu-cta-bar {", "  position: fixed; bottom: 0; left: 0; right: 0;", "  padding: 12px 16px calc(12px + env(safe-area-inset-bottom)) 16px;", "  background: rgba(246,246,248,.98);", "  backdrop-filter: blur(40px) saturate(200%);", "  -webkit-backdrop-filter: blur(40px) saturate(200%);", "  border-top: .5px solid rgba(60,60,67,.12);", "  display: flex; gap: 12px;", "  z-index: 920;", "}", "html.dark .mobile-menu-cta-bar {", "  background: rgba(44,44,46,.98);", "  border-color: rgba(235,235,245,.15);", "}", ".mobile-menu-cta-btn {", "  flex: 1;", "  display: flex; align-items: center; justify-content: center; gap: 8px;", "  padding: 14px; border-radius: 12px; border: none;", "  font-size: 15px; font-weight: 600; cursor: pointer;", "  -webkit-tap-highlight-color: transparent;", "  text-decoration: none;", "  transition: all .15s ease;", "}", ".mobile-menu-cta-btn.primary {", "  background: #ec5b13; color: #fff;", "}", ".mobile-menu-cta-btn.primary:hover, .mobile-menu-cta-btn.primary:active {", "  background: #d54f0f;", "}", ".mobile-menu-cta-btn.secondary {", "  background: rgba(236,91,19,.10); color: #ec5b13;", "}", "html.dark .mobile-menu-cta-btn.secondary {", "  background: rgba(236,91,19,.18); color: #ff8c5a;", "}", ".mobile-menu-cta-btn.secondary:hover, .mobile-menu-cta-btn.secondary:active {", "  background: rgba(236,91,19,.20); color: #d54f0f;", "}", "html.dark .mobile-menu-cta-btn.secondary:hover, html.dark .mobile-menu-cta-btn.secondary:active {", "  background: rgba(236,91,19,.25); color: #ff9f70;", "}", ".mobile-menu-cta-btn .material-symbols-outlined { font-size: 20px; }", "/* Add padding to panel content to account for fixed CTA bar */", ".mobile-menu-panel { padding-bottom: 100px !important; }", "#mobile-header.header-hidden { transform: translateY(-100%); }", ".mobile-search-overlay {", "  position: fixed; inset: 0;", "  background: rgba(246,246,248,.98);", "  backdrop-filter: blur(40px) saturate(200%);", "  -webkit-backdrop-filter: blur(40px) saturate(200%);", "  z-index: 950;", "  opacity: 0; visibility: hidden;", "  transition: opacity .2s ease, visibility 0s .2s;", "  overflow-y: auto; -webkit-overflow-scrolling: touch;", "}", ".mobile-search-overlay.is-open {", "  opacity: 1; visibility: visible;", "  transition: opacity .2s ease, visibility 0s 0s;", "}", "html.dark .mobile-search-overlay {", "  background: rgba(28,28,30,.98);", "}", ".mobile-search-bar {", "  display: flex; align-items: center; gap: 10px;", "  padding: 12px 16px; position: sticky; top: 0;", "  background: rgba(246,246,248,.95);", "  backdrop-filter: blur(20px);", "  -webkit-backdrop-filter: blur(20px);", "  border-bottom: .5px solid rgba(60,60,67,.10);", "}", "html.dark .mobile-search-bar {", "  background: rgba(28,28,30,.95);", "  border-color: rgba(235,235,245,.10);", "}", ".mobile-search-icon {", "  font-size: 22px; color: rgba(60,60,67,.5); flex-shrink: 0;", "}", "html.dark .mobile-search-icon { color: rgba(235,235,245,.5); }", ".mobile-search-input {", "  flex: 1; background: transparent; border: none; outline: none;", "  font-size: 17px; color: #1d1d1f; font-family: inherit; line-height: 1.4;", "  -webkit-appearance: none; min-width: 0;", "}", ".mobile-search-input::placeholder { color: rgba(60,60,67,.4); }", "html.dark .mobile-search-input { color: #f5f5f7; }", "html.dark .mobile-search-input::placeholder { color: rgba(235,235,245,.35); }", ".mobile-search-input::-webkit-search-cancel-button { display: none; }", ".mobile-search-clear {", "  display: none; align-items: center; justify-content: center;", "  width: 28px; height: 28px; border-radius: 50%; border: none;", "  background: rgba(120,120,128,.2); cursor: pointer; flex-shrink: 0;", "}", ".mobile-search-clear.is-visible { display: flex; }", ".mobile-search-clear .material-symbols-outlined { font-size: 18px; color: rgba(60,60,67,.6); }", "html.dark .mobile-search-clear { background: rgba(255,255,255,.15); }", "html.dark .mobile-search-clear .material-symbols-outlined { color: rgba(235,235,245,.6); }", ".mobile-search-results { padding: 8px; }", ".mobile-search-result-item {", "  display: flex; align-items: center; gap: 12px;", "  padding: 12px 8px; border-radius: 12px;", "  text-decoration: none; color: inherit;", "  -webkit-tap-highlight-color: transparent;", "}", ".mobile-search-result-item:active { background: rgba(236,91,19,.06); }", "html.dark .mobile-search-result-item:active { background: rgba(236,91,19,.10); }", ".mobile-search-result-img {", "  width: 48px; height: 48px; border-radius: 10px;", "  background: rgba(120,120,128,.08); flex-shrink: 0;", "  display: flex; align-items: center; justify-content: center; overflow: hidden;", "}", ".mobile-search-result-img img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }", ".mobile-search-result-img .material-symbols-outlined { font-size: 24px; color: rgba(60,60,67,.25); }", "html.dark .mobile-search-result-img { background: rgba(255,255,255,.06); }", "html.dark .mobile-search-result-img .material-symbols-outlined { color: rgba(235,235,245,.2); }", ".mobile-search-result-info { flex: 1; min-width: 0; }", ".mobile-search-result-name {", "  font-size: 15px; font-weight: 600; color: #1d1d1f; line-height: 1.3;", "}", "html.dark .mobile-search-result-name { color: #f5f5f7; }", ".mobile-search-result-meta {", "  display: flex; align-items: center; gap: 4px; margin-top: 2px;", "}", ".mobile-search-result-meta span { font-size: 12px; color: rgba(60,60,67,.5); }", "html.dark .mobile-search-result-meta span { color: rgba(235,235,245,.4); }", ".mobile-search-result-sep { color: rgba(60,60,67,.25) !important; }", "html.dark .mobile-search-result-sep { color: rgba(235,235,245,.15) !important; }", ".mobile-search-empty {", "  text-align: center; padding: 40px 16px;", "}", ".mobile-search-empty .material-symbols-outlined {", "  font-size: 36px; color: rgba(60,60,67,.15); margin-bottom: 8px;", "}", ".mobile-search-empty p {", "  font-size: 14px; color: rgba(60,60,67,.5); margin: 0;", "}", "html.dark .mobile-search-empty .material-symbols-outlined { color: rgba(235,235,245,.1); }", "html.dark .mobile-search-empty p { color: rgba(235,235,245,.4); }"].join("\n"), document.head.appendChild(e)
    }
  }
  var a = null,
    n = null;

  function l() {
    n || (i(), (a = document.createElement("div")).className = "mobile-menu-overlay", a.id = "mobile-menu-overlay", (n = document.createElement("div")).className = "mobile-menu-panel", n.id = "mobile-menu-panel", n.innerHTML = '<div class="mobile-menu-header"><a class="mobile-menu-logo" href="' + (window.BASE_PATH || "") + '/home/"><img src="' + (window.BASE_PATH || "") + '/assets/images/logo_footer.webp" alt="Yukoli" width="32" height="32" /></a><button id="mobile-menu-close" type="button" class="mobile-menu-close" aria-label="Close menu"><span class="material-symbols-outlined">close</span></button></div>' + function() {
      if (o) return o;
      var e;
      if ("undefined" != typeof NAV_CONFIG && NAV_CONFIG.mainNav) {
        var t = {
          products: "products",
          applications: "applications",
          support: "support",
          about: "about",
          contact: "contact"
        };
        e = NAV_CONFIG.mainNav.map(function(e) {
          var o = [],
            i = t[e.id];
          return i && NAV_CONFIG.dropdowns && NAV_CONFIG.dropdowns[i] && (o = NAV_CONFIG.dropdowns[i]), {
            key: e.key,
            href: e.path,
            id: e.id,
            icon: "products" === e.id ? "kitchen" : "applications" === e.id ? "apps" : "support.*? "support_agent" : "support" === e.id ? "support_agent" : "about" === e.id ? "info" : "mail",
            children: function(e, o) {
              var t = o.map(function(e) {
                return {
                  key: e.key,
                  icon: e.icon,
                  href: e.href || e.path || "/",
                  badge: e.badge,
                  emoji: e.emoji || ""
                }
              });
              return "applications" === e.id && t.length > 5 && (t[5]._separator = !0), t
            }(e, o)
          }
        })
      } else e = [{
        key: "nav_products",
        href: "/products/",
        id: "products",
        icon: "kitchen",
        children: []
      }, {
        key: "nav_applications",
        href: "/applications/",
        id: "applications",
        icon: "apps",
        children: []
      }, {
        href: "/cases/",
        id: "cases",
        icon: "cases",
        children: []
      }, {
        href: "/profit-calculator/",
        id: "profit-calculator",
        icon: "calculate",
        children: []
      }, {
        key: "nav_service",
        href: "/support/",
        id: "support",
        icon: "support_agent",
        children: []
      }, {
        key: "nav_about",
        href: "/about/",
        id: "about",
        icon: "info",
        children: []
      }, {
        key: "nav_contact",
        href: "/contact/",
        id: "contact",
        icon: "mail",
        children: []
      }];
      return console.log("[mobile-menu] getMenuItems(): NAV_CONFIG=" + ("undefined" != typeof NAV_CONFIG) + " items=" + e.length + " children=[" + e.map(function(e) {
        return e.id + ":" + e.children.length
      }).join(",") + "]"), o = e, e
    }().map(function(e) {
      var o = "";
      if (e.children && e.children.length > 0) {
        var A = location.pathname.replace(/\/$/, ""), k = "", N = 0; e.children.forEach(function(e) { var h = e.href.replace(/\/$/, ""); if (A === h) { k = e.href; N = h.length } else if (A.indexOf(h + "/") === 0 && h.length > N) { k = e.href; N = h.length } });
        var i = e.children.map(function(e) {
          var o = e.isWhatsApp ? " is-whatsapp" : "",
            i = e.badge ? '<span class="mobile-menu-badge" data-i18n="nav_roi_badge">HOT</span>' : "",
            a = e.isWhatsApp ? ' target="_blank" rel="noopener noreferrer"' : "";
          return e._separator ? '<div class="mobile-menu-l2-separator"></div>' : '<a href="' + t(e.href) + '" class="mobile-menu-l2-item' + o + (e.href === k ? " is-active" : "") + '"' + a + '><span class="mobile-menu-l2-icon"><span class="material-symbols-outlined">' + t(e.icon) + '</span></span><span class="mobile-menu-l2-label" data-i18n="' + t(e.key) + '">' + t(e.key) + "</span>" + (e.emoji ? '<span class="mobile-menu-l2-emoji">' + t(e.emoji) + "</span>" : "") + i + "</a>"
        }).join("\n");
        o = '<div class="mobile-menu-l2" data-menu-l2="' + t(e.id) + '">' + i, "products" === e.id && (o += '<a class="mobile-menu-l2-item mobile-menu-l2-viewall" href="/products/"><span class="mobile-menu-l2-icon"><span class="material-symbols-outlined">grid_view</span></span><span class="mobile-menu-l2-label" data-i18n="nav_mega_view_all">查看全部产品</span></a>'), o += "</div>"
      }
      return '<div class="mobile-menu-l1-wrap"><button class="mobile-menu-l1" data-menu-toggle="' + t(e.id) + '" type="button"><span class="mobile-menu-l1-icon"><span class="material-symbols-outlined">' + t(e.icon) + '</span></span><span class="mobile-menu-l1-label" data-i18n="' + t(e.key) + '">' + t(e.key) + '</span><span class="material-symbols-outlined mobile-menu-l1-arrow">chevron_right</span></button>' + o + "</div>"
    }).join("\n") + '<div class="mobile-menu-cta-bar"><a class="mobile-menu-cta-btn secondary" href="/contact/" data-nav="/contact/"><span class="material-symbols-outlined">mail</span><span data-i18n="btn_contact_us">Contact Us</span></a><a class="mobile-menu-cta-btn primary" href="/quote/" data-nav="/quote/"><span class="material-symbols-outlined">request_quote</span><span data-i18n="nav_get_quote">Get Quote</span></a></div>', e.translationManager && n.querySelectorAll("[data-i18n]").forEach(function(o) {
      var t = o.getAttribute("data-i18n"),
        i = e.translationManager.translate(t);
      i && i !== t && (o.textContent = i)
    }), document.body.appendChild(a), document.body.appendChild(n), document.body.style.overflow = "hidden", requestAnimationFrame(function() {
      a.classList.add("is-open"), n.classList.add("is-open"), navigator.vibrate && navigator.vibrate(10)
    }), function() {
      var o = document.getElementById("mobile-menu-close");
      o && o.addEventListener("click", function(e) {
        e.preventDefault(), r()
      }), a.addEventListener("click", r);
      var t = n.querySelector(".mobile-menu-logo");
      t && t.addEventListener("click", function() {
        r()
      });
      for (var i = n.querySelectorAll("[data-menu-toggle]"), l = 0; l < i.length; l++) i[l].addEventListener("click", function(e) {
        var o = this.getAttribute("data-menu-toggle"),
          t = n.querySelector('[data-menu-l2="' + o + '"]');
        if (t) {
          for (var i = this.classList.contains("is-expanded"), a = n.querySelectorAll("[data-menu-toggle].is-expanded"), l = 0; l < a.length; l++)
            if (a[l] !== this) {
              a[l].classList.remove("is-expanded");
              var r = a[l].getAttribute("data-menu-toggle"),
                s = n.querySelector('[data-menu-l2="' + r + '"]');
              s && s.classList.remove("is-open")
            } i ? (this.classList.remove("is-expanded"), t.classList.remove("is-open")) : (this.classList.add("is-expanded"), t.classList.add("is-open")), navigator.vibrate && navigator.vibrate(8)
        }
      });
      for (var s = n.querySelectorAll(".mobile-menu-l2-item"), c = 0; c < s.length; c++) s[c].addEventListener("click", function(o) {
        var t = this.getAttribute("href");
        this.classList.contains("is-whatsapp") ? r() : (r(), t && e.SpaRouter && (o.preventDefault(), e.SpaRouter.navigate(t)))
      });
      for (var m = n.querySelectorAll(".mobile-menu-l1"), d = 0; d < m.length; d++) m[d].addEventListener("click", function(e) {
        var o = this.getAttribute("data-menu-toggle"),
          t = n.querySelector('[data-menu-l2="' + o + '"]');
        t && 0 !== t.children.length || r()
      });
      for (var b = n.querySelectorAll(".mobile-menu-cta-btn[data-nav]"), u = 0; u < b.length; u++) b[u].addEventListener("click", function(o) {
        var t = this.getAttribute("href") || this.getAttribute("data-nav");
        r(), t && e.SpaRouter && (o.preventDefault(), e.SpaRouter.navigate(t))
      })
    }())
  }

  function r() {
    n && (a.classList.remove("is-open"), n.classList.remove("is-open"), setTimeout(function() {
      a && a.parentNode && a.parentNode.removeChild(a), n && n.parentNode && n.parentNode.removeChild(n), a = null, n = null, document.body.style.overflow = ""
    }, 350))
  }
  var s = 0,
    c = null,
    m = !1;

  function d() {
    s = 0;
    if (c = document.getElementById("mobile-header")) {
      var e = document.querySelector('navigator[data-variant="tablet"]'),
        o = !(!e || !e.parentNode) || window.innerWidth >= 768 && window.innerWidth < 1280;
      if (console.log("[mobile-menu] initSmartHeader: isTablet=", o, "innerWidth=", window.innerWidth), o) return console.log("[mobile-menu] Tablet mode — smart header hide disabled, header stays visible"), void c.classList.remove("header-hidden");
      window.removeEventListener("scroll", b), window.addEventListener("scroll", b, {
        passive: !0
      }), c.classList.remove("header-hidden"), console.log("[mobile-menu] Smart header scroll listener attached (mobile mode)")
    } else console.log("[mobile-menu] initSmartHeader: no #mobile-header found")
  }

  function b() {
    m || (m = !0, requestAnimationFrame(function() {
      var e = window.pageYOffset || document.documentElement.scrollTop;
      e > 50 && e > s ? (console.log("[mobile-menu] onScroll: hiding header, currentY=", e, "lastScrollY=", s), c.classList.add("header-hidden")) : (c.classList.contains("header-hidden") && console.log("[mobile-menu] onScroll: showing header, currentY=", e, "lastScrollY=", s), c.classList.remove("header-hidden")), s = e, m = !1
    }))
  }
  var u = !1,
    p = !1,
    g = null,
    h = null,
    f = null;

  function v() {
    var e = document.getElementById("mobile-menu-toggle");
    if (console.log("[mobile-menu] initToggle: toggleBtn=", !!e, "| _toggleBound=", u, "| _lastToggleBtn=", f === e), u && e === f) console.log("[mobile-menu] initToggle: already bound to this button, skipping");
    else {
      if (u && g && f && f !== e) {
        try {
          f.removeEventListener("click", g)
        } catch (e) {}
        console.log("[mobile-menu] initToggle: removed old handler from previous button")
      }
      e ? (u = !0, f = e, g = function(e) {
        e.preventDefault(), e.stopPropagation(), l()
      }, e.addEventListener("click", g), console.log("[mobile-menu] initToggle: bound click to toggleBtn")) : console.log("[mobile-menu] initToggle: #mobile-menu-toggle NOT FOUND in DOM");
      var o = document.getElementById("mobile-search-toggle");
      o && !p ? (p = !0, h = function(e) {
        e.preventDefault(), e.stopPropagation(), document.getElementById("mobile-search-overlay") ? w() : k()
      }, o && o.addEventListener("click", h)) : o || (p = !1)
    }
  }
  var y = null,
    x = null;

  function k() {
    if ((y = document.createElement("div")).id = "mobile-search-overlay", y.className = "mobile-search-overlay", y.innerHTML = '<div class="mobile-search-bar"><span class="material-symbols-outlined mobile-search-icon">search</span><input type="search" id="mobile-search-input" class="mobile-search-input" placeholder="Search..." data-i18n-placeholder="search_placeholder" autocomplete="off" spellcheck="false" /><button id="mobile-search-clear" type="button" class="mobile-search-clear" aria-label="Clear"><span class="material-symbols-outlined">cancel</span></button></div><div id="mobile-search-results" class="mobile-search-results"></div>', document.body.appendChild(y), document.body.style.overflow = "hidden", e.translationManager) {
      var o = y.querySelector("[data-i18n-placeholder]");
      if (o) {
        var t = o.getAttribute("data-i18n-placeholder"),
          i = e.translationManager.translate(t);
        i && i !== t && (o.placeholder = i)
      }
    }
    requestAnimationFrame(function() {
      y.classList.add("is-open"), (x = document.getElementById("mobile-search-input")) && (x.focus(), x.addEventListener("input", L), x.addEventListener("keydown", E));
      var e = document.getElementById("mobile-search-clear");
      e && e.addEventListener("click", function() {
        x && (x.value = "", L(), x.focus())
      }), y.addEventListener("click", function(e) {
        e.target === y && w()
      })
    })
  }

  function w() {
    y && (y.classList.remove("is-open"), setTimeout(function() {
      y && y.parentNode && y.parentNode.removeChild(y), y = null, x = null, document.body.style.overflow = ""
    }, 300))
  }
  var _ = null;

  function L() {
    if (x) {
      clearTimeout(_);
      var o = x.value.trim(),
        i = document.getElementById("mobile-search-clear");
      if (i && (o.length > 0 ? i.classList.add("is-visible") : i.classList.remove("is-visible")), o.length < 1) {
        var a = document.getElementById("mobile-search-results");
        a && (a.innerHTML = "")
      } else _ = setTimeout(function() {
        var i = [];
        e.ProductSearchEngine && "function" == typeof e.ProductSearchEngine.search && (i = e.ProductSearchEngine.search(o)),
          function(o) {
            var i = document.getElementById("mobile-search-results");
            if (i)
              if (o && 0 !== o.length) {
                for (var a = "", n = 0; n < o.length; n++) {
                  var l = o[n],
                    r = (l._displayName || l._displayCategory + " " + l.model).replace(/</g, "&lt;").replace(/>/g, "&gt;"),
                    s = (l.model || "").replace(/</g, "&lt;"),
                    c = (l._displayCategory || l.category || "").replace(/</g, "&lt;"),
                    m = l.productImage || l.imageUrl || "";
                  a += '<a class="mobile-search-result-item" href="/products/"><div class="mobile-search-result-img">' + (m ? '<img src="' + m + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '<span class="material-symbols-outlined">inventory_2</span>') + '</div><div class="mobile-search-result-info"><div class="mobile-search-result-name">' + r + '</div><div class="mobile-search-result-meta"><span>' + s + '</span><span class="mobile-search-result-sep">·</span><span>' + c + "</span></div></div></a>"
                }
                i.innerHTML = a;
                for (var d = i.querySelectorAll(".mobile-search-result-item"), b = 0; b < d.length; b++) d[b].addEventListener("click", function() {
                  w()
                })
              } else {
                var u = e.CommonUtils && e.CommonUtils.tr || e.t,
                  p = u ? u("search_no_results", "No matching products found") : "No matching products found";
                i.innerHTML = '<div class="mobile-search-empty"><span class="material-symbols-outlined">search_off</span><p>' + t(p) + "</p></div>"
              }
          }(i)
      }, 200)
    }
  }

  function E(e) {
    "Escape" === e.key && w()
  }
  document.addEventListener("spa:load", function() {
    r(), f = null, u = !1, p = !1, v(), d()
  }), i(), "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", function() {
    v(), d()
  }) : (v(), d()), window.addEventListener("pageshow", function(e) {
    e.persisted && (r(), v(), d())
  }), e.SlideMenu = {
    open: l,
    close: r,
    initToggle: v,
    openMobileSearch: k,
    closeMobileSearch: w
  }
}(window);