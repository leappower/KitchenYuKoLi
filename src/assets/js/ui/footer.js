/**
 * footer.js — Mobile & Tablet Bottom Navigation Bar + PC Site Footer
 *
 * Mobile (<768px): 4 items — 首页/产品/案例/WhatsApp
 * Tablet (768-1024px): 6 items — 首页/产品/场景/回报/关于/WhatsApp
 * PC (>=1024px): Full site footer (4-column) with legal modal triggers
 */
(function (window) {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (key == null) key = evt + ":" + (++_spaRegs.__k || (_spaRegs.__k = 1));
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  var resizeTimer;

  /* ─── Mobile items (4) ─── */
  var mobileItems = [
    { id: "home", icon: "home", key: "nav_home", href: "/home/", fill: true },
    { id: "products", icon: "kitchen", key: "nav_products", href: "/products/", fill: false },
    { id: "profit", icon: "calculate", key: "nav_roi", href: "/profit-calculator/", fill: false },
    { id: "whatsapp", icon: "chat", key: "nav_whatsapp", href: "", fill: false, isWhatsApp: true },
  ];

  /* ─── Tablet items (6) — matches footer spec ─── */
  var tabletItems = [
    { id: "home", icon: "home", key: "nav_home", href: "/home/", fill: true },
    { id: "products", icon: "kitchen", key: "nav_products", href: "/products/", fill: false },
    { id: "applications", icon: "monitoring", key: "nav_applications", href: "/applications/", fill: false },
    { id: "profit", icon: "calculate", key: "nav_roi", href: "/profit-calculator/", fill: false },
    { id: "about", icon: "info", key: "nav_about", href: "/about/", fill: false },
    { id: "whatsapp", icon: "chat", key: "nav_whatsapp", href: "", fill: false, isWhatsApp: true },
  ];

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function getItemsForVariant(variant) {
    return variant === "tablet" ? tabletItems : mobileItems;
  }

  function buildItemHtml(item, activeId) {
    var isActive = item.id === activeId;
    var colorClass = isActive ? "text-primary" : "text-slate-400 dark:text-slate-500";
    var fillStyle = isActive && item.fill ? " style=\"font-variation-settings: 'FILL' 1;\"" : "";
    var label = item.key
      ? '<p class="text-[10px] font-bold uppercase tracking-wider text-center" data-i18n="' +
        esc(item.key) +
        '">' +
        esc(item.key) +
        "</p>"
      : "";
    var waHref = "https://wa.me/" + (window.Contacts ? window.Contacts.whatsapp : "8613163756465");

    if (item.isWhatsApp) {
      return (
        '<a class="whatsapp-tab-item relative flex flex-1 flex-col items-center justify-center gap-1 text-[#25d366]" ' +
        'href="' +
        waHref +
        '" data-wa-message-key="wa_msg_contact" data-wa-source="footer-tab" ' +
        'target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">' +
        '<span class="material-symbols-outlined relative" style="font-size:26px">' +
        esc(item.icon) +
        "</span>" +
        label +
        "</a>"
      );
    }

    return (
      '<a class="relative flex flex-1 flex-col items-center justify-center gap-1 ' +
      colorClass +
      '" href="' +
      esc(item.href) +
      '">' +
      '<span class="material-symbols-outlined relative"' +
      fillStyle +
      ">" +
      esc(item.icon) +
      "</span>" +
      label +
      "</a>"
    );
  }

  function buildBarHtml(variant, activeId) {
    var items = getItemsForVariant(variant);
    var tabletClass = variant === "tablet" ? " max-w-3xl mx-auto" : "";
    var pbSafe = variant === "tablet" ? " pb-3" : " pb-6";

    var itemsHtml = items
      .map(function (item) {
        return buildItemHtml(item, activeId);
      })
      .join("\n");

    return (
      '<div class="fixed bottom-0 left-0 right-0 z-[var(--z-footer)]">' +
      '<div class="flex gap-2 border-t border-slate-200 dark:border-slate-800 ' +
      "bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4" +
      pbSafe +
      " pt-2" +
      tabletClass +
      '">' +
      itemsHtml +
      "</div></div>"
    );
  }

  /* ─── Mobile/Tablet Site Footer (compact) ─── */
  function buildMobileFooterHtml() {
    return (
      '<div class="bg-slate-900 text-white">' +
      '<div class="section-content mx-auto px-3 sm:px-5 py-4 sm:py-6" style="max-width:1440px">' +
      // Mobile (<768px): compact 1-column, Tablet (768-1024): 2-column grid
      '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">' +
      /* Products */
      '<div class="text-center lg:text-left">' +
      '<h4 class="text-xs sm:text-sm font-bold uppercase tracking-wider mb-2 text-center lg:text-left" data-i18n="footer_products_title">Products</h4>' +
      '<ul class="space-y-1 text-xs sm:text-sm text-slate-300">' +
      '<li><a href="/products/all/" class="hover:text-white transition-colors" data-i18n="nav_products">All Products</a></li>' +
      '<li><a href="/products/stirfry/" class="hover:text-white transition-colors" data-i18n="nav_products_stirfry">Stir-fry Series</a></li>' +
      '<li><a href="/products/stewing/" class="hover:text-white transition-colors" data-i18n="nav_products_stewing">Stewing Series</a></li>' +
      '<li><a href="/products/frying/" class="hover:text-white transition-colors" data-i18n="nav_products_frying">Deep Fryer</a></li>' +
      '<li><a href="/products/steaming/" class="hover:text-white transition-colors" data-i18n="nav_products_steaming">Steaming Series</a></li>' +
      '<li><a href="/products/cutting/" class="hover:text-white transition-colors" data-i18n="nav_products_cutting">Prep &amp; Cutting</a></li>' +
      '</ul></div>' +
      /* Applications */
      '<div class="block text-center lg:text-left">' +
      '<h4 class="text-xs sm:text-sm font-bold uppercase tracking-wider mb-2 text-center lg:text-left" data-i18n="footer_applications_title">Applications</h4>' +
      '<ul class="space-y-1 text-xs sm:text-sm text-slate-300">' +
      '<li><a href="/applications/canteen/" class="hover:text-white transition-colors" data-i18n="nav_applications_canteen">School/Corporate</a></li>' +
      '<li><a href="/applications/small-restaurant/" class="hover:text-white transition-colors" data-i18n="nav_applications_small_restaurant">Small Restaurant</a></li>' +
      '<li><a href="/applications/central-kitchen/" class="hover:text-white transition-colors" data-i18n="nav_applications_central_kitchen">Central Kitchen</a></li>' +
      '<li><a href="/applications/restaurant-chain/" class="hover:text-white transition-colors" data-i18n="nav_applications_chain_restaurant">Chain</a></li>' +
      '<li><a href="/applications/cloud-kitchen/" class="hover:text-white transition-colors" data-i18n="nav_applications_cloud_kitchen">Cloud Kitchen</a></li>' +
      '</ul></div>' +
      /* Support (shown on md+) */
      '<div class="hidden md:block">' +
      '<h4 class="text-xs sm:text-sm font-bold uppercase tracking-wider mb-2 lg:text-left" data-i18n="footer_support_title">Support</h4>' +
      '<ul class="space-y-1 text-xs sm:text-sm text-slate-300">' +
      '<li><a href="/support/" class="hover:text-white transition-colors" data-i18n="nav_support_services">Service Centers</a></li>' +
      '<li><a href="/support/warranty/" class="hover:text-white transition-colors" data-i18n="nav_support_warranty">Warranty</a></li>' +
      '<li><a href="/support/faq/" class="hover:text-white transition-colors" data-i18n="nav_support_faq">Technical FAQ</a></li>' +
      '<li><a href="/support/installation/" class="hover:text-white transition-colors" data-i18n="nav_support_installation">Installation</a></li>' +
      '<li><a href="/support/spare-parts/" class="hover:text-white transition-colors" data-i18n="nav_support_spare_parts">Spare Parts</a></li>' +
      '<li><a href="/support/training/" class="hover:text-white transition-colors" data-i18n="nav_support_training">Training</a></li>' +
      '</ul></div>' +
      /* Legal (shown on md+) */
      '<div class="hidden md:block lg:text-left">' +
      '<h4 class="text-xs sm:text-sm font-bold uppercase tracking-wider mb-2 lg:text-left" data-i18n="footer_legal_title">Legal</h4>' +
      '<ul class="space-y-1 text-xs sm:text-sm text-slate-300">' +
      '<li><a href="/privacy/" class="hover:text-white transition-colors" data-i18n="footer_legal_privacy_policy">Privacy Policy</a></li>' +
      '<li><a href="/terms/" class="hover:text-white transition-colors" data-i18n="footer_legal_user_agreement">User Agreement</a></li>' +
      '</ul></div>' +
      '</div>' +
      /* Legal + Copyright */
      '<div class="border-t border-white/20 pt-3 sm:pt-4 flex flex-col items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-400">' +
      '<div class="flex gap-3 sm:gap-4">' +
      '<a href="/privacy/" class="hover:text-white transition-colors" data-i18n="footer_legal_privacy_policy">Privacy Policy</a>' +
      '<a href="/terms/" class="hover:text-white transition-colors" data-i18n="footer_legal_user_agreement">User Agreement</a>' +
      '</div>' +
      '<p data-i18n="footer_copyright"></p>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  /* ─── PC Footer ─── */
  function buildPCFooterHtml() {
    return (
      '<div class="bg-slate-900 text-white">' +
      '<div class="section-content mx-auto px-3 sm:px-5 xl:px-10 pt-8 sm:pt-12 pb-6 sm:pb-8" style="max-width:1440px">' +
      '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">' +
      /* Products */
      "<div>" +
      '<h4 class="text-xs sm:text-sm font-bold uppercase tracking-wider mb-2 sm:mb-4" data-i18n="footer_products_title">Products</h4>' +
      '<ul class="space-y-1 sm:space-y-2 text-xs sm:text-sm text-slate-300">' +
      '<li><a href="/products/all/" class="hover:text-white transition-colors" data-i18n="nav_products">All Products</a></li>' +
      '<li><a href="/products/stirfry/" class="hover:text-white transition-colors" data-i18n="nav_products_stirfry">Stir-fry Equipment</a></li>' +
      '<li><a href="/products/stewing/" class="hover:text-white transition-colors" data-i18n="nav_products_stewing">Stewing Equipment</a></li>' +
      '<li><a href="/products/frying/" class="hover:text-white transition-colors" data-i18n="nav_products_frying">Frying Equipment</a></li>' +
      '<li><a href="/products/steaming/" class="hover:text-white transition-colors" data-i18n="nav_products_steaming">Steaming Equipment</a></li>' +
      '<li><a href="/products/cutting/" class="hover:text-white transition-colors" data-i18n="nav_products_cutting">Prep &amp; Cutting</a></li>' +
      "</ul>" +
      "</div>" +
      /* Applications */
      "<div>" +
      '<h4 class="text-xs sm:text-sm font-bold uppercase tracking-wider mb-2 sm:mb-4" data-i18n="footer_applications_title">Applications</h4>' +
      '<ul class="space-y-1 sm:space-y-2 text-xs sm:text-sm text-slate-300">' +
      '<li><a href="/applications/canteen/" class="hover:text-white transition-colors" data-i18n="nav_applications_canteen">School &amp; Corporate Canteens</a></li>' +
      '<li><a href="/applications/small-restaurant/" class="hover:text-white transition-colors" data-i18n="nav_applications_small_restaurant">Small Restaurants</a></li>' +
      '<li><a href="/applications/central-kitchen/" class="hover:text-white transition-colors" data-i18n="nav_applications_central_kitchen">Central Kitchens</a></li>' +
      '<li><a href="/applications/restaurant-chain/" class="hover:text-white transition-colors" data-i18n="nav_applications_chain_restaurant">Restaurant Chains</a></li>' +
      '<li><a href="/applications/cloud-kitchen/" class="hover:text-white transition-colors" data-i18n="nav_applications_cloud_kitchen">Cloud Kitchens</a></li>' +
      "</ul>" +
      "</div>" +
      /* Support */
      "<div>" +
      '<h4 class="text-xs sm:text-sm font-bold uppercase tracking-wider mb-2 sm:mb-4" data-i18n="footer_support_title">Support</h4>' +
      '<ul class="space-y-1 sm:space-y-2 text-xs sm:text-sm text-slate-300">' +
      '<li><a href="/support/" class="hover:text-white transition-colors" data-i18n="nav_support_services">Technical Services</a></li>' +
      '<li><a href="/support/warranty/" class="hover:text-white transition-colors" data-i18n="nav_support_warranty">Warranty</a></li>' +
      '<li><a href="/support/faq/" class="hover:text-white transition-colors" data-i18n="nav_support_faq">FAQ</a></li>' +
      '<li><a href="/support/installation/" class="hover:text-white transition-colors" data-i18n="nav_support_installation">Installation Guide</a></li>' +
      '<li><a href="/support/spare-parts/" class="hover:text-white transition-colors" data-i18n="nav_support_spare_parts">Spare Parts</a></li>' +
      '<li><a href="/support/training/" class="hover:text-white transition-colors" data-i18n="nav_support_training">Training</a></li>' +
      "</ul>" +
      "</div>" +
      /* Legal */
      "<div>" +
      '<h4 class="text-xs sm:text-sm font-bold uppercase tracking-wider mb-2 sm:mb-4" data-i18n="footer_legal_title">Legal</h4>' +
      '<ul class="space-y-1 sm:space-y-2 text-xs sm:text-sm text-slate-300">' +
      '<li><a href="/privacy/" class="hover:text-white transition-colors" data-i18n="footer_legal_privacy_policy">Privacy Policy</a></li>' +
      '<li><a href="/terms/" class="hover:text-white transition-colors" data-i18n="footer_legal_user_agreement">User Agreement</a></li>' +
      "</ul>" +
      "</div>" +
      "</div>" +
      '<div class="border-t border-white/20 mt-6 pt-6 text-center text-xs sm:text-sm text-slate-400">' +
      '<p data-i18n="footer_copyright"></p>' +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function mount() {
    var footers = document.querySelectorAll('footer[data-component="footer"]');

    // Defensive: if no footer placeholder exists, create one
    if (footers.length === 0) {
      var f = document.createElement("footer");
      f.setAttribute("data-component", "footer");
      f.setAttribute("data-active", "");
      document.body.appendChild(f);
      footers = [f];
    }

    var w = window.innerWidth;

    for (var i = 0; i < footers.length; i++) {
      var footer = footers[i];
      var _variant = footer.getAttribute("data-variant") || "mobile";
      var activeId = footer.getAttribute("data-active") || "";

      // PC (>=1024px) → render full site footer
      if (w >= 1024) {
        footer.style.display = "";
        footer.innerHTML = buildPCFooterHtml();
        continue;
      }

      // Use tablet items for 768-1024, mobile items for <768
      var resolvedVariant = w >= 768 ? "tablet" : "mobile";

      footer.style.display = "";
      footer.innerHTML = buildMobileFooterHtml() + buildBarHtml(resolvedVariant, activeId);
    }

    // Fade-in animation
    var bar = document.querySelector(".fixed.bottom-0");
    if (bar) {
      bar.style.opacity = "0";
      bar.style.transition = "opacity 0.15s ease-out";
    }

    // Apply translations
    if (window.translationManager && typeof window.translationManager.applyTranslations === "function") {
      window.translationManager.applyTranslations();
    }

    window.requestAnimationFrame(function () {
      if (bar) bar.style.opacity = "1";
    });
  }

  /* ─── Handle bfcache (back/forward) ─── */
  _spaOn(
    window,
    "pageshow",
    function (e) {
      if (!e.persisted) return;
      var needsRemount = false;
      var footers = document.querySelectorAll('footer[data-component="footer"]');
      for (var i = 0; i < footers.length; i++) {
        if (!footers[i].querySelector || !footers[i].querySelector(".fixed.bottom-0")) {
          needsRemount = true;
          break;
        }
      }
      if (!document.querySelector(".fixed.bottom-0")) needsRemount = true;
      if (needsRemount) mount();
    },
    "footer:pageshow"
  );

  /* ─── Public API ─── */
  window.Footer = {
    mount: mount,
    updateActive: function (newActiveId) {
      newActiveId = newActiveId || "";
      // Collect all items from both lists
      var allItems = mobileItems.concat(tabletItems);
      var links = document.querySelectorAll(".fixed.bottom-0 a[href]");
      if (links.length === 0) return;

      var currentPath = window.location.pathname.replace(/\/$/, "") || "/";

      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        var href = link.getAttribute("href") || "";
        // Skip external links
        if (href.startsWith("http") || href.indexOf("wa.me") >= 0) continue;

        var matched = null;
        for (var j = 0; j < allItems.length; j++) {
          var itemHref = allItems[j].href;
          var linkHref = href;
          if (itemHref.endsWith("/")) itemHref = itemHref.slice(0, -1);
          if (linkHref.endsWith("/")) linkHref = linkHref.slice(0, -1);
          if (itemHref === linkHref) {
            matched = allItems[j];
            break;
          }
        }

        // Fallback: if no exact match, check if current path starts with this item's base path
        // e.g. /products/stirfry/ starts with /products/ → highlight products
        if (!matched && newActiveId) {
          for (var k = 0; k < allItems.length; k++) {
            var baseHref = allItems[k].href.replace(/\/$/, "");
            if (baseHref && currentPath.indexOf(baseHref) === 0 && allItems[k].id === newActiveId) {
              matched = allItems[k];
              break;
            }
          }
        }

        var isActive = matched && matched.id === newActiveId;
        var icon = link.querySelector(".material-symbols-outlined");

        if (isActive) {
          link.className = "flex flex-1 flex-col items-center justify-center gap-1 text-primary";
          if (icon && matched.fill) icon.setAttribute("style", "font-variation-settings: 'FILL' 1;");
        } else {
          link.className = "flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500";
          if (icon) icon.removeAttribute("style");
        }
      }
    },
  };

  /* ─── Init ─── */
  if (document.readyState === "loading") {
    _spaOn(document, "DOMContentLoaded", mount, "footer:DOMContentLoaded");
  } else {
    mount();
  }

  /* ─── Resize handler ─── */
  _spaOn(
    window,
    "resize",
    function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(mount, 200);
    },
    "footer:resize"
  );
})(window);
