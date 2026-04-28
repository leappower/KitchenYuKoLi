/**
 * contacts.js — Contact channel launchers + notification toast (IIFE build for src/ static HTML)
 * Synced from: src/assets/contacts.js
 * Global: window.Contacts
 *
 * 注意：window.showNotification 由 page-interactions.js 的 Toast 系统统一注册（DOMContentLoaded 后）。
 * contacts.js 内部的 _showNotification 仅作 fallback，供 DOMContentLoaded 之前的调用（极少情况）。
 *
 * Usage: <script src="../../assets/js/contacts.js"></script>
 */
(function (global) {
  "use strict";

  // ============================================
  // CONTACT CHANNEL CONFIG
  // ============================================
  /** 规范 WhatsApp 号码（不含 +），其他模块可通过 window.Contacts.whatsapp 读取，避免多处硬编码 */
  var WHATSAPP_NUMBER = "8613163756465";

  // ============================================
  // WHATSAPP SOURCE TRACKING
  // ============================================
  /** Page path → display name mapping for WhatsApp source tracking */
  var PAGE_NAMES = {
    "/support/": "售后支持",
    "/support/installation/": "安装服务",
    "/support/spare-parts/": "配件服务",
    "/support/training/": "操作培训",
    "/support/warranty/": "质保政策",
    "/support/faq/": "常见问题",
    "/products/": "产品中心",
    "/products/detail/": "产品详情",
    "/quote/": "在线询价",
    "/contact/": "联系我们",
    "/landing/": "着陆页",
    "/home/": "首页",
    "/solutions/": "解决方案",
    "/roi/": "ROI计算器",
    "/about/": "关于我们",
    "/news/": "新闻资讯",
    "/thank-you/": "感谢页",
  };

  function getPageName() {
    var path = global.location.pathname.replace(/\/index-(pc|mobile|tablet)\.html$/, "/");
    if (PAGE_NAMES[path]) return PAGE_NAMES[path];
    var keys = Object.keys(PAGE_NAMES).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < keys.length; i++) {
      if (path.indexOf(keys[i]) !== -1) return PAGE_NAMES[keys[i]];
    }
    return "网站";
  }

  /**
   * Build a tracked WhatsApp URL with source information.
   * @param {Object} opts
   * @param {string} [opts.pageName] - Override page name (auto-detected if omitted)
   * @param {string} [opts.source] - Location description (e.g. "hero", "contact-card", "bottom-cta")
   * @param {string} [opts.button] - Button/link text for identification
   * @param {string} [opts.message] - Additional custom message to append
   * @returns {string} Full wa.me URL with pre-filled text
   */
  function contactsWhatsApp(opts) {
    opts = opts || {};
    var pageName = opts.pageName || getPageName();
    var source = opts.source || "";
    var button = opts.button || "";
    var message = opts.message || "";

    var text = "Hi YuKoLi";
    if (source) text += " [" + source + "]";
    if (message) text += "\n" + message;

    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text);
  }

  /**
   * Extract visible text from a link element, ignoring icon children.
   */
  function getLinkText(el) {
    var text = "";
    if (el.textContent) {
      text = el.textContent.trim().replace(/\s+/g, " ").substring(0, 30);
    }
    return text;
  }

  /**
   * Initialize WhatsApp source tracking on all wa.me links.
   * Intercepts clicks to add source/page/button info to the pre-filled message.
   * Call on DOMContentLoaded or after SPA navigation.
   */
  function initWhatsAppLinks() {
    var links = document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
    for (var i = 0; i < links.length; i++) {
      if (links[i].dataset.waInit === "1") continue;
      links[i].dataset.waInit = "1";

      (function (link) {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var source = link.dataset.waSource || "";
          var btnText = link.dataset.waBtn || getLinkText(link) || "";
          var url = contactsWhatsApp({ source: source, button: btnText });
          global.open(url, "_blank", "noopener,noreferrer");
        });
      })(links[i]);
    }
  }

  // ============================================
  // QUOTE FORM MESSAGE BUILDER
  // ============================================
  function getVal(id) {
    var el = document.getElementById(id);
    if (!el) return "";
    if (el.tagName === "SELECT") {
      return el.value ? el.options[el.selectedIndex].text : "";
    }
    return el.value.trim();
  }
  function buildQuoteMessage() {
    // Use i18n for labels if available, otherwise raw key (English fallback)
    var t = function(key) {
      if (global.translationManager && typeof global.translationManager.translate === 'function') {
        var v = global.translationManager.translate(key);
        if (v && v !== key) return v;
      }
      // Fallback: strip quote_ prefix, replace _ with space
      return key.replace('quote_', '').replace(/_/g, ' ');
    };

    var company = getVal("q-company");
    var contact = getVal("q-contact");
    var phone = getVal("q-phone");
    var email = getVal("q-email");
    var country = getVal("q-country");
    var equipType = getVal("q-equipment-type");
    var quantity = getVal("q-quantity") || "";
    var capacity = getVal("q-capacity") || "";
    var budget = getVal("q-budget") || "";
    var message = getVal("q-message") || "";

    // Only include filled fields, labels in current UI language
    var lines = [];
    if (company) lines.push("🏢 " + t("quote_company_name") + ": " + company);
    if (contact) lines.push("👤 " + t("quote_contact_person") + ": " + contact);
    if (phone) lines.push("📞 " + t("quote_phone") + ": " + phone);
    if (email) lines.push("📧 " + t("quote_email_address") + ": " + email);
    if (country) lines.push("🌍 " + t("quote_country_region") + ": " + country);
    if (equipType) lines.push("🍽️ " + t("quote_equipment_type") + ": " + equipType);
    if (quantity) lines.push("📦 " + t("quote_quantity") + ": " + quantity);
    if (capacity) lines.push("🏭 " + t("quote_kitchen_capacity") + ": " + capacity);
    if (budget) lines.push("💰 " + t("quote_budget_range") + ": " + budget);
    if (message) lines.push("📝 " + t("quote_detailed_requirements") + ": " + message);
    lines.push("🔗 " + global.location.href);

    return lines.length > 1
      ? "🔧 " + t("quote_get_quote") + "\n" + lines.join("\n")
      : "🔧 " + t("quote_get_quote") + " — " + global.location.href;
  }

  // ============================================
  // CONTACT CHANNEL LAUNCHERS
  // ============================================
  function startWhatsApp() {
    var text = buildQuoteMessage();
    var url = contactsWhatsApp({ source: "询价表单", message: text });
    global.open(url, "_blank");
  }
  function startLine() {
    global.open("https://line.me/ti/p/+66840273150", "_blank");
  }
  function startPhone() {
    global.location.href = "tel:+" + WHATSAPP_NUMBER;
  }
  function startTelegram() {
    global.open("https://t.me/baeckerei-profi", "_blank");
  }
  function startEmail() {
    var subject = "YuKoLi 智能厨具询价";
    var body = buildQuoteMessage();
    global.location.href = "mailto:support@yukoli.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }
  function startFacebook() {
    global.open("https://www.facebook.com/people/Yukoli-Technology-Co-Ltd/61579549730250/", "_blank");
  }
  function startInstagram() {
    global.open("https://instagram.com/baeckerei.profi", "_blank");
  }
  function startTwitter() {
    global.open("https://twitter.com/baeckerei_profi", "_blank");
  }
  function startLinkedIn() {
    global.open("https://linkedin.com/company/baeckereitechnik-profi", "_blank");
  }
  /**
   * startTikTok 优先调用 window.showNotification（page-interactions.js Toast 注册后）。
   * 若 Toast 尚未就绪（脚本早于 DOMContentLoaded 执行），降级到 _showNotification。
   */
  function startTikTok() {
    var notify = typeof global.showNotification === "function" ? global.showNotification : _showNotification;
    notify("Coming Soon", "success");
  }

  // ============================================
  // NOTIFICATION SYSTEM（内部 fallback，仅供 contacts.js 自身使用）
  // ============================================
  /**
   * 轻量级 slide-in 通知。仅作 fallback，正式通知由 page-interactions.js Toast 系统负责。
   * 外部代码应调用 window.showNotification（由 Toast 系统注册），而非直接调此函数。
   */
  function _showNotification(message, type) {
    if (type === undefined) type = "success";
    var container = document.getElementById("notification-container") || _createNotificationContainer();
    var notification = document.createElement("div");
    notification.className =
      "notification flex items-center gap-3 p-4 rounded-lg shadow-lg mb-3 transform translate-x-full transition-transform duration-300 " +
      (type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white");
    notification.innerHTML =
      '<span class="material-symbols-outlined">' +
      (type === "success" ? "check_circle" : "error") +
      "</span>" +
      '<span class="text-sm font-medium">' +
      message +
      "</span>";
    container.appendChild(notification);
    setTimeout(function () {
      notification.classList.remove("translate-x-full");
    }, 10);
    setTimeout(function () {
      notification.classList.add("translate-x-full");
      setTimeout(function () {
        notification.remove();
      }, 300);
    }, 4000);
  }

  function _createNotificationContainer() {
    var container = document.createElement("div");
    container.id = "notification-container";
    container.className = "fixed top-20 right-4 z-[200] max-w-sm";
    document.body.appendChild(container);
    return container;
  }

  // Expose to global
  global.Contacts = {
    whatsapp: WHATSAPP_NUMBER,
    contactsWhatsApp: contactsWhatsApp,
    whatsappUrl: contactsWhatsApp, // shorthand alias
    getPageName: getPageName,
    initWhatsAppLinks: initWhatsAppLinks,
    startWhatsApp: startWhatsApp,
    startLine: startLine,
    startPhone: startPhone,
    startTelegram: startTelegram,
    startEmail: startEmail,
    startFacebook: startFacebook,
    startInstagram: startInstagram,
    startTwitter: startTwitter,
    startLinkedIn: startLinkedIn,
    startTikTok: startTikTok,
    /** @deprecated 使用 window.showNotification（由 page-interactions.js Toast 注册）代替 */
    showNotification: _showNotification,
    createNotificationContainer: _createNotificationContainer,
  };

  // Also expose individual functions at window level for inline onclick usage
  // 注意：window.showNotification 和 createNotificationContainer 不再由此文件注册，
  //       改由 page-interactions.js initToastSystem() 在 DOMContentLoaded 后统一管理。
  global.startWhatsApp = startWhatsApp;
  global.startLine = startLine;
  global.startPhone = startPhone;
  global.startTelegram = startTelegram;
  global.startEmail = startEmail;
  global.startFacebook = startFacebook;
  global.startInstagram = startInstagram;
  global.startTwitter = startTwitter;
  global.startLinkedIn = startLinkedIn;
  global.startTikTok = startTikTok;

  // Auto-init WhatsApp source tracking on all wa.me links
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWhatsAppLinks);
  } else {
    initWhatsAppLinks();
  }
  // Re-init after SPA navigation
  document.addEventListener("spa:load", initWhatsAppLinks);
  // Re-init after bfcache restore
  global.addEventListener("pageshow", function (e) {
    if (e.persisted) initWhatsAppLinks();
  });
})(window);
