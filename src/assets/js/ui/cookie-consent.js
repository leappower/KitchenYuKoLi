(function () {
  "use strict";

  var STORAGE_KEY = "cookieConsent";

  function alreadyAccepted() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      return data && data.accepted === true;
    } catch (_) {
      return false;
    }
  }

  if (alreadyAccepted()) return;

  document.addEventListener("DOMContentLoaded", function () {
    if (alreadyAccepted()) return;

    var banner = document.createElement("div");
    banner.id = "cookie-consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.className =
      "fixed bottom-0 left-0 right-0 z-[var(--z-footer,10)] " +
      "bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md " +
      "border-t border-slate-700 dark:border-slate-800 " +
      "px-4 py-4 sm:px-6 sm:py-5 " +
      "transform translate-y-0 transition-transform duration-300";

    banner.innerHTML =
      '<div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">' +
      '<div class="flex-1">' +
      '<p class="text-sm font-bold text-white mb-1" data-i18n="cookie_consent_title">We use cookies</p>' +
      '<p class="text-xs sm:text-sm text-slate-300 leading-relaxed" data-i18n="cookie_consent_text">' +
      "We use cookies to improve your experience. By continuing to visit this site you agree to our use of cookies." +
      "</p>" +
      "</div>" +
      '<div class="flex items-center gap-2 flex-shrink-0">' +
      '<button id="cookie-consent-decline" class="' +
      "px-4 py-2 text-sm font-semibold rounded-lg " +
      "border border-slate-600 text-slate-300 hover:bg-slate-800 " +
      'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500" ' +
      'data-i18n="cookie_consent_decline">Decline</button>' +
      '<button id="cookie-consent-accept" class="' +
      "px-4 py-2 text-sm font-semibold rounded-lg " +
      "bg-primary hover:bg-primary/90 text-white " +
      'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500" ' +
      'data-i18n="cookie_consent_accept">Accept</button>' +
      "</div>" +
      "</div>";

    document.body.appendChild(banner);

    if (window.__applyTranslations) {
      window.__applyTranslations();
    }

    function dismiss() {
      banner.style.transform = "translateY(100%)";
      banner.style.opacity = "0";
      setTimeout(function () {
        banner.remove();
      }, 300);
    }

    function accept() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            accepted: true,
            date: new Date().toISOString(),
          })
        );
      } catch (_) {
        /* quota exceeded — ignore */
      }
      dismiss();
    }

    document.getElementById("cookie-consent-accept").addEventListener("click", accept);
    document.getElementById("cookie-consent-decline").addEventListener("click", dismiss);
  });
})();
