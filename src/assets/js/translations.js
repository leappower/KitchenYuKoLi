/**
 * translations.js — Internationalization Module (IIFE build for src/ static HTML)
 * Synced from: src/assets/translations.js
 * Global: window.TranslationManager, window.translationManager
 *
 * Dependencies (must load before this file):
 *   <script src="../../assets/js/lang-registry.js"></script>
 *
 * ⚠️  Requires assets/lang/{lang}-ui.json and assets/lang/{lang}-product.json
 *     to be served alongside the HTML pages. Without these files, i18n will
 *     fall back to zh-CN or show raw keys.
 *
 * Usage:
 *   <script src="../../assets/js/lang-registry.js"></script>
 *   <script src="../../assets/js/translations.js"></script>
 *   <script>window.translationManager.initialize();</script>
 */
(function (global) {
  'use strict';

  // ── 环境检测：测试/开发环境下禁用 localStorage 翻译缓存 ──
  var _isDevOrTest = (function () {
    var h = (global.location && global.location.hostname) || '';
    var p = (global.location && global.location.port) || '';
    if (h === 'localhost' || h === '127.0.0.1') return true;
    if (['8080', '3000', '3001', '5000', '9000'].indexOf(p) !== -1) return true;
    if (/\b(test|staging|preview|dev|internal|local)\b/.test(h.toLowerCase())) return true;
    return false;
  })();

  // Resolve lang registry — prefer window.LANG_REGISTRY (set by lang-registry.js)
  var langRegistry = (global.LANG_REGISTRY) ? global.LANG_REGISTRY : { getNativeNames: function () { return {}; } };
  var languageNames = langRegistry.getNativeNames();

  // ─────────────────────────────────────────────────────────────────────────────
  // TranslationManager class
  // ─────────────────────────────────────────────────────────────────────────────
  function TranslationManager() {
    this.currentLanguage = this.getInitialLanguage();
    this.translationsCache = new Map();
    this.pendingLoads = new Map();
    this.keyPathCache = new Map();
    this.isInitialized = false;
    this.eventListeners = new Map();
    this.dropdownEl = null;
    // 从 lang-registry.js 获取语言列表（25 种语言）
    var langRegistry = (global.LANG_REGISTRY && global.LANG_REGISTRY.LANGUAGES) ? global.LANG_REGISTRY.LANGUAGES : [];
    // 转换为模板需要的格式: { code, name }
    this.languages = langRegistry.map(function(l) {
      return { code: l.code, name: l.nativeName };
    });
  }

  /**
   * Promise timeout utility.
   * Wraps a promise with a timeout that rejects if not resolved within the specified duration.
   * 
   * @param {Promise} promise - The promise to wrap
   * @param {number} ms - Timeout in milliseconds (default: 10000ms)
   * @param {string} timeoutMessage - Custom timeout error message
   * @returns {Promise} - Original promise or rejected with timeout error
   */
  function withTimeout(promise, ms, timeoutMessage) {
    ms = ms || 10000; // Default 10 second timeout
    timeoutMessage = timeoutMessage || 'Translation loading timeout';

    return Promise.race([
      promise,
      new Promise(function (resolve, reject) {
        setTimeout(function () {
          reject(new Error(timeoutMessage));
        }, ms);
      })
    ]);
  }

  TranslationManager.prototype.getInitialLanguage = function () {
    var userChoice = localStorage.getItem('userLanguage');
    if (userChoice && languageNames[userChoice]) return userChoice;
    return 'zh-CN';
  };

  TranslationManager.prototype.loadTranslations = function (lang) {
    if (
      this.translationsCache.has(lang) &&
      this.translationsCache.has('ui-' + lang) &&
      this.translationsCache.has('product-' + lang)
    ) {
      return Promise.resolve(this.translationsCache.get(lang));
    }
    if (this.pendingLoads.has(lang)) return this.pendingLoads.get(lang);
    var self = this;
    var loadPromise = this.fetchTranslations(lang);
    this.pendingLoads.set(lang, loadPromise);
    return loadPromise.finally(function () { self.pendingLoads.delete(lang); });
  };

  TranslationManager.prototype.fetchTranslations = function (lang) {
    var self = this;
    return this.loadUITranslations(lang).then(function (uiTranslations) {
      return self.loadProductTranslations(lang).then(function (productTranslations) {
        var merged = self.mergeTranslations(uiTranslations, productTranslations);
        self.translationsCache.set(lang, merged);
        return merged;
      });
    }).catch(function (error) {
      console.error('Failed to load translations for ' + lang + ':', error);
      if (lang !== 'zh-CN') return self.loadTranslations('zh-CN');
      throw error;
    });
  };

  TranslationManager.prototype.loadUITranslations = function (lang) {
    var cacheKey = 'ui-' + lang;
    if (this.translationsCache.has(cacheKey)) {
      return Promise.resolve(this.translationsCache.get(cacheKey));
    }

    // 尝试从 localStorage 读取缓存（测试/开发环境下跳过）
    var localCacheKey = 'yukoli-translations-' + cacheKey;
    var cachedData = null;
    if (!_isDevOrTest) {
      try {
        var cachedStr = localStorage.getItem(localCacheKey);
        if (cachedStr) {
          var cached = JSON.parse(cachedStr);
          // 验证缓存结构完整性
          if (!cached || typeof cached !== 'object' || !cached.data || typeof cached.data !== 'object') {
            console.warn('[i18n] Invalid cache structure for ' + lang + ', clearing');
            localStorage.removeItem(localCacheKey);
          } else if (cached.timestamp && (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000) {
            cachedData = cached.data;
            this.translationsCache.set(cacheKey, cachedData);
            return Promise.resolve(cachedData);
          } else {
            // 缓存已过期，清除
            localStorage.removeItem(localCacheKey);
          }
        }
      } catch (e) {
        // localStorage 不可用或解析失败（损坏的缓存），清除它
        console.warn('[i18n] Failed to read localStorage cache for ' + lang + ':', e.message);
        try { localStorage.removeItem(localCacheKey); } catch (removeErr) { /* ignore */ }
      }
    }

    var self = this;
    if (typeof fetch !== 'function') return lang !== 'zh-CN' ? self.loadUITranslations('zh-CN') : Promise.reject(new Error('fetch not available'));

    var basePath = (typeof window !== 'undefined' && window.BASE_PATH) || '';
    var fetchPromise = fetch(basePath + '/assets/lang/' + lang + '-ui.json', { cache: _isDevOrTest ? 'no-store' : 'default' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + response.statusText);
      return response.json();
    }).then(function (data) {
      var normalized = self.normalizeTranslationKeys(data);
      self.translationsCache.set(cacheKey, normalized);

      // 保存到 localStorage（测试/开发环境下跳过）
      if (!_isDevOrTest) {
        try {
          localStorage.setItem(localCacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: normalized
          }));
        } catch (e) {
          // localStorage 可能已满或不可用
        }
      }

      return normalized;
    }).catch(function (error) {
      console.error('[i18n] loadUITranslations: FAILED for ' + lang + ':', error);
      if (lang !== 'zh-CN') return self.loadUITranslations('zh-CN');
      throw error;
    });

    // Wrap with timeout protection (15 second timeout)
    return withTimeout(fetchPromise, 15000, '[i18n] loadUITranslations timeout for ' + lang);
  };

  TranslationManager.prototype.loadProductTranslations = function (lang) {
    var cacheKey = 'product-' + lang;
    if (this.translationsCache.has(cacheKey)) {
      return Promise.resolve(this.translationsCache.get(cacheKey));
    }
    var self = this;
    
    var basePath = (typeof window !== 'undefined' && window.BASE_PATH) || '';
    var fetchPromise = fetch(basePath + '/assets/lang/' + lang + '-product.json', { cache: _isDevOrTest ? 'no-store' : 'default' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (data) {
      if (Object.keys(data).length === 0 && lang !== 'zh-CN') {
        console.warn('[i18n] loadProductTranslations: empty data for ' + lang + ', falling back to zh-CN');
        return self.loadProductTranslations('zh-CN');
      }
      var normalized = self.normalizeTranslationKeys(data);
      var _keyCount = Object.keys(normalized).length;
      self.translationsCache.set(cacheKey, normalized);
      return normalized;
    }).catch(function (error) {
      console.error('[i18n] loadProductTranslations: FAILED for ' + lang + ':', error);
      if (lang !== 'zh-CN') return self.loadProductTranslations('zh-CN');
      throw error;
    });

    // Wrap with timeout protection (15 second timeout)
    return withTimeout(fetchPromise, 15000, '[i18n] loadProductTranslations timeout for ' + lang);
  };

  TranslationManager.prototype.mergeTranslations = function (ui, product) {
    return Object.assign({}, ui, product);
  };

  TranslationManager.prototype.normalizeTranslationKeys = function (value) {
    if (Array.isArray(value)) return value.map(this.normalizeTranslationKeys.bind(this));
    if (!value || typeof value !== 'object') return value;
    var normalized = {};
    var self = this;
    Object.keys(value).forEach(function (key) {
      var normalizedKey = typeof key === 'string' ? key.replace(/^\uFEFF/, '') : key;
      normalized[normalizedKey] = self.normalizeTranslationKeys(value[key]);
    });
    return normalized;
  };

  TranslationManager.prototype.resolveTranslationValue = function (dictionary, key) {
    if (!dictionary || !key) {
      return key;
    }
    var keys = this.getKeyPath(key);
    var value = dictionary;
    for (var i = 0; i < keys.length; i++) {
      value = value ? value[keys[i]] : undefined;
    }
    if (key.indexOf('home_tablet') === 0 || key.indexOf('nav_') === 0 || key.indexOf('products_') === 0) {
      // intentionally no-op for these key prefixes
    }
    return value || key;
  };

  TranslationManager.prototype.getKeyPath = function (key) {
    if (!this.keyPathCache.has(key)) this.keyPathCache.set(key, key.split('.'));
    return this.keyPathCache.get(key);
  };

  TranslationManager.prototype.getDropdown = function () {
    if (this.dropdownEl && document.contains(this.dropdownEl)) return this.dropdownEl;
    this.dropdownEl = document.getElementById('language-dropdown');
    return this.dropdownEl;
  };

  TranslationManager.prototype.setElementTranslation = function (el, translation) {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.placeholder !== translation) el.placeholder = translation;
      return;
    }
    if (el.textContent !== translation) el.textContent = translation;
  };

  TranslationManager.prototype.translate = function (key) {
    var uiTranslations = this.translationsCache.get('ui-' + this.currentLanguage);
    if (uiTranslations) {
      var uiVal = this.resolveTranslationValue(uiTranslations, key);
      if (uiVal && uiVal !== key) return uiVal;
    }
    var productTranslations = this.translationsCache.get('product-' + this.currentLanguage);
    if (productTranslations) {
      var productVal = this.resolveTranslationValue(productTranslations, key);
      if (productVal && productVal !== key) return productVal;
    }
    var merged = this.translationsCache.get(this.currentLanguage);
    return this.resolveTranslationValue(merged, key);
  };

  TranslationManager.prototype.uiText = function (key, fallback) {
    var translated = this.translate(key);
    if (translated && translated !== key) return translated;
    var fallbackText = this.getFallbackTranslation(key);
    if (fallbackText && fallbackText !== key) return fallbackText;
    return fallback;
  };

  TranslationManager.prototype.applyTranslations = function () {
    var self = this;
    var uiCacheKey = 'ui-' + this.currentLanguage;
    var loadPromise = this.translationsCache.has(uiCacheKey)
      ? Promise.resolve(this.translationsCache.get(uiCacheKey))
      : this.loadUITranslations(this.currentLanguage);

    return loadPromise.then(function (uiTranslations) {
      if (!uiTranslations) {
        console.warn('[i18n] applyTranslations: uiTranslations is null/undefined for', self.currentLanguage);
        return;
      }
      // 直接查询当前 DOM（每次翻译都扫描最新 DOM）
      var i18nElements = document.querySelectorAll('[data-i18n]');
      var placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
      var ariaElements = document.querySelectorAll('[data-i18n-aria]');
      var languageLabel = document.getElementById('current-lang-label');

      var productTranslations = self.translationsCache.get('product-' + self.currentLanguage) || {};
      var combinedTranslations = Object.assign({}, uiTranslations, productTranslations);

      var resolveKey = function (key) {
        var val = self.resolveTranslationValue(combinedTranslations, key);
        if (val && val !== key) return val;
        return self.getFallbackTranslation(key);
      };

      // 批量收集所有 DOM 更新，使用 requestAnimationFrame 一次性应用
      var updates = [];

      i18nElements.forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        var translation = resolveKey(key);
        if (translation && translation !== key) {
          updates.push({ el: el, text: translation });
        }
      });

      placeholderElements.forEach(function (el) {
        var key = el.getAttribute('data-i18n-placeholder');
        var translation = resolveKey(key);
        if (translation && translation !== key && el.placeholder !== translation) {
          updates.push({ el: el, placeholder: translation });
        }
      });

      ariaElements.forEach(function (el) {
        var key = el.getAttribute('data-i18n-aria');
        var translation = resolveKey(key);
        if (translation && translation !== key) {
          updates.push({ el: el, ariaLabel: translation });
        }
      });

      // 使用 requestAnimationFrame 批量应用更新，减少重绘
      if (updates.length > 0) {
        requestAnimationFrame(function () {
          updates.forEach(function (update) {
            if (update.text) {
              self.setElementTranslation(update.el, update.text);
            } else if (update.placeholder) {
              update.el.placeholder = update.placeholder;
            } else if (update.ariaLabel) {
              update.el.setAttribute('aria-label', update.ariaLabel);
            }
          });
        });
      }

      if (languageLabel) {
        var nextLabel = languageNames[self.currentLanguage] || self.currentLanguage.toUpperCase();
        if (languageLabel.textContent !== nextLabel) languageLabel.textContent = nextLabel;
        // Also update tablet button label (.current-lang-btn-label) if present
        var btnLabel = document.querySelector('.current-lang-btn-label');
        if (btnLabel && btnLabel.textContent !== nextLabel) btnLabel.textContent = nextLabel;
      }

      self.refreshCompanyName(uiTranslations);
      self.refreshDocumentTitle(uiTranslations);
      self.emit('translationsApplied', { language: self.currentLanguage });
    }).catch(function (error) {
      console.error('[i18n] applyTranslations: ERROR:', error);
    });
  };

  TranslationManager.prototype.refreshCompanyName = function (translations) {
    var companyName = (translations && translations.company_name) || this.getFallbackTranslation('company_name');
    if ((!companyName || companyName === 'company_name') && this.currentLanguage === 'zh-CN') {
      companyName = '佛山市跃迁力科技有限公司';
    }
    if (!companyName || companyName === 'company_name') return;
    document.querySelectorAll('[data-i18n="company_name"]').forEach(function (el) {
      if (el.textContent !== companyName) el.textContent = companyName;
    });
  };

  TranslationManager.prototype.refreshDocumentTitle = function (translations) {
    var titleEl = document.getElementById('page-title');
    if (!titleEl) return;
    var pageTitle = (translations && translations.page_title) || this.getFallbackTranslation('page_title');
    if (!pageTitle || pageTitle === 'page_title') return;
    if (document.title !== pageTitle) document.title = pageTitle;
  };

  TranslationManager.prototype.getFallbackTranslation = function (key) {
    if (this.currentLanguage !== 'en') {
      var enTranslations = this.translationsCache.get('ui-en');
      if (enTranslations) {
        var enValue = this.resolveTranslationValue(enTranslations, key);
        if (enValue && enValue !== key) return enValue;
      }
    }
    if (this.currentLanguage !== 'zh-CN') {
      var zhTranslations = this.translationsCache.get('ui-zh-CN');
      if (zhTranslations) return this.resolveTranslationValue(zhTranslations, key);
    }
    return key;
  };

  TranslationManager.prototype.on = function (event, callback) {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event).push(callback);
  };

  TranslationManager.prototype.emit = function (event, data) {
    var listeners = this.eventListeners.get(event) || [];
    listeners.forEach(function (cb) { cb(data); });
  };

  TranslationManager.prototype.setLanguage = function (lang) {
    var self = this;
    if (!languageNames[lang]) return Promise.reject(new Error('Unsupported language: ' + lang));
    if (this.currentLanguage === lang) {
      this.closeLanguageDropdown();
      return Promise.resolve();
    }
    return Promise.all([
      this.loadUITranslations(lang),
      this.loadProductTranslations(lang).catch(function (err) {
        console.warn('[i18n] setLanguage: product translations for ' + lang + ' failed: ' + err.message);
      })
    ]).then(function () {
      var previousLanguage = self.currentLanguage;
      self.currentLanguage = lang;
      localStorage.setItem('userLanguage', lang);
      return self.applyTranslations().then(function () {
        document.documentElement.lang = lang;
        global.dispatchEvent(new CustomEvent('languageChanged', {
          detail: { language: lang, previousLanguage: previousLanguage }
        }));
        self.closeLanguageDropdown();
        self.resetLanguageSearch();
        if (global.showNotification) {
          var prefix = self.uiText('notify_language_changed', 'Language changed to');
          global.showNotification(prefix + ' ' + (languageNames[lang] || lang), 'success');
        }
        self.emit('languageChanged', { language: lang, previousLanguage: previousLanguage });
      });
    }).catch(function (error) {
      console.error('[i18n] setLanguage: FAILED for', lang, error);
      if (lang !== 'zh-CN') return self.setLanguage('zh-CN');
    });
  };

  TranslationManager.prototype.toggleLanguageDropdown = function (event) {
    if (event) event.stopPropagation();
    var dropdown = this.getDropdown();
    if (!dropdown) {
      this.initDropdownContainer();
      dropdown = this.getDropdown();
    }
    if (!dropdown) return;

    // 检查下拉框是否可见：通过style.display或者classList.contains('show')
    var styleDisplay = dropdown.style.display;
    var hasShowClass = dropdown.classList.contains('show');
    var isVisible = (styleDisplay === 'block') || hasShowClass;

    if (isVisible) {
      this.closeLanguageDropdown();
    } else {
      this.openLanguageDropdown();
    }
  };

  
  TranslationManager.prototype.initDropdownContainer = function () {
    var self = this;
    var languages = this.languages || [];
    var currentLang = this.currentLanguage || 'zh-CN';

    // 如果下拉框已经存在，直接返回
    if (document.getElementById('language-dropdown')) {
      return;
    }

    // 加载模板
    if (typeof LanguageDropdownTemplate === 'undefined') {
      console.warn('[i18n] LanguageDropdownTemplate not found, attempting to load dynamically');
      // 动态加载模板脚本
      var script = document.createElement('script');
      script.src = '/assets/js/translations-dropdown-template.js';
      script.onload = function() {
        self.initDropdownContainer(); // 重新调用
      };
      script.onerror = function() {
        console.error('[i18n] Failed to load LanguageDropdownTemplate');
      };
      document.head.appendChild(script);
      return;
    }

    // 创建下拉框 HTML
    var dropdownHTML = LanguageDropdownTemplate.createDropdownHTML(languages, currentLang);

    // 将下拉框插入到 body 中
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = dropdownHTML;
    var dropdown = tempDiv.firstChild;
    document.body.appendChild(dropdown);

    // 更新缓存引用
    this.dropdownEl = dropdown;

    // 为新创建的下拉框绑定事件
    this.bindDropdownEvents();

    // 高亮当前语言并更新按钮文字
    this.updateCurrentLanguageLabel(currentLang);
  };

  // 更新语言切换按钮的显示文字
  TranslationManager.prototype.updateCurrentLanguageLabel = function (langCode) {
    // 获取语言名称
    var langName = langCode;
    if (this.languages && Array.isArray(this.languages)) {
      var langObj = this.languages.find(function(l) { return l.code === langCode; });
      if (langObj) langName = langObj.name;
    }

    // 更新按钮文字（如果有的话）
    var toggleBtn = document.getElementById('lang-toggle-btn');
    if (toggleBtn) {
      var labelSpan = toggleBtn.querySelector('.lang-label') || toggleBtn;
      if (labelSpan !== toggleBtn) {
        labelSpan.textContent = langName;
      } else {
        // 如果没有 .lang-label span，尝试在按钮内查找显示文字的元素
        var textEl = toggleBtn.querySelector('span:not(.material-symbols-outlined)');
        if (textEl) textEl.textContent = langName;
      }
    }

    // 高亮下拉框中当前选中的语言选项
    var dropdown = this.getDropdown();
    if (dropdown) {
      dropdown.querySelectorAll('.lang-option').forEach(function(opt) {
        opt.classList.remove('active');
        if (opt.getAttribute('data-code') === langCode) {
          opt.classList.add('active');
        }
      });
    }
  };

  // 绑定下拉框事件（供 initDropdownContainer 和首次初始化调用）
  TranslationManager.prototype.bindDropdownEvents = function () {
    var self = this;
    var dropdown = this.getDropdown();
    if (!dropdown) return;

    // 点击下拉框本身不关闭
    dropdown.addEventListener('click', function (event) { event.stopPropagation(); });

    // 语言选项点击事件
    dropdown.addEventListener('click', function (event) {
      var option = event.target.closest('.lang-option');
      if (option) {
        var lang = option.getAttribute('data-code');
        if (lang) self.setLanguage(lang);
      }
    });

    // 搜索输入过滤
    var searchInput = dropdown.querySelector('#lang-search-input, input[data-i18n-placeholder="lang_search_placeholder"]');
    if (searchInput) {
      searchInput.addEventListener('input', function (event) {
        self.filterLanguages(event.target.value);
      });
    }
  };

