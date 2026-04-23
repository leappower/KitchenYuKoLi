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

    // Only include filled fields
    var lines = [];
    if (company) lines.push("🏢 公司: " + company);
    if (contact) lines.push("👤 联系人: " + contact);
    if (phone) lines.push("📞 电话: " + phone);
    if (email) lines.push("📧 邮箱: " + email);
    if (country) lines.push("🌍 国家: " + country);
    if (equipType) lines.push("🍽️ 设备类型: " + equipType);
    if (quantity) lines.push("📦 数量: " + quantity);
    if (capacity) lines.push("🏭 厨房规模: " + capacity);
    if (budget) lines.push("💰 预算: " + budget);
    if (message) lines.push("📝 需求: " + message);
    lines.push("🔗 页面: " + global.location.href);

    return lines.length > 1
      ? "🔧 YuKoLi 智能厨具询价\n━━━━━━━━━━━━━━\n" + lines.join("\n")
      : "🔧 YuKoLi 智能厨具询价 — 来自 " + global.location.href;
  }

  // ============================================
  // CONTACT CHANNEL LAUNCHERS
  // ============================================
  function startWhatsApp() {
    var text = buildQuoteMessage();
    var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text);
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
})(window);
