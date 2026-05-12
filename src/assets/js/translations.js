!(function (t) {
  "use strict";
  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }
  var e,
    n,
    a =
      ((e = (t.location && t.location.hostname) || ""),
      (n = (t.location && t.location.port) || ""),
      "localhost" === e ||
        "127.0.0.1" === e ||
        -1 !== ["8080", "3000", "3001", "5000", "9000"].indexOf(n) ||
        !!/\b(test|staging|preview|dev|internal|local)\b/.test(e.toLowerCase())),
    getO = function () {
      return t.LANG_REGISTRY && t.LANG_REGISTRY.getNativeNames ? t.LANG_REGISTRY.getNativeNames() : {};
    };

  function r() {
    ((this.currentLanguage = this.getInitialLanguage()),
      (this.translationsCache = new Map()),
      (this.pendingLoads = new Map()),
      (this.keyPathCache = new Map()),
      (this.isInitialized = !1),
      (this.eventListeners = new Map()),
      (this.dropdownEl = null));
    var e = t.LANG_REGISTRY && t.LANG_REGISTRY.LANGUAGES ? t.LANG_REGISTRY.LANGUAGES : [];
    this.languages = e.map(function (t) {
      return {
        code: t.code,
        name: t.nativeName,
      };
    });
  }

  function i(t, e, n) {
    return (
      (e = e || 1e4),
      (n = n || "Translation loading timeout"),
      Promise.race([
        t,
        new Promise(function (t, a) {
          setTimeout(function () {
            a(new Error(n));
          }, e);
        }),
      ])
    );
  }
  ((r.prototype.getInitialLanguage = function () {
    var t = localStorage.getItem("userLanguage");
    return t && getO()[t] ? t : "en";
  }),
    (r.prototype.loadTranslations = function (t) {
      if (
        this.translationsCache.has(t) &&
        this.translationsCache.has("ui-" + t) &&
        this.translationsCache.has("product-" + t)
      )
        return Promise.resolve(this.translationsCache.get(t));
      if (this.pendingLoads.has(t)) return this.pendingLoads.get(t);
      var e = this,
        n = this.fetchTranslations(t);
      return (
        this.pendingLoads.set(t, n),
        n.finally(function () {
          e.pendingLoads.delete(t);
        })
      );
    }),
    (r.prototype.fetchTranslations = function (t) {
      var e = this;
      return this.loadUITranslations(t)
        .then(function (n) {
          return e.loadProductTranslations(t).then(function (a) {
            var o = e.mergeTranslations(n, a);
            return (e.translationsCache.set(t, o), o);
          });
        })
        .catch(function (n) {
          if ((console.error("Failed to load translations for " + t + ":", n), "en" !== t))
            return e.loadTranslations("en");
          throw n;
        });
    }),
    (r.prototype.loadUITranslations = function (t) {
      var e = "ui-" + t;
      if (this.translationsCache.has(e)) return Promise.resolve(this.translationsCache.get(e));
      var n = "yukoli-translations-" + e,
        o = null;
      if (!a)
        try {
          var r = localStorage.getItem(n);
          if (r) {
            var s = JSON.parse(r);
            if (s && "object" == typeof s && s.data && "object" == typeof s.data) {
              if (s.timestamp && Date.now() - s.timestamp < 864e5 && s._v === 2)
                return ((o = s.data), this.translationsCache.set(e, o), Promise.resolve(o));
              localStorage.removeItem(n);
            } else (console.warn("[i18n] Invalid cache structure for " + t + ", clearing"), localStorage.removeItem(n));
          }
        } catch (e) {
          console.warn("[i18n] Failed to read localStorage cache for " + t + ":", e.message);
          try {
            localStorage.removeItem(n);
          } catch (t) {}
        }
      var l = this;
      if ("function" != typeof fetch)
        return "en" !== t ? l.loadUITranslations("en") : Promise.reject(new Error("fetch not available"));
      var u = ("undefined" != typeof window && window.BASE_PATH) || "";
      return i(
        fetch(u + "/assets/lang/" + t + "-ui.json", {
          cache: a ? "no-store" : "default",
        })
          .then(function (t) {
            if (!t.ok) throw new Error("HTTP " + t.status + ": " + t.statusText);
            return t.json();
          })
          .then(function (t) {
            var o = l.normalizeTranslationKeys(t);
            if ((l.translationsCache.set(e, o), !a))
              try {
                localStorage.setItem(
                  n,
                  JSON.stringify({
                    timestamp: Date.now(),
                    _v: 2,
                    data: o,
                  })
                );
              } catch (t) {}
            return o;
          })
          .catch(function (e) {
            if ((console.error("[i18n] loadUITranslations: FAILED for " + t + ":", e), "en" !== t))
              return l.loadUITranslations("en");
            throw e;
          }),
        15e3,
        "[i18n] loadUITranslations timeout for " + t
      );
    }),
    (r.prototype.loadProductTranslations = function (lang) {
      var e = "product-" + lang;
      if (this.translationsCache.has(e)) return Promise.resolve(this.translationsCache.get(e));
      var n = this;
      // Extract product translations from the already-loaded PRODUCT_DATA_TABLE
      // (translations are embedded as nameEn, specificationsEn, etc. on each product)
      return Promise.resolve().then(function () {
        var suffix =
          lang.charAt(0).toUpperCase() +
          lang.slice(1).replace(/-([a-z])/g, function (m, c) {
            return c.toUpperCase();
          });
        var table = window.PRODUCT_DATA_TABLE || [];
        var map = {};
        var fields = [
          "name",
          "specifications",
          "usage",
          "throughput",
          "material",
          "sub_category",
          "tier",
          "badge",
          "control_method",
          "product_dimensions",
          "color",
        ];
        table.forEach(function (cat) {
          var prods = cat.products || [];
          prods.forEach(function (p) {
            var pid = p._productId || p.id;
            if (!pid) return;
            var entry = {};
            fields.forEach(function (f) {
              var val = p[f + suffix];
              if (val) entry[f] = val;
            });
            if (Object.keys(entry).length > 0) map[pid] = entry;
          });
        });
        if (Object.keys(map).length === 0 && lang !== "zh-CN") {
          console.warn("[i18n] loadProductTranslations: no embedded translations for " + lang);
        }
        n.translationsCache.set(e, map);
        window._productTranslations = map;
        return map;
      });
    }),
    (r.prototype.mergeTranslations = function (t, e) {
      return Object.assign({}, t, e);
    }),
    (r.prototype.normalizeTranslationKeys = function (t) {
      if (Array.isArray(t)) return t.map(this.normalizeTranslationKeys.bind(this));
      if (!t || "object" != typeof t) return t;
      var e = {},
        n = this;
      return (
        Object.keys(t).forEach(function (a) {
          var o = "string" == typeof a ? a.replace(/^\uFEFF/, "") : a;
          e[o] = n.normalizeTranslationKeys(t[a]);
        }),
        e
      );
    }),
    (r.prototype.resolveTranslationValue = function (t, e) {
      if (!t || !e) return e;
      for (var n = this.getKeyPath(e), a = t, o = 0; o < n.length; o++) a = a ? a[n[o]] : void 0;
      // Return resolved value (including empty string for skeleton keys)
      // so caller can distinguish "found but empty" from "key not found"
      return a !== void 0 ? a : e;
    }),
    (r.prototype.getKeyPath = function (t) {
      return (this.keyPathCache.has(t) || this.keyPathCache.set(t, t.split(".")), this.keyPathCache.get(t));
    }),
    (r.prototype.getDropdown = function () {
      return (
        (this.dropdownEl && document.contains(this.dropdownEl)) ||
          (this.dropdownEl = document.getElementById("language-dropdown")),
        this.dropdownEl
      );
    }),
    (r.prototype.setElementTranslation = function (t, e) {
      if ("INPUT" !== t.tagName && "TEXTAREA" !== t.tagName) {
        for (var n = !1, a = 0; a < t.childNodes.length; a++)
          if (3 === t.childNodes[a].nodeType && t.childNodes[a].textContent.trim()) {
            ((t.childNodes[a].textContent = e), (n = !0));
            break;
          }
        n || (t.textContent = e);
      } else t.placeholder !== e && (t.placeholder = e);
    }),
    (r.prototype.translate = function (t) {
      var e = this.translationsCache.get("ui-" + this.currentLanguage);
      if (e) {
        var n = this.resolveTranslationValue(e, t);
        if (n && n !== t) return n;
      }
      var a = this.translationsCache.get("product-" + this.currentLanguage);
      if (a) {
        var o = this.resolveTranslationValue(a, t);
        if (o && o !== t) return o;
      }
      var r = this.translationsCache.get(this.currentLanguage);
      return this.resolveTranslationValue(r, t);
    }),
    (r.prototype.uiText = function (t, e) {
      var n = this.translate(t);
      if (n && n !== t) return n;
      var a = this.getFallbackTranslation(t);
      return a && a !== t ? a : e;
    }),
    (r.prototype.applyTranslations = function () {
      var t = this,
        e = "ui-" + this.currentLanguage;
      return (
        this.translationsCache.has(e)
          ? Promise.resolve(this.translationsCache.get(e))
          : this.loadUITranslations(this.currentLanguage)
      )
        .then(function (e) {
          // Ensure English is cached for fallback before processing
          var ensureEn =
            "en" !== t.currentLanguage && !t.translationsCache.has("ui-en")
              ? t.loadUITranslations("en").catch(function () {})
              : Promise.resolve();
          return ensureEn.then(function () {
            if (e) {
              var n = document.querySelectorAll("[data-i18n]"),
                a = document.querySelectorAll("[data-i18n-placeholder]"),
                r = document.querySelectorAll("[data-i18n-aria]"),
                i = document.getElementById("current-lang-label"),
                s = t.translationsCache.get("product-" + t.currentLanguage) || {},
                l = Object.assign({}, e, s),
                u = function (e) {
                  var n = t.resolveTranslationValue(l, e);
                  return n && n !== e ? n : t.getFallbackTranslation(e);
                },
                c = [];
              if (
                (n.forEach(function (t) {
                  var e = t.getAttribute("data-i18n");
                  // Skip current-lang-label — managed by updateCurrentLanguageLabel
                  if ("current-lang-label" === t.id) return;
                  var n = u(e);
                  n &&
                    n !== e &&
                    c.push({
                      el: t,
                      text: n,
                    });
                }),
                a.forEach(function (t) {
                  var e = t.getAttribute("data-i18n-placeholder"),
                    n = u(e);
                  n &&
                    n !== e &&
                    t.placeholder !== n &&
                    c.push({
                      el: t,
                      placeholder: n,
                    });
                }),
                r.forEach(function (t) {
                  var e = t.getAttribute("data-i18n-aria"),
                    n = u(e);
                  n &&
                    n !== e &&
                    c.push({
                      el: t,
                      ariaLabel: n,
                    });
                }),
                c.length > 0 &&
                  requestAnimationFrame(function () {
                    c.forEach(function (e) {
                      e.text
                        ? t.setElementTranslation(e.el, e.text)
                        : e.placeholder
                          ? (e.el.placeholder = e.placeholder)
                          : e.ariaLabel && e.el.setAttribute("aria-label", e.ariaLabel);
                    });
                  }),
                i)
              ) {
                var g = getO()[t.currentLanguage] || t.currentLanguage.toUpperCase();
                i.textContent !== g && (i.textContent = g);
                var d = document.querySelector(".current-lang-btn-label");
                d && d.textContent !== g && (d.textContent = g);
              }
              (t.updateCurrentLanguageLabel(t.currentLanguage),
                t.refreshCompanyName(e),
                t.refreshDocumentTitle(e),
                t.emit("translationsApplied", {
                  language: t.currentLanguage,
                }));
            } else console.warn("[i18n] applyTranslations: uiTranslations is null/undefined for", t.currentLanguage);
          });
        })
        .catch(function (t) {
          console.error("[i18n] applyTranslations: ERROR:", t);
        });
    }),
    (r.prototype.refreshCompanyName = function (t) {
      var e = (t && t.company_name) || this.getFallbackTranslation("company_name");
      ((e && "company_name" !== e) || "zh-CN" !== this.currentLanguage || (e = "佛山市跃迁力科技有限公司"),
        e &&
          "company_name" !== e &&
          document.querySelectorAll('[data-i18n="company_name"]').forEach(function (t) {
            t.textContent !== e && (t.textContent = e);
          }));
    }),
    (r.prototype.refreshDocumentTitle = function (t) {
      if (document.getElementById("page-title")) {
        var e = (t && t.page_title) || this.getFallbackTranslation("page_title");
        e && "page_title" !== e && document.title !== e && (document.title = e);
      }
    }),
    (r.prototype.getFallbackTranslation = function (t) {
      // 1. 从 en 找（所有骨架语言的唯一 fallback）
      if ("en" !== this.currentLanguage) {
        var en = this.translationsCache.get("ui-en");
        if (en) {
          var v = this.resolveTranslationValue(en, t);
          if (v && v !== t) return v;
        }
      }
      // 2. 返回 key 本身
      return t;
    }),
    (r.prototype.on = function (t, e) {
      (this.eventListeners.has(t) || this.eventListeners.set(t, []), this.eventListeners.get(t).push(e));
    }),
    (r.prototype.emit = function (t, e) {
      (this.eventListeners.get(t) || []).forEach(function (t) {
        t(e);
      });
    }),
    (r.prototype.setLanguage = function (e) {
      var n = this;
      // Idempotent lock: prevent duplicate calls from firing multiple toasts
      if (n._switchingTo === e) return Promise.resolve();
      n._switchingTo = e;
      return (
        getO()[e]
          ? this.currentLanguage === e
            ? ((n._switchingTo = null), this.closeLanguageDropdown(), Promise.resolve())
            : Promise.all([
                this.loadUITranslations(e),
                this.loadProductTranslations(e).catch(function (t) {
                  console.warn("[i18n] setLanguage: product translations for " + e + " failed: " + t.message);
                }),
              ])
                .then(function () {
                  // Ensure English is loaded for fallback (skeleton languages need it)
                  var ensureEn =
                    "en" !== e && !n.translationsCache.has("ui-en")
                      ? n.loadUITranslations("en").catch(function (err) {
                          console.warn("[i18n] en preload failed:", err);
                        })
                      : Promise.resolve();
                  return ensureEn.then(function () {
                    var a = n.currentLanguage;
                    return (
                      (n.currentLanguage = e),
                      localStorage.setItem("userLanguage", e),
                      n.applyTranslations().then(function () {
                        if (
                          ((document.documentElement.lang = e),
                          t.dispatchEvent(
                            new CustomEvent("languageChanged", {
                              detail: {
                                language: e,
                                previousLanguage: a,
                              },
                            })
                          ),
                          n.closeLanguageDropdown(),
                          n.resetLanguageSearch(),
                          t.showNotification)
                        ) {
                          var r = n.uiText("notify_language_changed", "Language changed to");
                          t.showNotification(r + " " + (getO()[e] || e), "success");
                        }
                        n.emit("languageChanged", {
                          language: e,
                          previousLanguage: a,
                        });
                      })
                    );
                  });
                })
                .catch(function (t) {
                  n._switchingTo = null;
                  if ((console.error("[i18n] setLanguage: FAILED for", e, t), "en" !== e)) return n.setLanguage("en");
                })
          : ((n._switchingTo = null), Promise.reject(new Error("Unsupported language: " + e)))
      ).finally(function () {
        n._switchingTo = null;
      });
    }),
    (r.prototype.toggleLanguageDropdown = function (t) {
      t && t.stopPropagation();
      var e = this.getDropdown();
      if ((e || (this.initDropdownContainer(), (e = this.getDropdown())), e)) {
        var n = e.style.display,
          a = e.classList.contains("show");
        "block" === n || a ? this.closeLanguageDropdown() : this.openLanguageDropdown();
      }
    }),
    (r.prototype.initDropdownContainer = function () {
      var t = this,
        e = this.languages || [],
        n = this.currentLanguage || "en";
      if (!document.getElementById("language-dropdown")) {
        if ("undefined" == typeof LanguageDropdownTemplate) {
          console.warn("[i18n] LanguageDropdownTemplate not found, attempting to load dynamically");
          var a = document.createElement("script");
          return (
            (a.src = "/assets/js/translations-dropdown-template.js"),
            (a.onload = function () {
              t.initDropdownContainer();
            }),
            (a.onerror = function () {
              console.error("[i18n] Failed to load LanguageDropdownTemplate");
            }),
            void document.head.appendChild(a)
          );
        }
        var o = LanguageDropdownTemplate.createDropdownHTML(e, n),
          r = document.createElement("div");
        r.innerHTML = o;
        var i = r.firstChild;
        (document.body.appendChild(i),
          (this.dropdownEl = i),
          this.bindDropdownEvents(),
          this.updateCurrentLanguageLabel(n));
      }
    }),
    (r.prototype.updateCurrentLanguageLabel = function (t) {
      // Sync lang-selector <select> value
      var sel = document.getElementById("lang-selector");
      if (sel && sel.value !== t) sel.value = t;
      // Sync lang-toggle-btn text label
      var btn = document.getElementById("lang-toggle-btn");
      if (btn) {
        var labelEl = document.getElementById("current-lang-label");
        if (labelEl) {
          var langName = t;
          if (this.languages && Array.isArray(this.languages)) {
            var found = this.languages.find(function (l) {
              return l.code === t;
            });
            if (found) langName = found.name;
          }
          labelEl.textContent = langName;
        }
      }
    }),
    (r.prototype.bindDropdownEvents = function () {
      var t = this,
        e = this.getDropdown();
      if (e) {
        (e.addEventListener("click", function (t) {
          t.stopPropagation();
        }),
          e.addEventListener("click", function (e) {
            var n = e.target.closest(".lang-option");
            if (n) {
              var a = n.getAttribute("data-code");
              a && t.setLanguage(a);
            }
          }));
        var n = e.querySelector('#lang-search-input, input[data-i18n-placeholder="lang_search_placeholder"]');
        n &&
          n.addEventListener("input", function (e) {
            t.filterLanguages(e.target.value);
          });
      }
    }),
    (r.prototype.openLanguageDropdown = function () {
      var t = this.getDropdown(),
        e = document.getElementById("language-dropdown-anchor");
      if ((t || (this.initDropdownContainer(), (t = this.getDropdown())), t)) {
        if (
          ((t.style.position = "fixed"),
          (t.style.zIndex = "9999"),
          (t.style.display = "block"),
          t.classList.add("show"),
          e)
        ) {
          var n = e.getBoundingClientRect();
          t.style.top = n.bottom + 8 + "px";
          /* On small screens, center the dropdown */
          if (window.innerWidth < 768) {
            t.style.left = "16px";
            t.style.right = "16px";
            t.style.width = "auto";
          } else {
            var a = t.offsetWidth || 240,
              o = window.innerWidth - n.right;
            o + a > window.innerWidth
              ? (t.style.left = Math.max(8, window.innerWidth - a - 8) + "px")
              : ((t.style.left = ""), (t.style.right = o + "px"));
          }
        }
      } else console.error("[i18n] openLanguageDropdown: dropdown still null, returning");
    }),
    (r.prototype.closeLanguageDropdown = function () {
      var t = this.getDropdown();
      t &&
        ((t.style.display = "none"),
        (t.style.left = ""),
        (t.style.right = ""),
        (t.style.width = ""),
        t.classList.remove("show"));
    }),
    (r.prototype.filterLanguages = function (t) {
      var e = document.querySelectorAll(".lang-option"),
        n = t.toLowerCase();
      e.forEach(function (t) {
        var e = t.getAttribute("data-code").toLowerCase(),
          a = t.textContent.toLowerCase();
        t.style.display = e.includes(n) || a.includes(n) ? "" : "none";
      });
    }),
    (r.prototype.resetLanguageSearch = function () {
      var t = this.getDropdown();
      if (t) {
        var e = t.querySelector('input[data-i18n-placeholder="lang_search_placeholder"]');
        (e && (e.value = ""), this.filterLanguages(""));
      }
    }),
    (r.prototype.setupEventListeners = function () {
      if (!this._eventListenersSetup) {
        this._eventListenersSetup = !0;
        var t = this,
          e = document.querySelector(".lang-dropdown-container"),
          n = this.getDropdown();
        if (
          (document.addEventListener("click", function (n) {
            e && !e.contains(n.target) && t.closeLanguageDropdown();
          }),
          n)
        ) {
          (n.addEventListener("click", function (t) {
            t.stopPropagation();
          }),
            n.addEventListener("click", function (e) {
              var n = e.target.closest(".lang-option");
              if (n) {
                var a = n.getAttribute("data-code");
                a && t.setLanguage(a);
              }
            }));
          var a = n.querySelector('#lang-search-input, input[data-i18n-placeholder="lang_search_placeholder"]');
          a &&
            a.addEventListener("input", function (e) {
              t.filterLanguages(e.target.value);
            });
        }
        // lang-selector change event is handled by navigator.js _onLangChange().
        // Removed duplicate binding here — it caused double setLanguage() calls
        // and consequently double toasts on every language switch.
      }
    }),
    (r.prototype.resetEventListeners = function () {
      ((this._eventListenersSetup = !1), (this.dropdownEl = null));
    }),
    (r.prototype.detectBrowserLanguage = function () {
      var t = navigator.language || navigator.userLanguage || "en",
        e = {
          zh: "en",
          en: "en",
          "zh-TW": "en",
          "zh-HK": "en",
          en: "en",
          "en-US": "en",
          "en-GB": "en",
        };
      return e[t] || e[t.split("-")[0]] || "en";
    }),
    (r.prototype.debug = function () {}),
    (r.prototype.reloadTranslations = function () {
      var t = this.currentLanguage;
      (this.translationsCache.delete(t),
        this.translationsCache.delete("ui-" + t),
        this.translationsCache.delete("product-" + t));
      var e = this;
      return this.loadTranslations(t).then(function () {
        return e.applyTranslations();
      });
    }),
    (r.prototype.initialize = function () {
      var e = this;
      if (e.isInitialized) return Promise.resolve(e);
      localStorage.getItem("browserLang") || localStorage.setItem("browserLang", this.detectBrowserLanguage());
      var n = this.getInitialLanguage();
      return (
        (this.currentLanguage = n),
        e.setupEventListeners(),
        Promise.all([
          this.loadUITranslations(n),
          this.loadProductTranslations(n).catch(function (t) {
            console.warn("[i18n] initialize: product translations for " + n + " failed: " + t.message);
          }),
          "en" !== n && !this.translationsCache.has("ui-en")
            ? this.loadUITranslations("en").catch(function () {})
            : Promise.resolve(),
        ])
          .then(function () {
            return e.applyTranslations();
          })
          .then(function () {
            ((document.documentElement.lang = e.currentLanguage),
              (e.isInitialized = !0),
              e.emit("initialized", {
                language: e.currentLanguage,
              }),
              t.dispatchEvent(
                new CustomEvent("productTranslationsLoaded", {
                  detail: {
                    language: n,
                  },
                })
              ));
          })
          .catch(function (t) {
            return (
              console.error("[i18n] initialize: FAILED:", t),
              (e.currentLanguage = "en"),
              e
                .loadTranslations("en")
                .then(function () {
                  return e.applyTranslations();
                })
                .then(function () {
                  ((document.documentElement.lang = "en"),
                    (e.isInitialized = !0),
                    e.emit("initialized", {
                      language: "en",
                    }));
                })
                .catch(function (t) {
                  console.error("[i18n] initialize: fallback also FAILED:", t);
                })
            );
          })
      );
    }),
    (r.prototype.recoverFromBfcache = function () {
      var t = this;
      return (
        document.getElementById("language-dropdown") || (this.dropdownEl = null),
        this.setupEventListeners(),
        this.applyTranslations()
          .then(function () {
            t.emit("bfcacheRecovered", {
              language: t.currentLanguage,
            });
          })
          .catch(function (e) {
            return (
              console.error("[i18n] recoverFromBfcache: FAILED:", e),
              t.loadTranslations("en").then(function () {
                return t.applyTranslations();
              })
            );
          })
      );
    }));
  var s = new r();
  (function autoInit() {
    function tryInit() {
      if (!s.isInitialized) s.initialize();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", tryInit);
    } else {
      tryInit();
    }
  })();
  ((t.t = function (t) {
    return s.translate(t);
  }),
    (t.setLanguage = function (t) {
      return s.setLanguage(t);
    }),
    (t.toggleLanguageDropdown = function (t) {
      return s.toggleLanguageDropdown(t);
    }),
    (t.filterLanguages = function (t) {
      return s.filterLanguages(t);
    }),
    (t.translationManager = s),
    (t.TranslationManager = r),
    (t.reloadTranslations = function () {
      return s.reloadTranslations();
    }),
    (t.recoverTranslationsFromBfcache = function () {
      return s.recoverFromBfcache();
    }),
    _spaOn(
      document,
      "spa:load",
      function () {
        (s.resetEventListeners(),
          s
            .applyTranslations()
            .then(function () {
              document.dispatchEvent(new Event("spa:ready"));
            })
            .catch(function (t) {
              console.warn("[i18n] spa:load translation apply failed:", t);
              document.dispatchEvent(new Event("spa:ready"));
            }));
      },
      "spa:load:i18n"
    ));
})(window);
