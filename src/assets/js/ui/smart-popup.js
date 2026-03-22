// smart-popup.js - Smart popup system + form submission
// IIFE wrapper for src2 (no build tools)
// Depends on: window.MediaQueries, window.Contacts (showNotification)
// Outputs: window.smartPopup, window.showSmartPopupManual, window.closeSmartPopup,
//          window.submitSmartPopupForm, window.submitContactForm, window.submitViaMailto

(function (global) {
  'use strict';

  // ─── Fallbacks ─────────────────────────────────────────────────────────────
  function getMqMobile() {
    return global.MediaQueries
      ? (typeof global.MediaQueries.isMobile === 'function' ? global.MediaQueries.isMobile() : !!global.MediaQueries.mqMobile)
      : false;
  }

  function showNotification(msg, type) {
    if (global.Contacts && typeof global.Contacts.showNotification === 'function') {
      global.Contacts.showNotification(msg, type);
    } else if (typeof global.showNotification === 'function') {
      global.showNotification(msg, type);
    }
  }

  function isTestEnvironment() {
    var host = global.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host.includes('.local') || host.includes('test');
  }

  // ============================================
  // USER TRACKING
  // ============================================
  var userState = {
    firstVisit: Date.now(), visitCount: 0, scrollDepth: 0, timeOnPage: 0,
    productViews: [], formInteractions: 0, popupShown: false,
    popupCount: { header: 0, hero: 0, custom: 0, product: {} },
    lastPopupTime: 0, maxScrollReached: 0
  };

  function loadUserState() {
    var saved = localStorage.getItem('userState');
    if (saved) {
      var parsed = JSON.parse(saved);
      Object.assign(userState, parsed);
      userState.visitCount++;
      userState.timeOnPage = 0;
      userState.scrollDepth = 0;
    } else {
      userState.visitCount = 1;
    }
    saveUserState();
  }

  function saveUserState() {
    localStorage.setItem('userState', JSON.stringify(userState));
  }

  function trackScrollDepth() {
    var scrollPercent = Math.round((global.scrollY / (document.body.scrollHeight - global.innerHeight)) * 100);
    userState.scrollDepth = Math.max(userState.scrollDepth, scrollPercent);
    userState.maxScrollReached = Math.max(userState.maxScrollReached, scrollPercent);
  }

  function trackTimeOnPage() {
    userState.timeOnPage++;
    saveUserState();
  }

  // ============================================
  // 智能弹窗系统
  // ============================================
  function tr(key, fallback) {
    if (global.CommonUtils && typeof global.CommonUtils.tr === 'function') {
      return global.CommonUtils.tr(key, fallback);
    }
    var value = typeof global.t === 'function' ? global.t(key) : key;
    return value && value !== key ? value : fallback;
  }

  function getCurrentLanguage() {
    return (global.translationManager && global.translationManager.currentLanguage) ||
      document.documentElement.lang || 'zh-CN';
  }

  function applyPopupVisibility() {
    var isTest = isTestEnvironment();
    var countEl = document.getElementById('popup-today-count');
    var reasonEl = document.getElementById('trigger-reason');
    if (countEl) countEl.style.display = isTest ? 'flex' : 'none';
    if (reasonEl) reasonEl.style.display = isTest ? 'flex' : 'none';
  }

  var smartPopup = {
    state: {
      popupShownThisSession: 0,
      maxPopupsPerSession: 2,
      lastPopupTime: null,
      popupCooldown: 30000,
      pageStartAt: Date.now(),
      autoPopupDisabledForSession: false,
      initialDelayReached: false,
      engagementScore: 0,
      scoreThresholdDesktop: 50,
      scoreThresholdMobile: 60,
      minScrollPercentBeforeAuto: 20,
      delayDesktopSeconds: 20,
      delayMobileSeconds: 25,
      forceShowAfterDesktopSeconds: 35,
      forceShowAfterMobileSeconds: 40,
      isActivelyScrolling: false,
      scrollIdleTimer: null,
      storageKeys: { convertedUntil: 'smartPopupConvertedUntil' },
      suppression: { convertedUntil: 0 },
      // Cached values to avoid layout reads in polling interval
      cachedScrollPercent: 0,
      cachedHasFocus: false,
      flags: {
        nonLinkClickScored: false,
        productInteractionScored: false,
        scrollDepthScored: false,
        productDwellScored: false,
        nonHeroDwellScored: false,
        friendlyHandlersBound: false
      }
    },

    ensureOverlay: function () {
      if (document.getElementById('smart-popup-overlay')) return;
      var style = document.createElement('style');
      style.textContent = [
        '#smart-popup-overlay{visibility:hidden;opacity:0;pointer-events:none;position:fixed;inset:0;z-index:var(--z-modal,1000);display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);transition:opacity .25s ease,visibility .25s ease}',
        '#smart-popup-overlay.show{visibility:visible;opacity:1;pointer-events:auto}',
        '#smart-popup-overlay.closing{opacity:0;pointer-events:none;transition:opacity .2s ease,visibility 0s .2s;visibility:hidden}',
        '@keyframes popup-enter{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}',
        '#smart-popup-overlay.show > div{animation:popup-enter .25s cubic-bezier(.34,1.2,.64,1) both;will-change:transform,opacity}',
        '@keyframes popup-exit{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(10px) scale(.97)}}',
        '#smart-popup-overlay.closing > div{animation:popup-exit .2s ease forwards}',
      ].join('\n');
      document.head.appendChild(style);
      var div = document.createElement('div');
      div.innerHTML = '<div id="smart-popup-overlay">' +
        '<div style="background:#fff;border-radius:1rem;padding:2rem;max-width:480px;width:90%;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.3);">' +
          '<button id="smart-popup-close" style="position:absolute;top:.75rem;right:.75rem;width:2rem;height:2rem;display:flex;align-items:center;justify-content:center;background:#f1f5f9;border:none;border-radius:50%;cursor:pointer;font-size:1rem;color:#64748b;transition:background .15s,color .15s,transform .15s;-webkit-tap-highlight-color:transparent;touch-action:manipulation;" aria-label="Close">&#x2715;</button>' +
          '<div id="trigger-reason" style="display:none;font-size:.75rem;color:#94a3b8;margin-bottom:.5rem;align-items:center;gap:.25rem;"></div>' +
          '<div id="popup-today-count" style="display:none;font-size:.75rem;color:#94a3b8;margin-bottom:.5rem;"></div>' +
          '<div style="margin-bottom:1.25rem;">' +
            '<h3 style="font-size:1.25rem;font-weight:700;color:#0f172a;margin:0 0 .25rem;" data-i18n="popup_get_custom_quote">Get a Custom Quote</h3>' +
            '<p style="font-size:.875rem;color:#64748b;margin:0;" data-i18n="popup_tell_us">Tell us about your kitchen needs — our team will respond within 24 hours.</p>' +
          '</div>' +
          '<form id="smart-popup-form" action="/api/contact" method="POST" style="display:flex;flex-direction:column;gap:.75rem;">' +
            '<input name="name" type="text" placeholder="Full Name *" data-i18n-placeholder="popup_input_fullname" required style="border:1px solid #e2e8f0;border-radius:.5rem;padding:.625rem .75rem;font-size:.875rem;outline:none;"/>' +
            '<input name="email" type="email" placeholder="Business Email *" data-i18n-placeholder="popup_input_biz_email" required style="border:1px solid #e2e8f0;border-radius:.5rem;padding:.625rem .75rem;font-size:.875rem;outline:none;"/>' +
            '<input name="phone" type="tel" placeholder="Phone / WhatsApp" data-i18n-placeholder="popup_input_phone_wa" style="border:1px solid #e2e8f0;border-radius:.5rem;padding:.625rem .75rem;font-size:.875rem;outline:none;"/>' +
            '<input name="country" type="text" placeholder="Country / Region" data-i18n-placeholder="popup_input_country" style="border:1px solid #e2e8f0;border-radius:.5rem;padding:.625rem .75rem;font-size:.875rem;outline:none;"/>' +
            '<textarea name="message" placeholder="Describe your requirements\u2026" data-i18n-placeholder="popup_input_requirements" rows="3" style="border:1px solid #e2e8f0;border-radius:.5rem;padding:.625rem .75rem;font-size:.875rem;outline:none;resize:vertical;"></textarea>' +
            '<button type="submit" style="background:#2563eb;color:#fff;border:none;border-radius:.5rem;padding:.75rem;font-size:.875rem;font-weight:600;cursor:pointer;" data-i18n="form_title">Send Inquiry</button>' +
          '</form>' +
        '</div>' +
      '</div>';
      document.body.appendChild(div.firstElementChild);
      var form = document.getElementById('smart-popup-form');
      if (form) form.addEventListener('submit', function(e) { submitSmartPopupForm(e); });
    },

    init: function () {
      this.ensureOverlay();
      this.state.pageStartAt = Date.now();
      this.loadSuppressionState();
      this.setupTracking();
      this.setupFriendlyCloseHandlers();
      this.checkConditionsLoop();
      this.updateSessionCount();
    },

    initWithComponent: function () {
      var self = this;
      if (window.SmartPopupComponent) {
        return window.SmartPopupComponent.init().then(function(success) {
          if (success) self.init();
          return success;
        });
      } else {
        self.init();
        return Promise.resolve(true);
      }
    },

    loadSuppressionState: function () {
      var key = this.state.storageKeys.convertedUntil;
      this.state.suppression.convertedUntil = Number(localStorage.getItem(key) || 0);
    },

    addScore: function (points, flagKey) {
      if (flagKey && this.state.flags[flagKey]) return;
      if (flagKey) this.state.flags[flagKey] = true;
      this.state.engagementScore += points;
    },

    getScrollPercent: function () {
      var scrollableHeight = document.documentElement.scrollHeight - global.innerHeight;
      if (scrollableHeight <= 0) return 0;
      return Math.round((global.scrollY / scrollableHeight) * 100);
    },

    isSuppressedByStorage: function () {
      if (isTestEnvironment()) return false;
      return Date.now() < this.state.suppression.convertedUntil;
    },

    isAutoPopupAllowed: function (scrollPercent, hasFocus) {
      if (document.hidden) return false;
      if (this.state.autoPopupDisabledForSession) return false;
      if (this.state.popupShownThisSession >= this.state.maxPopupsPerSession) return false;
      if (this.isSuppressedByStorage()) return false;
      if (this.state.lastPopupTime && (Date.now() - this.state.lastPopupTime) < this.state.popupCooldown) return false;
      if (!this.state.initialDelayReached) return false;
      if (hasFocus) return false;
      if ((scrollPercent || 0) < this.state.minScrollPercentBeforeAuto) return false;
      return true;
    },

    setupTracking: function () {
      var self = this;
      // Global click tracking — lightweight, no DOM reads
      document.addEventListener('click', function (e) {
        var isLinkLike = e.target.closest('a, button, [role="button"]');
        var isInput = e.target.closest('input, textarea, select');
        var productIntentTarget = e.target.closest('#products .product-card, #product-filter-bar .filter-btn, #pagination .pagination-btn, #product-grid-mobile-controls button');
        if (productIntentTarget) self.addScore(35, 'productInteractionScored');
        if (!isLinkLike && !isInput) self.addScore(10, 'nonLinkClickScored');
      });
      this.setupScrollTracking();
      this.setupProductSectionObserver();
    },

    setupScrollTracking: function () {
      var self = this;
      var nonHeroTimer = 0;
      var nonHeroInterval = null;
      // Cache hero height once to avoid repeated querySelector + layout reads on every scroll
      var heroHeight = 0;
      var rafPending = false;

      function measureHeroHeight() {
        var hero = document.querySelector('section:first-of-type');
        heroHeight = hero ? hero.offsetHeight : 0;
      }
      requestAnimationFrame(measureHeroHeight);

      global.addEventListener('scroll', function () {
        // rAF throttle — only one frame per scroll burst
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(function () {
          rafPending = false;

          var scrollY = global.scrollY;
          var scrollableHeight = document.documentElement.scrollHeight - global.innerHeight;
          var scrollPercent = scrollableHeight > 0 ? Math.round((scrollY / scrollableHeight) * 100) : 0;

          // Update cached value for polling interval
          self.state.cachedScrollPercent = scrollPercent;
          if (scrollPercent >= 50) self.addScore(30, 'scrollDepthScored');

          // Scroll idle tracking
          self.state.isActivelyScrolling = true;
          if (self.state.scrollIdleTimer) clearTimeout(self.state.scrollIdleTimer);
          self.state.scrollIdleTimer = setTimeout(function () {
            self.state.isActivelyScrolling = false;
          }, 450);

          // Non-hero dwell — use cached heroHeight, no reflow
          if (!heroHeight) measureHeroHeight();
          var isPastHero = scrollY > heroHeight;
          if (isPastHero) {
            if (!nonHeroInterval && !self.state.flags.nonHeroDwellScored) {
              nonHeroTimer = 0;
              nonHeroInterval = setInterval(function () {
                nonHeroTimer++;
                if (nonHeroTimer >= 20) {
                  self.addScore(20, 'nonHeroDwellScored');
                  clearInterval(nonHeroInterval);
                  nonHeroInterval = null;
                }
              }, 1000);
            }
          } else if (nonHeroInterval) {
            clearInterval(nonHeroInterval);
            nonHeroInterval = null;
          }
        });
      }, { passive: true });
    },

    setupProductSectionObserver: function () {
      var self = this;
      var productSection = document.getElementById('products');
      if (!productSection) return;
      var productTimer = 0;
      var productInterval = null;
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (self.state.flags.productDwellScored) return;
            productTimer = 0;
            if (productInterval) clearInterval(productInterval);
            productInterval = setInterval(function () {
              productTimer++;
              if (productTimer >= 20) {
                self.addScore(40, 'productDwellScored');
                clearInterval(productInterval);
                productInterval = null;
              }
            }, 1000);
          } else if (productInterval) {
            clearInterval(productInterval);
            productInterval = null;
          }
        });
      }, { threshold: 0.35 });
      observer.observe(productSection);
    },

    checkConditionsLoop: function () {
      var self = this;
      var delaySeconds = getMqMobile() ? this.state.delayMobileSeconds : this.state.delayDesktopSeconds;
      // Cache focus state via events — avoids reading document.activeElement in polling interval
      document.addEventListener('focusin', function () { self.state.cachedHasFocus = true; });
      document.addEventListener('focusout', function () { self.state.cachedHasFocus = false; });

      setTimeout(function () {
        self.state.initialDelayReached = true;
        self.evaluateConditions();
      }, delaySeconds * 1000);

      setInterval(function () { self.evaluateConditions(); }, 1000);
    },

    evaluateConditions: function () {
      if (!this.isAutoPopupAllowed(this.state.cachedScrollPercent, this.state.cachedHasFocus)) return;
      var isMobile = getMqMobile();
      var forceAfterSeconds = isMobile ? this.state.forceShowAfterMobileSeconds : this.state.forceShowAfterDesktopSeconds;
      var elapsedSeconds = Math.floor((Date.now() - this.state.pageStartAt) / 1000);
      if (elapsedSeconds >= forceAfterSeconds) {
        this.showPopup('timed-fallback', { manual: false });
        return;
      }
      var threshold = isMobile ? this.state.scoreThresholdMobile : this.state.scoreThresholdDesktop;
      if (this.state.engagementScore >= threshold) {
        this.showPopup('engagement-score', { manual: false });
      }
    },

    updateSessionCount: function () {
      var countElement = document.getElementById('today-popup-count');
      if (!countElement) return;
      countElement.textContent = this.state.popupShownThisSession + '/' + this.state.maxPopupsPerSession;
    },

    updateTriggerReason: function (triggerReason) {
      var reasonElement = document.getElementById('trigger-reason');
      if (!reasonElement) return;
      var message = tr('popup_trigger_default', 'We noticed your interest in our products');
      if (triggerReason === 'manual-click') message = tr('popup_trigger_manual_click', 'You clicked the consultation button');
      reasonElement.innerHTML = '<span class="material-symbols-outlined">info</span><span>' + message + '</span>';
    },

    showPopup: function (triggerReason, options) {
      var manual = (options && options.manual) || false;
      var overlay = document.getElementById('smart-popup-overlay');
      if (!overlay || overlay.classList.contains('show')) return;
      if (!manual) {
        if (!this.isAutoPopupAllowed(this.state.cachedScrollPercent, this.state.cachedHasFocus)) return;
        this.state.popupShownThisSession++;
        this.state.lastPopupTime = Date.now();
        this.updateSessionCount();
      } else {
        this.state.lastPopupTime = Date.now();
      }
      this.updateTriggerReason(triggerReason);
      applyPopupVisibility();
      var scrollbarWidth = global.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = scrollbarWidth + 'px';
      document.body.style.overflow = 'hidden';
      overlay.classList.add('show');
    },

    saveConversionSuppression: function () {
      var until = Date.now() + 48 * 60 * 60 * 1000;
      this.state.suppression.convertedUntil = until;
      localStorage.setItem(this.state.storageKeys.convertedUntil, String(until));
    },

    closePopup: function (options) {
      var dismissed = (options && options.dismissed) || false;
      var converted = (options && options.converted) || false;
      var overlay = document.getElementById('smart-popup-overlay');
      if (!overlay) return;
      this.state.lastPopupTime = Date.now();
      if (dismissed) this.state.autoPopupDisabledForSession = true;
      if (converted) {
        this.state.autoPopupDisabledForSession = true;
        this.saveConversionSuppression();
      }
      overlay.classList.remove('show');
      overlay.classList.add('closing');
      function onTransitionEnd() {
        overlay.removeEventListener('transitionend', onTransitionEnd);
        overlay.classList.remove('closing');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
      overlay.addEventListener('transitionend', onTransitionEnd);
      setTimeout(function () {
        overlay.removeEventListener('transitionend', onTransitionEnd);
        overlay.classList.remove('closing');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }, 350);
    },

    setupFriendlyCloseHandlers: function () {
      var self = this;
      if (this.state.flags.friendlyHandlersBound) return;
      this.state.flags.friendlyHandlersBound = true;
      var overlay = document.getElementById('smart-popup-overlay');
      if (overlay) {
        overlay.addEventListener('click', function (e) {
          if (e.target === overlay) self.closePopup();
        });
      }
      var closeButton = document.getElementById('smart-popup-close');
      if (closeButton) {
        closeButton.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          self.closePopup({ dismissed: true });
        });
      }
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var popupOverlay = document.getElementById('smart-popup-overlay');
        if (popupOverlay && popupOverlay.classList.contains('show')) self.closePopup();
      });
    }
  };

  function showSmartPopupManual() {
    smartPopup.showPopup('manual-click', { manual: true });
  }

  function closeSmartPopup() {
    smartPopup.closePopup({ dismissed: true });
  }

  // ============================================
  // 表单提交
  // ============================================
  var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyikM1ArEFhJhQUSAp6l4DHJcGzDDK1cckL-KOrVbjipoMGSKsOOlhFWJGTPB6qOys/exec';

  function submitSmartPopupForm(event) {
    event.preventDefault();
    var form = document.getElementById('smart-popup-form');
    if (!form) { showNotification(tr('notify_form_not_found', 'Form not found'), 'error'); return; }
    var formData = {
      formType: 'smart_popup',
      name: (form.querySelector('input[name="name"]') || {}).value,
      email: (form.querySelector('input[name="email"]') || {}).value,
      phone: (form.querySelector('input[name="phone"]') || {}).value,
      country: (form.querySelector('input[name="country"]') || {}).value,
      message: (form.querySelector('textarea[name="message"]') || {}).value,
      language: getCurrentLanguage(),
      browserLanguage: navigator.language,
      screenWidth: (global.DeviceUtils && global.DeviceUtils.getScreenSize) ? global.DeviceUtils.getScreenSize() : global.screen.width,
      screenHeight: global.screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      pageUrl: global.location.href,
      timeOnPage: (userState && userState.timeOnPage) || 0,
      scrollDepth: (userState && userState.scrollDepth) || 0,
      userAgent: navigator.userAgent
    };
    showNotification(tr('notify_submitting_info', 'Submitting your information...'), 'success');
    fetch(FORM_ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      .then(function () {
        showNotification(tr('notify_submit_success', 'Submitted successfully!'), 'success');
        form.reset();
        setTimeout(function () { smartPopup.closePopup({ converted: true }); }, 500);
      })
      .catch(function (error) {
        console.error('提交失败:', error);
        showNotification(tr('notify_submit_received', 'Submitted successfully! We have received your information.'), 'success');
        form.reset();
        setTimeout(function () { smartPopup.closePopup({ converted: true }); }, 500);
      });
  }

  function submitContactForm(event) {
    event.preventDefault();
    var form = document.getElementById('contact-form');
    if (!form) { showNotification(tr('notify_form_not_found', 'Form not found'), 'error'); return; }
    var formData = {
      formType: 'contact_page',
      name: (form.querySelector('input[name="name"]') || {}).value || '',
      company: (form.querySelector('input[name="company"]') || {}).value || '',
      email: (form.querySelector('input[name="email"]') || {}).value || '',
      phone: (form.querySelector('input[name="phone"]') || {}).value || '',
      country: (form.querySelector('input[name="country"]') || {}).value || '',
      message: (form.querySelector('textarea[name="message"]') || {}).value || '',
      language: getCurrentLanguage(),
      browserLanguage: navigator.language,
      screenWidth: (global.DeviceUtils && global.DeviceUtils.getScreenSize) ? global.DeviceUtils.getScreenSize() : global.screen.width,
      screenHeight: global.screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      pageUrl: global.location.href,
      timeOnPage: (userState && userState.timeOnPage) || 0,
      scrollDepth: (userState && userState.scrollDepth) || 0,
      userAgent: navigator.userAgent
    };
    showNotification(tr('notify_sending_inquiry', 'Sending your inquiry...'), 'success');
    fetch(FORM_ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      .then(function () {
        showNotification(tr('notify_submit_success', 'Submitted successfully!'), 'success');
      })
      .catch(function (error) {
        console.warn('Fetch 失败，降级到 mailto 备用方案', error);
        submitViaMailto(formData, 'contact_page');
      });
  }

  function submitViaMailto(formData, formType) {
    var screenWidth = (global.DeviceUtils && global.DeviceUtils.getScreenSize) ? global.DeviceUtils.getScreenSize() : global.screen.width;
    var subject = encodeURIComponent(
      (formType === 'smart_popup' ? tr('mailto_subject_smart_popup', 'Smart Popup') : tr('mailto_subject_contact_form', 'Contact Form')) +
      ' ' + tr('mailto_subject_inquiry', 'Inquiry') + ' - ' + formData.name
    );
    var body = encodeURIComponent([
      tr('mailto_label_name', 'Name') + ': ' + formData.name,
      tr('mailto_label_email', 'Email') + ': ' + formData.email,
      tr('mailto_label_phone', 'Phone') + ': ' + formData.phone,
      tr('mailto_label_company', 'Company') + ': ' + (formData.company || tr('mailto_not_provided', 'Not provided')),
      tr('mailto_label_country', 'Country') + ': ' + (formData.country || tr('mailto_not_provided', 'Not provided')),
      tr('mailto_label_message', 'Message') + ': ' + formData.message,
      '',
      '------------ ' + tr('mailto_section_user_info', 'User Information') + ' ------------',
      tr('mailto_label_user_language', 'User Language') + ': ' + getCurrentLanguage(),
      tr('mailto_label_browser_language', 'Browser Language') + ': ' + navigator.language,
      tr('mailto_label_screen_resolution', 'Screen Resolution') + ': ' + screenWidth + 'x' + global.screen.height,
      tr('mailto_label_timezone', 'Timezone') + ': ' + Intl.DateTimeFormat().resolvedOptions().timeZone,
      tr('mailto_label_page_url', 'Page URL') + ': ' + global.location.href,
      tr('mailto_label_submit_time', 'Submit Time') + ': ' + new Date().toLocaleString(),
      tr('mailto_label_time_on_page', 'Time on Page') + ': ' + (userState.timeOnPage || 0) + tr('mailto_unit_seconds', 's'),
      tr('mailto_label_scroll_depth', 'Scroll Depth') + ': ' + (userState.scrollDepth || 0) + '%',
      '------------ ' + tr('mailto_section_browser_info', 'Browser Information') + ' ------------',
      tr('mailto_label_user_agent', 'User Agent') + ': ' + navigator.userAgent
    ].join('\n'));
    global.location.href = 'mailto:179564128@qq.com?subject=' + subject + '&body=' + body;
  }

  // ─── Expose ───────────────────────────────────────────────────────────────
  global.smartPopup             = smartPopup;
  global.userState              = userState;
  global.isTestEnvironment      = isTestEnvironment;
  global.loadUserState          = loadUserState;
  global.saveUserState          = saveUserState;
  global.trackScrollDepth       = trackScrollDepth;
  global.trackTimeOnPage        = trackTimeOnPage;
  global.showSmartPopupManual   = showSmartPopupManual;
  global.closeSmartPopup        = closeSmartPopup;
  global.submitSmartPopupForm   = submitSmartPopupForm;
  global.submitContactForm      = submitContactForm;
  global.submitViaMailto        = submitViaMailto;

}(window));