TranslationManager.prototype.openLanguageDropdown = function () {
    var dropdown = this.getDropdown();
    var anchor = document.getElementById('language-dropdown-anchor');
    
    
    if (!dropdown) {
      this.initDropdownContainer();
      dropdown = this.getDropdown();
    }
    
    if (!dropdown) {
      console.error('[i18n] openLanguageDropdown: dropdown still null, returning');
      return;
    }
    
    // 使用 fixed 定位，确保在最上层
    dropdown.style.position = 'fixed';
    dropdown.style.zIndex = '9999';
    dropdown.style.display = 'block';
    dropdown.classList.add('show');
    
    // 计算并设置下拉框位置
    if (anchor) {
      var anchorRect = anchor.getBoundingClientRect();
      dropdown.style.top = (anchorRect.bottom + 8) + 'px';
      dropdown.style.left = (anchorRect.right - 256) + 'px'; // 256px 是下拉框宽度
    }
  };

  TranslationManager.prototype.closeLanguageDropdown = function () {
    var dropdown = this.getDropdown();
    if (dropdown) {
      dropdown.style.display = 'none';
      dropdown.classList.remove('show');
    }
  };

  TranslationManager.prototype.filterLanguages = function (query) {
    var langOptions = document.querySelectorAll('.lang-option');
    var q = query.toLowerCase();
    langOptions.forEach(function (opt) {
      var code = opt.getAttribute('data-code').toLowerCase();
      var name = opt.textContent.toLowerCase();
      opt.style.display = (code.includes(q) || name.includes(q)) ? '' : 'none';
    });
  };

  TranslationManager.prototype.resetLanguageSearch = function () {
    var dropdown = this.getDropdown();
    if (!dropdown) return;
    var input = dropdown.querySelector('input[data-i18n-placeholder="lang_search_placeholder"]');
    if (input) input.value = '';
    this.filterLanguages('');
  };

  TranslationManager.prototype.setupEventListeners = function () {
    // 防止重复设置事件监听器
    if (this._eventListenersSetup) {
      return;
    }
    this._eventListenersSetup = true;
    var self = this;
    var container = document.querySelector('.lang-dropdown-container');
    var dropdown = this.getDropdown();

    // Close dropdown when clicking outside
    document.addEventListener('click', function (event) {
      if (container && !container.contains(event.target)) self.closeLanguageDropdown();
    });

    if (dropdown) {
      dropdown.addEventListener('click', function (event) { event.stopPropagation(); });
      // Handle language selection via .lang-option buttons
      dropdown.addEventListener('click', function (event) {
        var option = event.target.closest('.lang-option');
        if (option) {
          var lang = option.getAttribute('data-code');
          if (lang) self.setLanguage(lang);
        }
      });
      // Handle search input filtering
      var searchInput = dropdown.querySelector('#lang-search-input, input[data-i18n-placeholder="lang_search_placeholder"]');
      if (searchInput) {
        searchInput.addEventListener('input', function (event) {
          self.filterLanguages(event.target.value);
        });
      }
    }

    // Bind toggle button (#lang-toggle-btn)
    // Defensive check: warn if multiple lang-toggle-btn elements exist (only first will be bound)
    var allToggleBtns = document.querySelectorAll('#lang-toggle-btn');
    if (allToggleBtns.length > 1) {
      console.warn(
        '[i18n] setupEventListeners: found ' + allToggleBtns.length + ' elements with id="lang-toggle-btn".' +
        ' Only the first will be bound. Each page should have exactly one language switcher.'
      );
    }
    var toggleBtn = document.getElementById('lang-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function (event) {
        self.toggleLanguageDropdown(event);
      });
    } else {
      console.warn('[i18n] lang-toggle-btn not found!');
    }
  };

  /**
   * Reset event listener flag so setupEventListeners() can rebind.
   * Call this after SPA navigation when the toggle button DOM may have changed.
   */
  TranslationManager.prototype.resetEventListeners = function () {
    this._eventListenersSetup = false;
    this.dropdownEl = null;
  };

  TranslationManager.prototype.detectBrowserLanguage = function () {
    var browserLang = navigator.language || navigator.userLanguage || 'en';
    var langMap = {
      'zh': 'zh-CN', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-CN', 'zh-HK': 'zh-CN',
      'en': 'en', 'en-US': 'en', 'en-GB': 'en',
    };
    return langMap[browserLang] || langMap[browserLang.split('-')[0]] || 'en';
  };

  TranslationManager.prototype.debug = function () {
    // debug output removed
  };

  TranslationManager.prototype.reloadTranslations = function () {
    var lang = this.currentLanguage;
    this.translationsCache.delete(lang);
    this.translationsCache.delete('ui-' + lang);
    this.translationsCache.delete('product-' + lang);
    var self = this;
    return this.loadTranslations(lang).then(function () { return self.applyTranslations(); });
  };

  TranslationManager.prototype.initialize = function () {
    var self = this;
    if (!localStorage.getItem('browserLang')) {
      localStorage.setItem('browserLang', this.detectBrowserLanguage());
    }
    var initialLang = this.getInitialLanguage();
    this.currentLanguage = initialLang;

    // Always bind event listeners early so the language switcher button
    // works regardless of whether the translations fetch succeeds or fails.
    self.setupEventListeners();

    // Load UI + product translations in parallel, then apply everything in one shot.
    // This guarantees that when translationsApplied fires the product cache is already
    // populated, so products.js receives correct translated names on the very first render.
    return Promise.all([
      this.loadUITranslations(initialLang),
      this.loadProductTranslations(initialLang).catch(function (err) {
        console.warn('[i18n] initialize: product translations for ' + initialLang + ' failed: ' + err.message);
      })
    ]).then(function () {
      return self.applyTranslations();
    }).then(function () {
      document.documentElement.lang = self.currentLanguage;
      self.isInitialized = true;
      self.emit('initialized', { language: self.currentLanguage });
      global.dispatchEvent(new CustomEvent('productTranslationsLoaded', {
        detail: { language: initialLang }
      }));
    }).catch(function (error) {
      console.error('[i18n] initialize: FAILED:', error);
      self.currentLanguage = 'zh-CN';
      return self.loadTranslations('zh-CN').then(function () {
        return self.applyTranslations();
      }).then(function () {
        document.documentElement.lang = 'zh-CN';
        self.isInitialized = true;
        self.emit('initialized', { language: 'zh-CN' });
      }).catch(function (fallbackError) {
        console.error('[i18n] initialize: fallback also FAILED:', fallbackError);
      });
    });
  };

  /**
   * Recover from bfcache restoration.
   * 
   * When a page is restored from bfcache (via browser back button),
   * we need to re-apply translations and refresh the DOM state.
   * 
   * This is less expensive than full initialization since translations
   * should already be cached.
   * 
   * @returns {Promise} Resolves when recovery is complete
   */
  TranslationManager.prototype.recoverFromBfcache = function () {
    var self = this;

    // Check if dropdown exists in restored DOM, if not clear the cached reference
    var dropdown = document.getElementById('language-dropdown');
    if (!dropdown) {
      this.dropdownEl = null;
    }

    // Re-bind event listeners to lang-toggle-btn (it may have been restored from cache)
    this.setupEventListeners();

    // Re-apply translations to the restored DOM
    return this.applyTranslations().then(function () {
      self.emit('bfcacheRecovered', { language: self.currentLanguage });
    }).catch(function (error) {
      console.error('[i18n] recoverFromBfcache: FAILED:', error);
      // Attempt fallback reload if recovery failed
      return self.loadTranslations('zh-CN').then(function () {
        return self.applyTranslations();
      });
    });
  };

  // ─── Instantiate & expose ─────────────────────────────────────────────────────
  var translationManager = new TranslationManager();

  // Legacy API
  global.t                     = function (key) { return translationManager.translate(key); };
  global.setLanguage            = function (lang) { return translationManager.setLanguage(lang); };
  global.toggleLanguageDropdown = function (event) { return translationManager.toggleLanguageDropdown(event); };
  global.filterLanguages        = function (query) { return translationManager.filterLanguages(query); };
  global.setupLanguageSystem    = function () { return translationManager.initialize(); };

  // Modern API
  global.translationManager    = translationManager;
  global.TranslationManager    = TranslationManager;

  // Debug helpers
  global.debugTranslations     = function () { return translationManager.debug(); };
  global.reloadTranslations    = function () { return translationManager.reloadTranslations(); };
  global.recoverTranslationsFromBfcache = function () { return translationManager.recoverFromBfcache(); };

  // ─── SPA Navigation Support ──────────────────────────────────────────────────
  // Re-apply translations and re-bind events when SPA navigates to a new page
  document.addEventListener('spa:load', function () {
    translationManager.resetEventListeners();
    translationManager.applyTranslations().catch(function (err) {
      console.warn('[i18n] spa:load translation apply failed:', err);
    });
  });

}(window));
