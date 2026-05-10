/**
 * footer.js — Mobile & Tablet Bottom Navigation Bar
 *
 * Mobile (<768px): 4 items — 首页/产品/案例/WhatsApp
 * Tablet (768-1024px): 6 items — 首页/产品/场景/回报/关于/WhatsApp
 * PC (>=1024px): hidden
 */
(function (window) {
  "use strict";

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
      ? '<p class="text-[10px] font-bold uppercase tracking-wider" data-i18n="' +
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

      // PC (>=1024px) → hidden
      // Resolve real variant based on screen width
      if (w >= 1024) {
        footer.innerHTML = "";
        footer.style.display = "none";
        continue;
      }

      // Use tablet items for 768-1024, mobile items for <768
      var resolvedVariant = w >= 768 ? "tablet" : "mobile";

      footer.style.display = "";
      footer.innerHTML = buildBarHtml(resolvedVariant, activeId);
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
      if (!document.body.style.paddingBottom) {
        document.body.style.paddingBottom = (bar ? bar.offsetHeight : 80) + 20 + "px";
      }
    });
  }

  /* ─── Handle bfcache (back/forward) ─── */
  window.addEventListener("pageshow", function (e) {
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
  });

  /* ─── Public API ─── */
  window.Footer = {
    mount: mount,
    updateActive: function (newActiveId) {
      newActiveId = newActiveId || "";
      // Collect all items from both lists
      var allItems = mobileItems.concat(tabletItems);
      var links = document.querySelectorAll(".fixed.bottom-0 a[href]");
      if (links.length === 0) return;

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
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  /* ─── Resize handler ─── */
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(mount, 200);
  });
})(window);
